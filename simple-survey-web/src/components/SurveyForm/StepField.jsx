
export default function StepField({ question, value, onChange }) {
  const { type, text, description, required, options } = question;

  const handleCheckboxChange = (optionValue, checked) => {
    const currentValues = Array.isArray(value) ? value : [];
    if (checked) {
      onChange([...currentValues, optionValue]);
    } else {
      onChange(currentValues.filter(v => v !== optionValue));
    }
  };

  return (
    <div className="question-card">
      <h3 className="question-text">
        {text} {required === 'yes' && <span className="required-star">*</span>}
      </h3>
      {description && <p className="question-desc">{description}</p>}

      <div className="input-container">
        {type === 'short_text' && (
          <input 
            type="text" 
            className="form-input"
            value={value || ''} 
            onChange={(e) => onChange(e.target.value)} 
          />
        )}

        {type === 'long_text' && (
          <textarea 
            className="form-textarea"
            value={value || ''} 
            onChange={(e) => onChange(e.target.value)}
          />
        )}

        {type === 'email' && (
          <input 
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            className="form-input"
            value={value || ''} 
            onChange={(e) => onChange(e.target.value)} 
          />
        )}

        {type === 'choice' && options?.option && (
          <div className="options-group">
            {(Array.isArray(options.option) ? options.option : [options.option]).map((opt, i) => {
              const optVal = opt.value || opt._ || opt;
              const optText = opt._ || opt;
              const isMultiple = options.multiple === 'yes';

              return (
                <label key={i} className="option-label">
                  <input
                    type={isMultiple ? "checkbox" : "radio"}
                    name={`q-${question.id}`}
                    value={optVal}
                    checked={isMultiple ? (Array.isArray(value) && value.includes(optVal)) : value === optVal}
                    onChange={(e) => isMultiple ? handleCheckboxChange(optVal, e.target.checked) : onChange(optVal)}
                  />
                  <span>{optText}</span>
                </label>
              );
            })}
          </div>
        )}

        {type === 'file' && (
          <div className="file-upload-zone">
            <input 
              type="file" 
              accept={question.file_properties?.format || '.pdf'}
              multiple={question.file_properties?.multiple === 'yes'}
              onChange={(e) => onChange(e.target.files)} 
            />
            <small className="file-limits">
              Max size: {question.file_properties?.max_file_size || 1} {question.file_properties?.max_file_size_unit || 'mb'} (.pdf)
            </small>
          </div>
        )}
      </div>
    </div>
  );
}