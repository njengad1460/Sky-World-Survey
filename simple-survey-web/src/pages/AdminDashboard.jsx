// simple-survey-web/src/pages/AdminDashboard.jsx
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { escapeXml, xmlToJson, jsonToXml } from '../utils/xmlParser';

const emptyQuestionForm = {
  id: null,
  name: '',
  text: '',
  description: '',
  type: 'short_text',
  required: 'yes',
  multiple: 'no',
  optionsText: '',
  fileFormat: '.pdf',
  maxFileSize: '1',
  maxFileSizeUnit: 'mb'
};

const buildQuestionXml = (question) => {
  const optionLines = question.optionsText
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  let xml = `<question name="${escapeXml(question.name)}" type="${escapeXml(question.type)}" required="${question.required}">`;
  xml += `<text>${escapeXml(question.text)}</text>`;
  xml += `<description>${escapeXml(question.description)}</description>`;

  if (question.type === 'choice') {
    xml += `<options multiple="${question.multiple}">`;
    optionLines.forEach((line) => {
      const [rawValue, ...labelParts] = line.split('|');
      const value = rawValue.trim();
      const label = (labelParts.join('|').trim() || value);
      xml += `<option value="${escapeXml(value)}">${escapeXml(label)}</option>`;
    });
    xml += '</options>';
  }

  if (question.type === 'file') {
    xml += `<file_properties format="${escapeXml(question.fileFormat || '.pdf')}" max_file_size="${escapeXml(question.maxFileSize || '1')}" max_file_size_unit="${escapeXml(question.maxFileSizeUnit || 'mb')}" multiple="yes"/>`;
  }

  xml += '</question>';
  return xml;
};

const questionToForm = (question) => {
  const options = question.options?.option
    ? (Array.isArray(question.options.option) ? question.options.option : [question.options.option])
    : [];

  return {
    id: question.id,
    name: question.name || '',
    text: question.text || '',
    description: question.description || '',
    type: question.type || 'short_text',
    required: question.required || 'yes',
    multiple: question.options?.multiple || 'no',
    optionsText: options.map(option => `${option.value || option._ || option}|${option._ || option}`).join('\n'),
    fileFormat: question.file_properties?.format || '.pdf',
    maxFileSize: question.file_properties?.max_file_size || '1',
    maxFileSizeUnit: question.file_properties?.max_file_size_unit || 'mb'
  };
};

