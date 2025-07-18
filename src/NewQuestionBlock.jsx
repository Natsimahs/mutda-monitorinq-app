// src/NewQuestionBlock.jsx

import React, { useRef } from 'react';

const NewQuestionBlock = ({ question, index, answer, note, file, onAnswerChange, onNoteChange, onFileChange }) => {
  
  // Gizli input elementlərinə müraciət etmək üçün
  const cameraInputRef = useRef(null);
  const fileInputRef = useRef(null);

  return (
    <div className="new-question-block">
      <div className="question-header">
        <label className="question-label">{`${index + 1}. ${question}`}</label>
        {/* YENİ: Fayl/Şəkil Yükləmə Düymələri */}
        <div className="question-actions">
          <button type="button" className="action-btn camera" onClick={() => cameraInputRef.current.click()}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
            Şəkil çək
          </button>
          <button type="button" className="action-btn file" onClick={() => fileInputRef.current.click()}>
             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>
            Fayl seç
          </button>
          {/* Gizli inputlar */}
          <input 
            type="file" 
            accept="image/*" 
            capture="environment" 
            ref={cameraInputRef} 
            onChange={(e) => onFileChange(e.target.files[0])} 
            style={{ display: 'none' }}
          />
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={(e) => onFileChange(e.target.files[0])} 
            style={{ display: 'none' }}
          />
        </div>
      </div>

      <div className="radio-group">
        <label><input type="radio" name={`q${index}`} value="Bəli" checked={answer === 'Bəli'} onChange={(e) => onAnswerChange(e.target.value)} /> Bəli</label>
        <label><input type="radio" name={`q${index}`} value="Xeyr" checked={answer === 'Xeyr'} onChange={(e) => onAnswerChange(e.target.value)} /> Xeyr</label>
        <label><input type="radio" name={`q${index}`} value="Qismən" checked={answer === 'Qismən'} onChange={(e) => onAnswerChange(e.target.value)} /> Qismən</label>
      </div>
      
      <textarea
        className="note-input"
        placeholder="Qeyd (əgər varsa ətraflı yazın)..."
        value={note}
        onChange={(e) => onNoteChange(e.target.value)}
      ></textarea>

      {/* Yüklənmiş faylın adını göstərmək üçün */}
      {file && (
        <div className="file-display">
          Yüklənmiş fayl: <strong>{typeof file === 'string' ? file.split('/').pop().split('?')[0].slice(14) : file.name}</strong>
        </div>
      )}
    </div>
  );
};

export default NewQuestionBlock;
