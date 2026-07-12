const db = require("../config/db");
const { s3Client } = require("../config/aws");
const { PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const jstoxml = require("jstoxml");

const normalizeAnswerValues = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") return value.split(",").map(item => item.trim()).filter(Boolean);
  if (value === undefined || value === null) return [];
  return [String(value)];
};

const isPdfFile = (file) => {
  return file.mimetype === "application/pdf" || file.originalname.toLowerCase().endsWith(".pdf");
};

exports.submitResponse = async (req, res) => {
  let connection;
  try {
    const { surveyId } = req.params;
    const cognitoUserId = req.user.id;
    const payload = req.body || {};

    const [questions] = await db.execute(
      "SELECT id, name, question_type, is_required, max_file_size, max_file_size_unit FROM questions WHERE survey_id = ?",
      [surveyId]
    );

    if (questions.length === 0) {
      return res.status(404).header("Content-Type", "application/xml")
        .send("<error><message>No questions configured for this survey</message></error>");
    }

    const getPayloadValue = (question) => {
      if (payload[question.name] !== undefined) return payload[question.name];
      const idKey = String(question.id);
      if (payload[idKey] !== undefined) return payload[idKey];
      return undefined;
    };

    for (const question of questions) {
      const hasFiles = question.question_type === "file" && req.files?.length > 0;
      const value = getPayloadValue(question);
      const hasValue = value !== undefined && value !== "";

      if (question.is_required && !hasValue && !hasFiles) {
        return res.status(400).header("Content-Type", "application/xml")
          .send(`<error><message>${question.name} is required</message></error>`);
      }
    }

    if (req.files?.some(file => !isPdfFile(file))) {
      return res.status(400).header("Content-Type", "application/xml")
        .send("<error><message>Only PDF certificate uploads are supported</message></error>");
    }

    const fileQuestion = questions.find(q => q.question_type === "file");
    if (req.files?.length > 0 && fileQuestion?.max_file_size && fileQuestion.max_file_size_unit?.toLowerCase() === "mb") {
      const maxBytes = Number(fileQuestion.max_file_size) * 1024 * 1024;
      const oversizedFile = req.files.find(file => file.size > maxBytes);
      if (oversizedFile) {
        return res.status(400).header("Content-Type", "application/xml")
          .send(`<error><message>${oversizedFile.originalname} exceeds the configured file size limit</message></error>`);
      }
    }

    const emailQuestion = questions.find(q => q.question_type === "email") || questions.find(q => q.name === "email_address");
    const emailAddress = emailQuestion ? payload[emailQuestion.name] || "" : payload.email_address || req.user.email || "";

    connection = await db.getConnection();
    await connection.beginTransaction();

    const [rResult] = await connection.execute(
      "INSERT INTO responses (survey_id, cognito_user_id, email_address) VALUES (?, ?, ?)",
      [surveyId, cognitoUserId, emailAddress]
    );
    const responseId = rResult.insertId;
    const responsePayload = {
      response_id: responseId,
      email_address: emailAddress,
      certificates: [],
      date_responded: new Date().toISOString().slice(0, 19).replace("T", " ")
    };

    for (const question of questions) {
      if (question.question_type === "file") continue;

      const value = getPayloadValue(question);
      if (value === undefined || value === "") continue;

      if (question.question_type === "choice") {
        const selectedChoices = normalizeAnswerValues(value);
        const [ansResult] = await connection.execute(
          "INSERT INTO answers (response_id, question_id) VALUES (?, ?)",
          [responseId, question.id]
        );
        const answerId = ansResult.insertId;

        for (const choiceVal of selectedChoices) {
          const [optRows] = await connection.execute(
            "SELECT id FROM question_options WHERE question_id = ? AND option_value = ?",
            [question.id, choiceVal]
          );
          if (optRows.length > 0) {
            await connection.execute(
              "INSERT INTO answer_options (answer_id, option_id) VALUES (?, ?)",
              [answerId, optRows[0].id]
            );
          }
        }
        responsePayload[question.name] = selectedChoices.join(",");
      } else {
        await connection.execute(
          "INSERT INTO answers (response_id, question_id, answer_text) VALUES (?, ?, ?)",
          [responseId, question.id, value]
        );
        responsePayload[question.name] = value;
      }
    }

    if (req.files && req.files.length > 0) {
      if (fileQuestion) {
        const [ansFileResult] = await connection.execute(
          "INSERT INTO answers (response_id, question_id) VALUES (?, ?)",
          [responseId, fileQuestion.id]
        );
        const fileAnswerId = ansFileResult.insertId;

        for (const file of req.files) {
          const s3Key = `certificates/${Date.now()}_${file.originalname.replace(/\s+/g, '_')}`;
          
          await s3Client.send(new PutObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: s3Key,
            Body: file.buffer,
            ContentType: file.mimetype
          }));

          await connection.execute(
            "INSERT INTO certificates (answer_id, file_name, s3_key) VALUES (?, ?, ?)",
            [fileAnswerId, file.originalname, s3Key]
          );

          responsePayload.certificates.push({ certificate: file.originalname });
        }
      }
    }

    await connection.commit();

    return res.status(201).header("Content-Type", "application/xml")
      .send(jstoxml.toXML({ question_response: responsePayload }, { header: true }));
  } catch (error) {
    if (connection) await connection.rollback();
    return res.status(500).header("Content-Type", "application/xml").send(`<error><message>${error.message}</message></error>`);
  } finally {
    if (connection) connection.release();
  }
};

