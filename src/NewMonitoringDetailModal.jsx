// src/NewMonitoringDetailModal.jsx

import React from 'react';

import monitoringQuestions from './monitoringQuestions';

const NewMonitoringDetailModal = ({ report, kindergartenName, onClose }) => {
  if (!report) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>"{kindergartenName}" üçün Monitorinq Hesabatı</h3>
          <p><strong>Tarix:</strong> {new Date(report.gonderilmeTarixi).toLocaleString('az-AZ')}</p>
          <button onClick={onClose} className="modal-close-button">&times;</button>
        </div>
        <div className="modal-body">
          <div className="modal-section">
            <h4>Ümumi Məlumatlar</h4>
            <p><strong>Rayon:</strong> {report.rayon}</p>
            <p><strong>Əməkdaş:</strong> {report.authorEmail}</p>
            <p><strong>Monitorinq Müddəti:</strong> {new Date(report.monitorinqMuddeti * 1000).toISOString().substr(11, 8)}</p>
            <p><strong>GPS Məkanı:</strong> {report.gps.lat}, {report.gps.lon}</p>
          </div>
          <div className="modal-section">
            <h4>Uşaq Sayları</h4>
            <p><strong>Uşaq tutumu:</strong> {report.usaqTutumu}</p>
            <p><strong>MTİS üzrə uşaq sayı:</strong> {report.mtisUsaqSayi}</p>
            <p><strong>Sifariş edilən qida sayı:</strong> {report.sifarisEdilenQida}</p>
            <p><strong>Faktiki uşaq sayı:</strong> {report.faktikiUsaqSayi}</p>
          </div>
          <div className="modal-section">
            <h4>Monitorinq Sualları</h4>
            {report.answers.map((answer, index) => (
              <div key={index} className="modal-question">
                <p><strong>{index + 1}. {monitoringQuestions[index]}:</strong> <span className={`answer-${answer}`}>{answer || 'Cavablanmayıb'}</span></p>
                {report.notes[index] && <p className="modal-note"><strong>Qeyd:</strong> {report.notes[index]}</p>}
                {report.fileURLs && report.fileURLs[index] && <p className="modal-file"><strong>Əlavə edilmiş fayl:</strong> <a href={report.fileURLs[index]} target="_blank" rel="noopener noreferrer">Yüklə</a></p>}
              </div>
            ))}
          </div>
          <div className="modal-section">
            <h4>İmzalar</h4>
            <div className="modal-signatures-grid">
              {report.signatures && report.signatures
                .filter(sig => sig.adSoyad || sig.imzaData)
                .map((sig, index) => (
                  <div key={index} className="modal-signature-item">
                    <p>{sig.adSoyad || 'Adsız'}</p>
                    <p><em>{sig.vezife || 'Vəzifəsiz'}</em></p>
                    {sig.imzaData && <img src={sig.imzaData} alt="İmza" />}
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewMonitoringDetailModal;
