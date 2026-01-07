// src/school/SchoolQuestionBlock.jsx
import React, { useRef } from 'react';

const SchoolQuestionBlock = ({
  question,
  index,
  answer,
  note,
  file,
  onAnswerChange,
  onNoteChange,
  onFileChange,
  showRadio = true, // default: radio var
}) => {
  const cameraInputRef = useRef(null);
  const fileInputRef = useRef(null);

  return (
    <div className="new-question-block">
      <div className="question-header">
        <label className="question-label">{`${index + 1}. ${question}`}</label>

        <div className="question-actions">
          <button
            type="button"
            className="action-btn camera"
            onClick={() => cameraInputRef.current.click()}
          >
            Şəkil çək
          </button>

          <button
            type="button"
            className="action-btn file"
            onClick={() => fileInputRef.current.click()}
          >
            Fayl seç
          </button>

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) onFileChange(e.target.files[0]);
            }}
          />

          <input
            ref={fileInputRef}
            type="file"
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) onFileChange(e.target.files[0]);
            }}
          />
        </div>
      </div>

      {showRadio && (
        <div className="radio-group">
          <label>
            <input
              type="radio"
              name={`school-q${index}`}
              value="Bəli"
              checked={answer === "Bəli"}
              onChange={(e) => onAnswerChange(e.target.value)}
            />{" "}
            Bəli
          </label>

          <label>
            <input
              type="radio"
              name={`school-q${index}`}
              value="Xeyr"
              checked={answer === "Xeyr"}
              onChange={(e) => onAnswerChange(e.target.value)}
            />{" "}
            Xeyr
          </label>

          <label>
            <input
              type="radio"
              name={`school-q${index}`}
              value="Qismən"
              checked={answer === "Qismən"}
              onChange={(e) => onAnswerChange(e.target.value)}
            />{" "}
            Qismən
          </label>
        </div>
      )}

      <textarea
        className="note-input"
        placeholder="Qeyd (əgər varsa ətraflı yazın)..."
        value={note}
        onChange={(e) => onNoteChange(e.target.value)}
      />

      {file && (
        <div className="file-display">
          Yüklənmiş fayl:{" "}
          <strong>
            {typeof file === 'string'
              ? file.split('/').pop().split('?')[0].slice(14)
              : file.name}
          </strong>
        </div>
      )}
    </div>
  );
};

export default SchoolQuestionBlock;
