// src/school/SchoolMonitoringDetailModal.jsx

import React from 'react';
import schoolMonitoringQuestions from './schoolMonitoringQuestions';

const SchoolMonitoringDetailModal = ({ report, schoolName, onClose }) => {
  if (!report) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>"{schoolName}" üçün Monitorinq Hesabatı</h3>
          <p><strong>Tarix:</strong> {new Date(report.gonderilmeTarixi).toLocaleString('az-AZ')}</p>
          <button onClick={onClose} className="modal-close-button">&times;</button>
        </div>

        <div className="modal-body">
          <div className="modal-section">
            <h4>Ümumi Məlumatlar</h4>
            <p><strong>Rayon:</strong> {report.rayon}</p>
            <p><strong>Əməkdaş:</strong> {report.authorEmail}</p>
            <p>
              <strong>Monitorinq Müddəti:</strong>{" "}
              {new Date((Number(report.monitorinqMuddeti || 0)) * 1000).toISOString().substr(11, 8)}
            </p>
            <p>
              <strong>GPS Məkanı:</strong>{" "}
              {report.gps?.lat ? `${report.gps.lat}, ${report.gps.lon}` : "Göstərilməyib"}
            </p>
          </div>

          <div className="modal-section">
            <h4>Monitorinq Sualları</h4>

            {schoolMonitoringQuestions.map((question, index) => (
              <div key={index} className="question-detail-item">
                <p><strong>{question}</strong></p>
                <p><strong>Cavab:</strong> {report.answers?.[index] || 'N/A'}</p>
                {(report.notes?.[index] || '').trim() && (
                  <p><strong>Qeyd:</strong> {report.notes[index]}</p>
                )}
                {report.files?.[index] && (
                  <p>
                    <strong>Fayl:</strong>{" "}
                    <a href={report.files[index]} target="_blank" rel="noreferrer">
                      Bax
                    </a>
                  </p>
                )}
                <hr />
              </div>
            ))}
          </div>

          {Array.isArray(report.signatures) && report.signatures.length > 0 && (
            <div className="modal-section">
              <h4>İmzalar</h4>
              {report.signatures.map((sig, idx) => (
                <div key={idx} style={{ marginBottom: 12 }}>
                  <p><strong>Ad Soyad:</strong> {sig?.adSoyad || '-'}</p>
                  <p><strong>Vəzifə:</strong> {sig?.vezife || '-'}</p>
                  {sig?.imzaData && (
                    <img
                      src={sig.imzaData}
                      alt={`İmza ${idx + 1}`}
                      style={{ width: 260, maxWidth: "100%", border: "1px solid #ddd", borderRadius: 8 }}
                    />
                  )}
                  <hr />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SchoolMonitoringDetailModal;
