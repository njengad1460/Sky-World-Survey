import { useState } from 'react';
import StepField from './StepField';
import ReviewPage from './ReviewPage';

export default function Stepper({ questions, onSubmit, submitting = false }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [error, setError] = useState('');

  const safeQuestions = Array.isArray(questions) ? questions : [];
  const hasQuestions = safeQuestions.length > 0;
  const boundedIndex = Math.min(currentIndex, Math.max(safeQuestions.length - 1, 0));
  const currentQuestion = safeQuestions[boundedIndex];
  const isReviewStep = hasQuestions && currentIndex >= safeQuestions.length;

  const handleValueChange = (value) => {
    if (!currentQuestion) return;
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: value }));
  };

  const handleNext = () => {
    if (!currentQuestion) {
      setError('This survey has no questions configured.');
      return;
    }

    const currentAns = answers[currentQuestion.id];
    
    // Validation constraint check
    if (currentQuestion.required === 'yes') {
      if (!currentAns || (Array.isArray(currentAns) && currentAns.length === 0) || (currentAns instanceof FileList && currentAns.length === 0)) {
        setError('This field is required before advancing.');
        return;
      }
    }
    setError('');
    setCurrentIndex(prev => prev + 1);
  };

  const handlePrevious = () => {
    setError('');
    setCurrentIndex(prev => Math.max(prev - 1, 0));
  };

  if (!hasQuestions) {
    return (
      <div className="review-container">
        <h2>No Questions Available</h2>
        <p>This survey does not have any questions configured yet.</p>
      </div>
    );
  }

  return (
    <div className="stepper-wizard">
      {error && <div className="error-banner">{error}</div>}

      {!isReviewStep ? (
        <>
          <StepField 
            question={currentQuestion} 
            value={answers[currentQuestion.id]} 
            onChange={handleValueChange} 
          />
          <div className="stepper-actions">
            {currentIndex > 0 && (
              <button type="button" className="btn-secondary" onClick={handlePrevious}>Previous</button>
            )}
            <button type="button" className="btn-primary" onClick={handleNext}>Next</button>
          </div>
        </>
      ) : (
        <ReviewPage 
          questions={safeQuestions} 
          answers={answers} 
          onBack={handlePrevious} 
          onSubmit={() => onSubmit(answers)}
          submitting={submitting}
        />
      )}
    </div>
  );
}
