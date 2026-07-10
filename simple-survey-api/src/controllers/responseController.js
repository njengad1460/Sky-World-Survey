// simple-survey-api/src/controllers/responseController.js
const db = require("../config/db");
const { s3Client } = require("../config/aws");
const { PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const jstoxml = require("jstoxml");

exports.submitResponse = async (req, res) => {
  try {
    const { surveyId } = req.params;
    const cognitoUserId = req.user?.id || "anonymous_candidate";
    
    // Fallback parser handling text fields out of structured multi-part formats
    const payload = req.body || {};
    const emailAddress = payload.email_address || "";
    const fullName = payload.full_name || "";
    const description = payload.description || "";
    const gender = payload.gender || "";
    const programmingStack = payload.programming_stack || "";

    // 1. Log response tracking row
    const [rResult] = await db.execute(
      "INSERT INTO responses (survey_id, cognito_user_id, email_address) VALUES (?, ?, ?)",
      [surveyId, cognitoUserId, emailAddress]
    );
    const responseId = rResult.insertId;

    // 2. Map standard text field answers to their question ids dynamically
    const textQuestions = [
      { name: 'full_name', value: fullName },
      { name: 'email_address', value: emailAddress },
      { name: 'description', value: description },
      { name: 'gender', value: gender },
      { name: 'programming_stack', value: programmingStack }
    ];

    for (const item of textQuestions) {
      const [qRows] = await db.execute(
        "SELECT id, question_type FROM questions WHERE survey_id = ? AND name = ?", 
        [surveyId, item.name]
      );
      if (qRows.length > 0) {
        const qId = qRows[0].id;
        
        if (qRows[0].question_type === 'choice') {
          const [ansResult] = await db.execute(
            "INSERT INTO answers (response_id, question_id) VALUES (?, ?)",
            [responseId, qId]
          );
          const answerId = ansResult.insertId;
          
          // Split stack list tokens (e.g. "REACT,VUE") to link values
          const selectedChoices = item.value.split(",").map(s => s.trim());
          for (const choiceVal of selectedChoices) {
            const [optRows] = await db.execute(
              "SELECT id FROM question_options WHERE question_id = ? AND option_value = ?",
              [qId, choiceVal]
            );
            if (optRows.length > 0) {
              await db.execute(
                "INSERT INTO answer_options (answer_id, option_id) VALUES (?, ?)",
                [responseId, optRows[0].id]
              );
            }
          }
        } else {
          // Standard structural fields mapping text properties directly
          await db.execute(
            "INSERT INTO answers (response_id, question_id, answer_text) VALUES (?, ?, ?)",
            [responseId, qId, item.value]
          );
        }
      }
    }

    // 3. Process certificates files via intercepted multi-part arrays
    const certificatesList = [];
    if (req.files && req.files.length > 0) {
      const [fileQ] = await db.execute(
        "SELECT id FROM questions WHERE survey_id = ? AND question_type = 'file' LIMIT 1",
        [surveyId]
      );
      
      if (fileQ.length > 0) {
        const fileQuestionId = fileQ[0].id;
        const [ansFileResult] = await db.execute(
          "INSERT INTO answers (response_id, question_id) VALUES (?, ?)",
          [responseId, fileQuestionId]
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

          await db.execute(
            "INSERT INTO certificates (answer_id, file_name, s3_key) VALUES (?, ?, ?)",
            [fileAnswerId, file.originalname, s3Key]
          );

          certificatesList.push({ certificate: file.originalname });
        }
      }
    }

    // Format structural mock return XML body to client engine interface
    const responsePayload = {
      question_response: {
        full_name: fullName,
        email_address: emailAddress,
        description: description,
        gender: gender,
        programming_stack: programmingStack,
        certificates: certificatesList,
        date_responded: new Date().toISOString().slice(0, 19).replace('T', ' ')
      }
    };

    return res.status(201).header("Content-Type", "application/xml").send(jstoxml.toXML(responsePayload, { header: true }));
  } catch (error) {
    return res.status(500).header("Content-Type", "application/xml").send(`<error><message>${error.message}</message></error>`);
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
        `SELECT q.name, q.question_type, a.id as answer_id, a.answer_text 
         FROM answers a 
         JOIN questions q ON a.question_id = q.id 
         WHERE a.response_id = ?`, [r.id]
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