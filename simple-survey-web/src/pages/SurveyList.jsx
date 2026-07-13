import { useCallback, useEffect, useState } from 'react';
import api from '../utils/api';
import { xmlToJson } from '../utils/xmlParser';
import Stepper from '../components/SurveyForm/Stepper';
import { fetchAuthSession } from 'aws-amplify/auth';

const getSubmissionErrorMessage = async (error) => {
  const fallback = 'Failed to submit your response. Please check your connection and try again.';
  const responseBody = error.response?.data;

  if (!responseBody) {
    return error.code === 'ECONNABORTED'
      ? 'Submission timed out. Please confirm the API is running, then try again.'
      : fallback;
  }

  try {
    const parsed = await xmlToJson(responseBody);
    return parsed?.message || fallback;
  } catch {
    return fallback;
  }
};

export default function SurveyList() {
  const [surveys, setSurveys] = useState([]);
  const [selectedSurvey, setSelectedSurvey] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('survey_active')) || null;
    } catch {
      return null;
    }
  });
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [submitStatus, setSubmitStatus] = useState('idle'); // 'idle', 'success', 'error'
  const [submitMessage, setSubmitMessage] = useState('');

  const fetchActiveSurveys = useCallback(async () => {
    try {
      const res = await api.get('/surveys');
      const data = await xmlToJson(res.data);
      if (data && data.survey) {
        setSurveys(Array.isArray(data.survey) ? data.survey : [data.survey]);
      }
    } catch (err) {
      console.error('Error fetching surveys:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActiveSurveys();
    
    // Check if the user is authenticated to determine if they can submit
    fetchAuthSession().then(session => {
      setIsLoggedIn(!!session.tokens?.accessToken);
    }).catch(() => {
      setIsLoggedIn(false);
    });
  }, [fetchActiveSurveys]);

  // Synchronize selectedSurvey with sessionStorage
  useEffect(() => {
    if (selectedSurvey) {
      sessionStorage.setItem('survey_active', JSON.stringify(selectedSurvey));
      
      // Auto-fetch questions if they are missing (e.g., after a page reload or login redirect)
      if (questions.length === 0) {
        setLoading(true);
        api.get(`/surveys/${selectedSurvey.id}/questions`)
          .then(async res => {
            const data = await xmlToJson(res.data);
            if (data && data.question) {
              setQuestions(Array.isArray(data.question) ? data.question : [data.question]);
            }
          })
          .catch(err => console.error('Error fetching questions for restored survey:', err))
          .finally(() => setLoading(false));
      }
    } else {
      sessionStorage.removeItem('survey_active');
      sessionStorage.removeItem('survey_answers');
      sessionStorage.removeItem('survey_step');
    }
  }, [selectedSurvey]);

  const handleSelectSurvey = async (survey) => {
    // Clear out any old draft answers from a previous survey when explicitly starting a new one
    sessionStorage.removeItem('survey_answers');
    sessionStorage.removeItem('survey_step');
    
    setLoading(true);
    setSubmitStatus('idle');
    setSubmitMessage('');
    try {
      const res = await api.get(`/surveys/${survey.id}/questions`);
      const data = await xmlToJson(res.data);
      if (data && data.question) {
        const qList = Array.isArray(data.question) ? data.question : [data.question];
        setQuestions(qList);
        setSelectedSurvey(survey);
      } else {
        setSubmitStatus('error');
        setSubmitMessage('This survey has no questions configured yet.');
        setSelectedSurvey(survey);
      }
    } catch (err) {
      console.error('Error fetching questions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (formAnswers) => {
    setSubmitting(true);
    try {
      const formData = new FormData();
      
      questions.forEach((q) => {
        const val = formAnswers[q.id];
        if (!val) return;
        const fieldId = q.id?.toString();

        if (q.type === 'file') {
          Array.from(val).forEach((file) => {
            formData.append('certificates', file);
          });
        } else if (Array.isArray(val)) {
          const joined = val.join(',');
          formData.append(q.name, joined);
          if (fieldId) formData.append(fieldId, joined);
        } else {
          formData.append(q.name, val);
          if (fieldId) formData.append(fieldId, val);
        }
      });

      await api.post(`/surveys/${selectedSurvey.id}/responses`, formData);
      setSubmitStatus('success');
      setSubmitMessage('Your response has been recorded successfully! Thank you for participating.');
    } catch (err) {
      console.error('Submission failure:', err);
      setSubmitStatus('error');
      setSubmitMessage(await getSubmissionErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="spinner">Processing request...</div>;

  return (
    <div className="page-wrapper">
      {!selectedSurvey ? (
        <>
          <section className="hero-section">
            <div className="hero-copy">
              <p className="eyebrow">Available Surveys</p>
              <h2>Open Deployments & Screenings</h2>
              <p className="hero-description">
                Discover the latest surveys ready for participant responses. All active opportunities are listed here so you can begin quickly and securely.
              </p>
            </div>
          </section>

          <div className="survey-grid">
            {surveys.length === 0 ? <p>No surveys available.</p> : surveys.map(s => (
              <div key={s.id} className="survey-card">
                <div>
                  <h3>{s.name}</h3>
                  <p>{s.description}</p>
                </div>
                <button onClick={() => handleSelectSurvey(s)} className="btn-primary">Start Survey</button>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="active-form-wrapper">
          <button onClick={() => { setSelectedSurvey(null); setSubmitStatus('idle'); }} className="btn-link">← Return to Surveys</button>
          
          {submitStatus === 'success' ? (
            <div className="review-container" style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
              <h2>Submission Successful!</h2>
              <p style={{ marginBottom: '24px' }}>{submitMessage}</p>
              <button onClick={() => { setSelectedSurvey(null); setSubmitStatus('idle'); }} className="btn-primary">
                Back to Home
              </button>
            </div>
          ) : submitStatus === 'error' && questions.length === 0 ? (
            <div className="review-container" style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
              <h2>Configuration Error</h2>
              <p style={{ marginBottom: '24px' }}>{submitMessage}</p>
              <button onClick={() => { setSelectedSurvey(null); setSubmitStatus('idle'); }} className="btn-primary">
                Back to Home
              </button>
            </div>
          ) : (
            <>
              <h2>{selectedSurvey.name}</h2>
              
              {!isLoggedIn && (
                <div className="status-banner" style={{ marginBottom: '20px' }}>
                  <strong>Notice:</strong> You are currently viewing as a guest. Please log in to submit your response.
                </div>
              )}

              {submitStatus === 'error' && (
                <div className="error-banner" style={{ marginBottom: '20px' }}>
                  {submitMessage}
                </div>
              )}

              <Stepper 
                questions={questions} 
                submitting={submitting}
                onSubmit={isLoggedIn ? handleFormSubmit : () => {
                  setSubmitStatus('error');
                  setSubmitMessage('You must be logged in to submit this survey.');
                }} 
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