exports.getSurveyResponses = async (req, res) => {
  try {
    const { surveyId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const emailFilter = req.query.email || "";
    const offset = (page - 1) * pageSize;

    let countQuery = "SELECT COUNT(*) as total FROM responses WHERE survey_id = ?";
    let dataQuery = "SELECT id, email_address, date_responded FROM responses WHERE survey_id = ?";
    let params = [surveyId];

    if (emailFilter) {
      countQuery += " AND email_address LIKE ?";
      dataQuery += " AND email_address LIKE ?";
      params.push(`%${emailFilter}%`);
    }

    dataQuery += " ORDER BY date_responded DESC LIMIT ? OFFSET ?";
    
    const [countRows] = await db.execute(countQuery, emailFilter ? [surveyId, `%${emailFilter}%`] : [surveyId]);
    const totalCount = countRows[0].total;
    const lastPage = Math.ceil(totalCount / pageSize) || 1;

    // Execute paginated selection constraints
    const [respRows] = await db.execute(dataQuery, [...params, String(pageSize), String(offset)]);
    const xmlResponses = [];

    for (const r of respRows) {
      const [ansRows] = await db.query(
        `SELECT q.name, q.question_type, a.id as answer_id, a.answer_text,
          GROUP_CONCAT(qo.option_value ORDER BY qo.id SEPARATOR ',') AS selected_options
         FROM answers a 
         JOIN questions q ON a.question_id = q.id 
         LEFT JOIN answer_options ao ON ao.answer_id = a.id
         LEFT JOIN question_options qo ON qo.id = ao.option_id
         WHERE a.response_id = ?
         GROUP BY q.name, q.question_type, a.id, a.answer_text`, [r.id]
      );

      const responseNode = {
        response_id: r.id,
        email_address: r.email_address,
        date_responded: r.date_responded.toISOString().slice(0, 19).replace('T', ' ')
      };

      let certsNode = [];

      for (const ans of ansRows) {
        if (ans.question_type === 'file') {
          const [certs] = await db.execute("SELECT id, file_name FROM certificates WHERE answer_id = ?", [ans.answer_id]);
          certsNode = certs.map(c => ({
            _name: 'certificate',
            _attrs: { id: c.id },
            _content: c.file_name
          }));
        } else if (ans.question_type === "choice") {
          responseNode[ans.name] = ans.selected_options || "";
        } else if (ans.name) {
          responseNode[ans.name] = ans.answer_text || "";
        }
      }

      responseNode.certificates = certsNode;
      xmlResponses.push({ _name: 'question_response', _content: responseNode });
    }

    const wrapperNode = {
      _name: 'question_responses',
      _attrs: {
        current_page: page,
        last_page: lastPage,
        page_size: pageSize,
        total_count: totalCount
      },
      _content: xmlResponses
    };

    return res.status(200).header("Content-Type", "application/xml").send(jstoxml.toXML(wrapperNode, { header: true }));
  } catch (error) {
    return res.status(500).header("Content-Type", "application/xml").send(`<error><message>${error.message}</message></error>`);
  }
};

exports.downloadCertificate = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.execute("SELECT file_name, s3_key FROM certificates WHERE id = ?", [id]);
    
    if (rows.length === 0) {
      return res.status(404).header("Content-Type", "application/xml").send("<error><message>Certificate reference not found</message></error>");
    }

    const certificate = rows[0];

    // Generate localized 15-minute secure transient presigned download URL
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: certificate.s3_key,
      ResponseContentDisposition: `attachment; filename="${certificate.file_name}"`
    });

    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });
    
    // Redirect direct browser requests straight out to secure AWS S3 down-streams
    return res.redirect(presignedUrl);
  } catch (error) {
    return res.status(500).header("Content-Type", "application/xml").send(`<error><message>${error.message}</message></error>`);
  }
};
