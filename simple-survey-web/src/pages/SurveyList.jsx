import { useCallback, useEffect, useState } from 'react';
import api from '../utils/api';
import { xmlToJson } from '../utils/xmlParser';
import Stepper from '../components/SurveyForm/Stepper';

export default function SurveyList() {
  const [surveys, setSurveys] = useState([]);
  const [selectedSurvey, setSelectedSurvey] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

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
  }, [fetchActiveSurveys]);

  const handleSelectSurvey = async (survey) => {
    setLoading(true);
    try {
      const res = await api.get(`/surveys/${survey.id}/questions`);
      const data = await xmlToJson(res.data);
      if (data && data.question) {
        const qList = Array.isArray(data.question) ? data.question : [data.question];
        setQuestions(qList);
        setSelectedSurvey(survey);
      } else {
        alert('This survey has no questions configured yet.');
      }
    } catch (err) {
      console.error('Error fetching questions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (formAnswers) => {
    setLoading(true);
    try {
      const formData = new FormData();
      
      // Match question metadata identifiers to reconstruct explicit schema expectations
      questions.forEach((q) => {
        const val = formAnswers[q.id];
        if (!val) return;

        if (q.type === 'file') {
          // Flatten file streams directly into payload array structures
          Array.from(val).forEach((file) => {
            formData.append('certificates', file);
          });
        } else if (Array.isArray(val)) {
          formData.append(q.name, val.join(','));
        } else {
          formData.append(q.name, val);
        }
      });

      await api.post(`/surveys/${selectedSurvey.id}/responses`, formData);
      alert('Survey response submitted successfully!');
      setSelectedSurvey(null);
      setQuestions([]);
    } catch (err) {
      console.error('Submission failure:', err);
      alert('Failed to transmit application metrics.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="spinner">Loading database configurations...</div>;

  return (
    <div className="page-wrapper">
      {!selectedSurvey ? (
        <div className="survey-grid">
          <h2>Open Deployments & Screenings</h2>
          {surveys.length === 0 ? <p>No surveys available.</p> : surveys.map(s => (
            <div key={s.id} className="survey-card">
              <h3>{s.name}</h3>
              <p>{s.description}</p>
              <button onClick={() => handleSelectSurvey(s)} className="btn-primary">Start Survey</button>
            </div>
          ))}
        </div>
      ) : (
        <div className="active-form-wrapper">
          <button onClick={() => setSelectedSurvey(null)} className="btn-link">← Change Selection</button>
          <h2>{selectedSurvey.name}</h2>
          <Stepper questions={questions} onSubmit={handleFormSubmit} />
        </div>
      )}
    </div>
  );
}
