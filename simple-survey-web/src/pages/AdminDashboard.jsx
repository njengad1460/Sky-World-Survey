// simple-survey-web/src/pages/AdminDashboard.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { xmlToJson, jsonToXml } from '../utils/xmlParser';

export default function AdminDashboard() {
  const [surveys, setSurveys] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadSurveys();
  }, []);

  const loadSurveys = async () => {
    try {
      const res = await api.get('/surveys');
      const data = await xmlToJson(res.data);
      if (data && data.survey) {
        setSurveys(Array.isArray(data.survey) ? data.survey : [data.survey]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      // Build raw operational structural XML body layout matching contract
      const xmlPayload = jsonToXml('survey', { name, description });
      await api.post('/surveys', xmlPayload);
      setName('');
      setDescription('');
      loadSurveys();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="admin-container">
      <h2>Administrative Controls</h2>
      <form onSubmit={handleCreate} className="creation-form">
        <h3>Deploy New Dynamic Survey Layout</h3>
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
        <button type="submit" className="btn-success">Deploy Template</button>
      </form>

      <div className="management-table">
        <h3>Active Metrics Trackers</h3>
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
                <td>
                  <button 
                    onClick={() => navigate(`/admin/responses/${s.id}`)} 
                    className="btn-primary"
                  >
                    View Responses
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}