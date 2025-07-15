// src/QuestionBlock.jsx faylının məzmunu belə olmalıdır

import React from 'react';

const QuestionBlock = ({ question, index, formData, handleInputChange }) => {
  const questionKey = `q${index + 1}`;
  
  // formData-da bu sual üçün hələ data olmaya bilər, ona görə yoxlama edirik
  const answer = formData[questionKey]?.answer || '';
  const note = formData[questionKey]?.note || '';

  return (
    <div className="question-block">
      <label className="question-label">{`${index + 1}. ${question}`}</label>
      <div className="radio-group">
        <label>
          <input
            type="radio"
            name={questionKey}
            value="Bəli"
            checked={answer === 'Bəli'}
            onChange={(e) => handleInputChange(questionKey, 'answer', e.target.value)}
          /> Bəli
        </label>
        <label>
          <input
            type="radio"
            name={questionKey}
            value="Xeyr"
            checked={answer === 'Xeyr'}
            onChange={(e) => handleInputChange(questionKey, 'answer', e.target.value)}
          /> Xeyr
        </label>
        <label>
          <input
            type="radio"
            name={questionKey}
            value="Qismən"
            checked={answer === 'Qismən'}
            onChange={(e) => handleInputChange(questionKey, 'answer', e.target.value)}
          /> Qismən
        </label>
      </div>
      <textarea
        className="note-input"
        placeholder="Qeyd (əgər varsa ətraflı yazın)..."
        value={note}
        onChange={(e) => handleInputChange(questionKey, 'note', e.target.value)}
      ></textarea>
    </div>
  );
};

export default QuestionBlock;