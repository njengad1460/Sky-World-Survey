import { useState } from 'react';
import StepField from './StepField';
import ReviewPage from './ReviewPage';

export default function Stepper({ questions, onSubmit }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [error, setError] = useState('');

  const currentQuestion = questions[currentIndex];
  const isReviewStep = currentIndex === questions.length;

  const handleValueChange = (value) => {
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: value }));
  };

  const handleNext = () => {
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
    setCurrentIndex(prev => prev - 1);
  };

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
          questions={questions} 
          answers={answers} 
          onBack={handlePrevious} 
          onSubmit={() => onSubmit(answers)} 
        />
      )}
    </div>
  );
}