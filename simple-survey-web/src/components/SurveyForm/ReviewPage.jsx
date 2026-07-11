export default function ReviewPage({ questions, answers, onBack, onSubmit, submitting = false }) {
  const formatDisplayValue = (question, val) => {
    if (!val) return <span className="empty-text">No response</span>;
    if (question.type === 'file') {
      return <span>{val.length || 0} file(s) attached</span>;
    }
    if (Array.isArray(val)) return val.join(', ');
    return String(val);
  };

  return (
    <div className="review-container">
      <h2>Review Your Responses</h2>
      <p className="review-subtitle">Please verify your entries before submission.</p>

      <div className="review-list">
        {questions.map((q) => (
          <div key={q.id} className="review-item">
            <span className="review-q-text">{q.text}</span>
            <div className="review-a-text">{formatDisplayValue(q, answers[q.id])}</div>
          </div>
        ))}
      </div>

      <div className="stepper-actions">
        <button type="button" className="btn-secondary" onClick={onBack} disabled={submitting}>Back</button>
        <button type="button" className="btn-success" onClick={onSubmit} disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit Survey'}
        </button>
      </div>
    </div>
  );
}
