const db = require("../config/db");
const jstoxml = require("jstoxml");

const getQuestionAttributes = (questionData) => {
  const attributes = questionData.$ || {};
  const rawType = attributes.type;
  let dbType = rawType || "short_text";

  if (!["short_text", "long_text", "email", "choice", "file"].includes(dbType)) {
    dbType = "short_text";
  }

  return {
    name: attributes.name,
    dbType,
    isRequired: attributes.required === "yes" ? 1 : 0,
    isMultipleChoice: dbType === "choice" && questionData.options?.$?.multiple === "yes" ? 1 : 0,
    text: questionData.text,
    description: questionData.description || ""
  };
};

const getFileProperties = (questionData, dbType) => {
  if (dbType !== "file" || !questionData.file_properties) {
    return { maxFileSize: null, maxFileSizeUnit: null, fileFormat: null };
  }

  const fileProps = questionData.file_properties.$ || {};
  return {
    maxFileSize: fileProps.max_file_size || null,
    maxFileSizeUnit: fileProps.max_file_size_unit || null,
    fileFormat: fileProps.format || null
  };
};

const saveQuestionOptions = async (questionId, questionData) => {
  if (!questionData.options?.option) return;

  const optionsList = Array.isArray(questionData.options.option)
    ? questionData.options.option
    : [questionData.options.option];

  for (const opt of optionsList) {
    const val = opt.$?.value || opt._ || opt;
    const txt = opt._ || opt;
    await db.execute(
      "INSERT INTO question_options (question_id, option_value, option_text) VALUES (?, ?, ?)",
      [questionId, val, txt]
    );
  }
};

exports.createSurvey = async (req, res) => {
  try {
    // express-xml-bodyparser exposes parsed XML under req.body
    const surveyData = req.body.survey;
    if (!surveyData) {
      return res.status(400).header("Content-Type", "application/xml")
        .send("<error><message>Invalid XML payload structure</message></error>");
    }

    const name = surveyData.name;
    const description = surveyData.description || "";

    const [result] = await db.execute(
      "INSERT INTO surveys (name, description) VALUES (?, ?)",
      [name, description]
    );

    const responseXML = jstoxml.toXML({
      survey: {
        id: result.insertId,
        name: name,
        description: description
      }
    }, { header: true });

    return res.status(201).header("Content-Type", "application/xml").send(responseXML);
  } catch (error) {
    return res.status(500).header("Content-Type", "application/xml")
      .send(`<error><message>${error.message}</message></error>`);
  }
};

exports.getSurveys = async (req, res) => {
  try {
    const [rows] = await db.execute("SELECT id, name, description FROM surveys");
    
    const targetSurveys = rows.map(row => ({
      _name: 'survey',
      _attrs: { id: row.id },
      _content: {
        name: row.name,
        description: row.description
      }
    }));

    const responseXML = jstoxml.toXML({ surveys: targetSurveys }, { header: true });
    return res.status(200).header("Content-Type", "application/xml").send(responseXML);
  } catch (error) {
    return res.status(500).header("Content-Type", "application/xml")
      .send(`<error><message>${error.message}</message></error>`);
  }
};

exports.updateSurvey = async (req, res) => {
  try {
    const { surveyId } = req.params;
    const surveyData = req.body.survey;

    if (!surveyData || !surveyData.name) {
      return res.status(400).header("Content-Type", "application/xml")
        .send("<error><message>Invalid XML payload structure</message></error>");
    }

    const [result] = await db.execute(
      "UPDATE surveys SET name = ?, description = ? WHERE id = ?",
      [surveyData.name, surveyData.description || "", surveyId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).header("Content-Type", "application/xml")
        .send("<error><message>Survey not found</message></error>");
    }

    return res.status(200).header("Content-Type", "application/xml")
      .send(`<success><message>Survey updated successfully</message><id>${surveyId}</id></success>`);
  } catch (error) {
    return res.status(500).header("Content-Type", "application/xml")
      .send(`<error><message>${error.message}</message></error>`);
  }
};

exports.deleteSurvey = async (req, res) => {
  try {
    const { surveyId } = req.params;
    const [result] = await db.execute("DELETE FROM surveys WHERE id = ?", [surveyId]);

    if (result.affectedRows === 0) {
      return res.status(404).header("Content-Type", "application/xml")
        .send("<error><message>Survey not found</message></error>");
    }

    return res.status(200).header("Content-Type", "application/xml")
      .send(`<success><message>Survey deleted successfully</message><id>${surveyId}</id></success>`);
  } catch (error) {
    return res.status(500).header("Content-Type", "application/xml")
      .send(`<error><message>${error.message}</message></error>`);
  }
};

