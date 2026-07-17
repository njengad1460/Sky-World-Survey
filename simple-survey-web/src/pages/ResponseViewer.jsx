import { useEffect, useState, useCallback, useMemo } from 'react';
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
      const token = session.tokens?.idToken?.toString();
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
      window.open(`${apiBase}/certificates/${certId}?token=${token}`, '_blank');
    } catch (err) {
      console.error('Failed to get auth token for download:', err);
      alert('Authentication error. Please log in again.');
    }
  };

  const columns = useMemo(() => {
    const defaultKeys = ['response_id', 'email_address', 'date_responded'];
    const keys = new Set(defaultKeys);
    responses.forEach((response) => {
      Object.keys(response).forEach((key) => keys.add(key));
    });
    return Array.from(keys);
  }, [responses]);

  const formatHeader = (key) => {
    if (key === 'response_id') return 'ID';
    if (key === 'email_address') return 'Applicant Email';
    if (key === 'date_responded') return 'Submitted At';
    return key.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const renderCell = (value) => {
    if (value === undefined || value === null || value === '') {
      return 'N/A';
    }

    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        return value.join(', ');
      }
      if (value.certificate) {
        const certificates = Array.isArray(value.certificate) ? value.certificate : [value.certificate];
        return certificates.map((cert, idx) => (
          <button
            key={idx}
            type="button"
            className="btn-download"
            onClick={() => handleDownload(cert.id)}
          >
            📄 {cert._ || cert}
          </button>
        ));
      }
      return JSON.stringify(value);
    }

    return String(value);
  };

  const hasResponses = responses.length > 0;

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
        {hasResponses ? (
          <table>
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column}>{formatHeader(column)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {responses.map((response, rowIndex) => (
                <tr key={rowIndex}>
                  {columns.map((column) => (
                    <td key={column}>{renderCell(response[column])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">
            <p>No responses matched your filter yet. Try a different email or return later once submissions arrive.</p>
          </div>
        )}
      </div>

      <div className="pagination-controls response-pagination">
        <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</button>
        <span>Page {page} of {paginationInfo.last_page} · {paginationInfo.total_count} records</span>
        <button disabled={page >= paginationInfo.last_page} onClick={() => setPage(p => p + 1)}>Next</button>
      </div>
    </div>
  );
}