import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { xmlToJson } from '../utils/xmlParser';
import { fetchAuthSession } from 'aws-amplify/auth';

export default function ResponseViewer() {
  const { surveyId } = useParams();
  const navigate = useNavigate();
  const [responses, setResponses] = useState([]);
  const [emailFilter, setEmailFilter] = useState('');
  const [page, setPage] = useState(1);
  const [paginationInfo, setPaginationInfo] = useState({ last_page: 1, total_count: 0 });

  const fetchResponses = useCallback(async () => {
    try {
      const res = await api.get(`/surveys/${surveyId}/responses`, {
        params: { page, pageSize: 10, email: emailFilter }
      });
      const data = await xmlToJson(res.data);
      
      if (data) {
        setPaginationInfo({
          last_page: parseInt(data.last_page) || 1,
          total_count: parseInt(data.total_count) || 0
        });

        if (data.question_response) {
          setResponses(Array.isArray(data.question_response) ? data.question_response : [data.question_response]);
        } else {
          setResponses([]);
        }
      }
    } catch (err) {
      console.error(err);
    }
  }, [surveyId, page, emailFilter]);

  useEffect(() => {
    fetchResponses();
  }, [fetchResponses]);

  const handleDownload = async (certId) => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.accessToken?.toString();
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
      window.open(`${apiBase}/certificates/${certId}?token=${token}`, '_blank');
    } catch (err) {
      console.error('Failed to get auth token for download:', err);
      alert('Authentication error. Please log in again.');
    }
  };

  return (
    <div className="viewer-container">
      <button onClick={() => navigate('/admin')} className="btn-link">← Return Dashboard</button>
      <h2>Metrics Response Analysis (Survey ID: {surveyId})</h2>

      <div className="filter-bar">
        <input 
          type="text" 
          placeholder="Filter by target email address..." 
          value={emailFilter}
          onChange={(e) => { setEmailFilter(e.target.value); setPage(1); }}
        />
      </div>

      <div className="responses-table-wrapper">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Applicant Email</th>
              <th>Full Name</th>
              <th>Programming Stack</th>
              <th>Certificates Array</th>
              <th>Submission Frame</th>
            </tr>
          </thead>
          <tbody>
            {responses.map((r, i) => (
              <tr key={i}>
                <td>{r.response_id}</td>
                <td>{r.email_address}</td>
                <td>{r.full_name || 'N/A'}</td>
                <td>{r.programming_stack || 'N/A'}</td>
                <td>
                  {r.certificates?.certificate ? (
                    (Array.isArray(r.certificates.certificate) ? r.certificates.certificate : [r.certificates.certificate]).map((c, idx) => (
                      <button 
                        key={idx} 
                        onClick={() => handleDownload(c.id)} 
                        className="btn-download"
                      >
                        📄 {c._ || c}
                      </button>
                    ))
                  ) : 'No files'}
                </td>
                <td>{r.date_responded}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pagination-controls">
        <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</button>
        <span>Page {page} of {paginationInfo.last_page} ({paginationInfo.total_count} records)</span>
        <button disabled={page >= paginationInfo.last_page} onClick={() => setPage(p => p + 1)}>Next</button>
      </div>
    </div>
  );
}