exports.createQuestion = async (req, res) => {
  try {
    const { surveyId } = req.params;
    const questionData = req.body.question;
    
    if (!questionData) {
      return res.status(400).header("Content-Type", "application/xml")
        .send("<error><message>Invalid question metadata structure</message></error>");
    }

    const { name, dbType, isRequired, isMultipleChoice, text, description } = getQuestionAttributes(questionData);

    if (!name || !text) {
      return res.status(400).header("Content-Type", "application/xml")
        .send("<error><message>Question name and text are required</message></error>");
    }

    const { maxFileSize, maxFileSizeUnit, fileFormat } = getFileProperties(questionData, dbType);

    const [qResult] = await db.execute(
      `INSERT INTO questions (survey_id, name, question_type, question_text, description, is_required, is_multiple_choice, max_file_size, max_file_size_unit, file_format) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [surveyId, name, dbType, text, description, isRequired, isMultipleChoice, maxFileSize, maxFileSizeUnit, fileFormat]
    );

    const questionId = qResult.insertId;

    await saveQuestionOptions(questionId, questionData);

    return res.status(201).header("Content-Type", "application/xml")
      .send(`<success><message>Question built successfully</message><id>${questionId}</id></success>`);
  } catch (error) {
    return res.status(500).header("Content-Type", "application/xml")
      .send(`<error><message>${error.message}</message></error>`);
  }
};

exports.updateQuestion = async (req, res) => {
  try {
    const { surveyId, questionId } = req.params;
    const questionData = req.body.question;

    if (!questionData) {
      return res.status(400).header("Content-Type", "application/xml")
        .send("<error><message>Invalid question metadata structure</message></error>");
    }

    const { name, dbType, isRequired, isMultipleChoice, text, description } = getQuestionAttributes(questionData);

    if (!name || !text) {
      return res.status(400).header("Content-Type", "application/xml")
        .send("<error><message>Question name and text are required</message></error>");
    }

    const { maxFileSize, maxFileSizeUnit, fileFormat } = getFileProperties(questionData, dbType);

    const [result] = await db.execute(
      `UPDATE questions
       SET name = ?, question_type = ?, question_text = ?, description = ?, is_required = ?, is_multiple_choice = ?, max_file_size = ?, max_file_size_unit = ?, file_format = ?
       WHERE id = ? AND survey_id = ?`,
      [name, dbType, text, description, isRequired, isMultipleChoice, maxFileSize, maxFileSizeUnit, fileFormat, questionId, surveyId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).header("Content-Type", "application/xml")
        .send("<error><message>Question not found</message></error>");
    }

    await db.execute("DELETE FROM question_options WHERE question_id = ?", [questionId]);
    await saveQuestionOptions(questionId, questionData);

    return res.status(200).header("Content-Type", "application/xml")
      .send(`<success><message>Question updated successfully</message><id>${questionId}</id></success>`);
  } catch (error) {
    return res.status(500).header("Content-Type", "application/xml")
      .send(`<error><message>${error.message}</message></error>`);
  }
};

exports.deleteQuestion = async (req, res) => {
  try {
    const { surveyId, questionId } = req.params;
    const [result] = await db.execute(
      "DELETE FROM questions WHERE id = ? AND survey_id = ?",
      [questionId, surveyId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).header("Content-Type", "application/xml")
        .send("<error><message>Question not found</message></error>");
    }

    return res.status(200).header("Content-Type", "application/xml")
      .send(`<success><message>Question deleted successfully</message><id>${questionId}</id></success>`);
  } catch (error) {
    return res.status(500).header("Content-Type", "application/xml")
      .send(`<error><message>${error.message}</message></error>`);
  }
};

exports.getSurveyQuestions = async (req, res) => {
  try {
    const { surveyId } = req.params;
    const [questions] = await db.execute("SELECT * FROM questions WHERE survey_id = ?", [surveyId]);

    const formattedQuestions = [];

    for (const q of questions) {
      let typeAttribute = q.question_type;
      if (q.question_type === 'choice') typeAttribute = 'choice';

      const questionNode = {
        _name: 'question',
        _attrs: {
          id: q.id,
          name: q.name,
          type: typeAttribute,
          required: q.is_required ? 'yes' : 'no'
        },
        _content: [
          { text: q.question_text },
          { description: q.description || "" }
        ]
      };

      if (q.question_type === 'choice') {
        const [options] = await db.execute("SELECT option_value, option_text FROM question_options WHERE question_id = ?", [q.id]);
        questionNode._content.push({
          _name: 'options',
          _attrs: { multiple: q.is_multiple_choice ? 'yes' : 'no' },
          _content: options.map(o => ({
            _name: 'option',
            _attrs: { value: o.option_value },
            _content: o.option_text
          }))
        });
      }

      if (q.question_type === 'file') {
        questionNode._content.push({
          _name: 'file_properties',
          _attrs: {
            format: q.file_format || ".pdf",
            max_file_size: q.max_file_size || "1",
            max_file_size_unit: q.max_file_size_unit || "mb",
            multiple: "yes"
          }
        });
      }

      formattedQuestions.push(questionNode);
    }

    const responseXML = jstoxml.toXML({ questions: formattedQuestions }, { header: true });
    return res.status(200).header("Content-Type", "application/xml").send(responseXML);
  } catch (error) {
    return res.status(500).header("Content-Type", "application/xml")
      .send(`<error><message>${error.message}</message></error>`);
  }
};
