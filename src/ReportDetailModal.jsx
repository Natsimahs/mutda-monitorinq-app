// src/ReportDetailModal.jsx

import React from 'react';

// Monitorinq suallarının mətni burada da lazımdır
const monitoringQuestions = [ "Giriş-çıxış nəzarəti mövcuddurmu?", "Həyətyanı sahənin təmizliyinə riayət olunurmu?", "Dəhliz və otaqlarda təmizliyə riayət olunurmu?", "Sanitar qovşaqlarda təmizliyə riayət olunurmu?", "Gigiyenik vasitələrlə təmin edilib və təyinatı üzrə istifadə olunurmu?", "Mətbəxdə sanitar-gigiyenik qaydalara riayət olunurmu?", "Yemək menyusu ilə uyğundurmu?", "Vaxtı keçmiş qida məhsulları aşkar edilməmişdir (məhsulun üzərində qeyd olunan tarixə baxılmalıdır)?", "İnventar kitablanmada qeydiyyatı aparılırmı?", "Təsərrüfat mallarının/vasitələrinin uçotu jurnalı var və işləkdirmi?", "Texniki işçilərin iş bölgüsü var və riayət olunurmu?", "Texniki işçilərlə işə davamiyyət jurnalında qeydiyyat aparılırmı?" ];

const ReportDetailModal = ({ report, onClose }) => {
  if (!report) return null;

  const getSelectedEmployees = () => {
    return Object.keys(report.secilmisEmekdashlar || {}).filter(key => report.secilmisEmekdashlar[key]);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Hesabat Detalları: {report.muessise}</h3>
          <button onClick={onClose} className="modal-close-button">&times;</button>
        </div>
        <div className="modal-body">
          <div className="modal-section">
            <h4>Ümumi Məlumatlar</h4>
            <p><strong>Tarix:</strong> {new Date(report.gonderilmeTarixi).toLocaleString('az-AZ')}</p>
            <p><strong>Rayon:</strong> {report.rayon}</p>
            <p><strong>Monitorinqi aparanlar:</strong> {getSelectedEmployees().join(', ')}</p>
            <p><strong>GPS Məkanı:</strong> Lat: {report.gps?.lat}, Lon: {report.gps?.lon}</p>
          </div>
          <div className="modal-section">
            <h4>Müəssisə Göstəriciləri</h4>
            <p><strong>Uşaq tutumu:</strong> {report.usaqTutumu}</p>
            <p><strong>MTİS üzrə uşaq sayı:</strong> {report.mtisUsaqSayi}</p>
            <p><strong>Sifariş edilən qida sayı:</strong> {report.sifarisEdilenQida}</p>
            <p><strong>Faktiki uşaq sayı:</strong> {report.faktikiUsaqSayi}</p>
          </div>
          <div className="modal-section">
            <h4>Monitorinq Sualları</h4>
            {monitoringQuestions.map((questionText, index) => {
              const qKey = `q${index + 1}`;
              const answerData = report[qKey];
              return (
                <div key={qKey} className="modal-question">
                  <p><strong>{index + 1}. {questionText}:</strong> <span className={`answer-${answerData?.answer}`}>{answerData?.answer || 'Cavablanmayıb'}</span></p>
                  {answerData?.note && <p className="modal-note"><strong>Qeyd:</strong> {answerData.note}</p>}
                </div>
              );
            })}
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

export default ReportDetailModal;