export default function AdminDashboard() {
  const [surveys, setSurveys] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [editingSurveyId, setEditingSurveyId] = useState(null);
  const [selectedSurvey, setSelectedSurvey] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [questionForm, setQuestionForm] = useState(emptyQuestionForm);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const loadSurveys = useCallback(async () => {
    try {
      const res = await api.get('/surveys');
      const data = await xmlToJson(res.data);
      if (data && data.survey) {
        const nextSurveys = Array.isArray(data.survey) ? data.survey : [data.survey];
        setSurveys(nextSurveys);
      } else {
        setSurveys([]);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    loadSurveys();
  }, [loadSurveys]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      // Build raw operational structural XML body layout matching contract
      const xmlPayload = jsonToXml('survey', { name, description });
      if (editingSurveyId) {
        await api.put(`/surveys/${editingSurveyId}`, xmlPayload);
        setMessage('Survey updated successfully.');
      } else {
        await api.post('/surveys', xmlPayload);
        setMessage('Survey created successfully.');
      }
      setName('');
      setDescription('');
      setEditingSurveyId(null);
      loadSurveys();
    } catch (err) {
      console.error(err);
      setMessage('Survey save failed. Check your API/auth settings.');
    }
  };

  const handleEditSurvey = (survey) => {
    setEditingSurveyId(survey.id);
    setName(survey.name || '');
    setDescription(survey.description || '');
  };

  const handleDeleteSurvey = async (surveyId) => {
    if (!window.confirm('Delete this survey and all related questions/responses?')) return;

    try {
      await api.delete(`/surveys/${surveyId}`);
      setMessage('Survey deleted successfully.');
      if (selectedSurvey?.id === surveyId) {
        setSelectedSurvey(null);
        setQuestions([]);
      }
      loadSurveys();
    } catch (err) {
      console.error(err);
      setMessage('Survey delete failed.');
    }
  };

  const loadQuestions = async (survey) => {
    try {
      const res = await api.get(`/surveys/${survey.id}/questions`);
      const data = await xmlToJson(res.data);
      setSelectedSurvey(survey);
      setQuestions(data?.question ? (Array.isArray(data.question) ? data.question : [data.question]) : []);
      setQuestionForm(emptyQuestionForm);
    } catch (err) {
      console.error(err);
      setMessage('Could not load questions.');
    }
  };

  const handleQuestionChange = (field, value) => {
    setQuestionForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveQuestion = async (event) => {
    event.preventDefault();
    if (!selectedSurvey || !questionForm.name.trim() || !questionForm.text.trim()) return;

    try {
      const xmlPayload = buildQuestionXml(questionForm);
      if (questionForm.id) {
        await api.put(`/surveys/${selectedSurvey.id}/questions/${questionForm.id}`, xmlPayload);
        setMessage('Question updated successfully.');
      } else {
        await api.post(`/surveys/${selectedSurvey.id}/questions`, xmlPayload);
        setMessage('Question added successfully.');
      }
      await loadQuestions(selectedSurvey);
    } catch (err) {
      console.error(err);
      setMessage('Question save failed.');
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!window.confirm('Delete this question?')) return;

    try {
      await api.delete(`/surveys/${selectedSurvey.id}/questions/${questionId}`);
      setMessage('Question deleted successfully.');
      await loadQuestions(selectedSurvey);
    } catch (err) {
      console.error(err);
      setMessage('Question delete failed.');
    }
  };

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div>
          <p className="eyebrow">Administrative Controls</p>
          <h2>Survey Management Center</h2>
          <p className="panel-description">Create surveys, manage questions, and review response details from one unified dashboard.</p>
        </div>
      </div>

      {message && <div className="status-banner">{message}</div>}

      <section className="admin-panel admin-summary">
        <div className="panel-header">
          <div>
            <h3>{editingSurveyId ? 'Edit Survey' : 'Deploy New Dynamic Survey Layout'}</h3>
            <p className="panel-description">Use this form to create a new survey or update an existing campaign. Surveys appear below once deployed.</p>
          </div>
        </div>

        <form onSubmit={handleCreate} className="creation-form">
          <input 
            type="text" 
            placeholder="Survey Name" 
            value={name} 
            onChange={e => setName(e.target.value)} 
            required 
          />
        <textarea 
          placeholder="Survey Description Mapping Meta" 
          value={description} 
          onChange={e => setDescription(e.target.value)}
        />
        <div className="inline-actions">
          <button type="submit" className="btn-success">{editingSurveyId ? 'Update Survey' : 'Deploy Template'}</button>
          {editingSurveyId && (
            <button type="button" className="btn-secondary" onClick={() => {
              setEditingSurveyId(null);
              setName('');
              setDescription('');
            }}>
              Cancel Edit
            </button>
          )}
        </div>
      </form>
      </section>

      <section className="admin-panel">
        <div className="panel-header">
          <div>
            <h3>Active Metrics Trackers</h3>
            <p className="panel-description">Review your current surveys, navigate directly to their questions, or inspect submitted responses.</p>
          </div>
        </div>
        <div className="management-table">
          <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Survey Title</th>
              <th>Operations</th>
            </tr>
          </thead>
          <tbody>
            {surveys.map(s => (
              <tr key={s.id}>
                <td>{s.id}</td>
                <td><strong>{s.name}</strong></td>
                <td className="operations-cell">
                  <div className="action-group">
                    <button
                      type="button"
                      onClick={() => loadQuestions(s)}
                      className="btn-secondary"
                    >
                      Manage Questions
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEditSurvey(s)}
                      className="btn-secondary"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSurvey(s.id)}
                      className="btn-danger"
                    >
                      Delete
                    </button>
                    <button 
                      type="button"
                      onClick={() => navigate(`/admin/responses/${s.id}`)} 
                      className="btn-primary"
                    >
                      View Responses
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </section>

      {selectedSurvey && (
        <div className="question-manager">
          <h3>Question Management: {selectedSurvey.name}</h3>
          <form onSubmit={handleSaveQuestion} className="creation-form">
            <div className="form-grid">
              <input
                type="text"
                placeholder="Question field name, e.g. full_name"
                value={questionForm.name}
                onChange={event => handleQuestionChange('name', event.target.value)}
                required
              />
              <select value={questionForm.type} onChange={event => handleQuestionChange('type', event.target.value)}>
                <option value="short_text">Short Text</option>
                <option value="long_text">Long Text</option>
                <option value="email">Email</option>
                <option value="choice">Choice</option>
                <option value="file">File Upload</option>
              </select>
              <select value={questionForm.required} onChange={event => handleQuestionChange('required', event.target.value)}>
                <option value="yes">Required</option>
                <option value="no">Optional</option>
              </select>
            </div>
            <input
              type="text"
              placeholder="Question text"
              value={questionForm.text}
              onChange={event => handleQuestionChange('text', event.target.value)}
              required
            />
            <textarea
              placeholder="Question description"
              value={questionForm.description}
              onChange={event => handleQuestionChange('description', event.target.value)}
            />

            {questionForm.type === 'choice' && (
              <>
                <select value={questionForm.multiple} onChange={event => handleQuestionChange('multiple', event.target.value)}>
                  <option value="no">Single choice</option>
                  <option value="yes">Multiple choice</option>
                </select>
                <textarea
                  placeholder={'Options, one per line: VALUE|Display label\nREACT|React JS\nSQL|SQL'}
                  value={questionForm.optionsText}
                  onChange={event => handleQuestionChange('optionsText', event.target.value)}
                />
              </>
            )}

            {questionForm.type === 'file' && (
              <div className="form-grid">
                <input value={questionForm.fileFormat} onChange={event => handleQuestionChange('fileFormat', event.target.value)} />
                <input type="number" min="1" value={questionForm.maxFileSize} onChange={event => handleQuestionChange('maxFileSize', event.target.value)} />
                <select value={questionForm.maxFileSizeUnit} onChange={event => handleQuestionChange('maxFileSizeUnit', event.target.value)}>
                  <option value="mb">MB</option>
                </select>
              </div>
            )}

            <div className="inline-actions">
              <button type="submit" className="btn-success">{questionForm.id ? 'Update Question' : 'Add Question'}</button>
              {questionForm.id && (
                <button type="button" className="btn-secondary" onClick={() => setQuestionForm(emptyQuestionForm)}>
                  Cancel Edit
                </button>
              )}
            </div>
          </form>

          <div className="management-table">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Required</th>
                  <th>Operations</th>
                </tr>
              </thead>
              <tbody>
                {questions.map(question => (
                  <tr key={question.id}>
                    <td>{question.id}</td>
                    <td>{question.name}</td>
                    <td>{question.type}</td>
                    <td>{question.required}</td>
                    <td className="operations-cell">
                      <div className="action-group">
                        <button type="button" className="btn-secondary" onClick={() => setQuestionForm(questionToForm(question))}>Edit</button>
                        <button type="button" className="btn-danger" onClick={() => handleDeleteQuestion(question.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {questions.length === 0 && (
                  <tr>
                    <td colSpan="5">No questions configured yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
