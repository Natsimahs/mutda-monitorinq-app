// src/ReportPDF.jsx

import React from 'react';

// Bu komponent PDF-ə çevriləcək hesabatın strukturunu saxlayır
const ReportPDF = React.forwardRef(({ data }, ref) => {
  if (!data) return null;

  const getSelectedEmployees = () => {
    return Object.keys(data.secilmisEmekdashlar || {}).filter(key => data.secilmisEmekdashlar[key]);
  };

  return (
    <div ref={ref} className="pdf-report-container">
      <div className="pdf-header">
        {/* Buraya MÜTDA-nın loqosunu da yerləşdirmək olar */}
        <h1>Məktəbəqədər Təhsil Müəssisəsi üzrə Monitorinq Hesabatı</h1>
      </div>

      <div className="pdf-section">
        <h2>Ümumi Məlumatlar</h2>
        <p><strong>Tarix:</strong> {new Date(data.gonderilmeTarixi).toLocaleDateString('az-AZ')}</p>
        <p><strong>Rayon:</strong> {data.rayon}</p>
        <p><strong>Müəssisə:</strong> {data.muessise}</p>
        <p><strong>Monitorinqi aparanlar:</strong> {getSelectedEmployees().join(', ')}</p>
        <p><strong>GPS Məkanı:</strong> Lat: {data.gps.lat}, Lon: {data.gps.lon}</p>
      </div>

      <div className="pdf-section">
        <h2>Müəssisə Göstəriciləri</h2>
        <p><strong>Uşaq tutumu:</strong> {data.usaqTutumu}</p>
        <p><strong>MTİS üzrə uşaq sayı:</strong> {data.mtisUsaqSayi}</p>
        <p><strong>Sifariş edilən qida sayı:</strong> {data.sifarisEdilenQida}</p>
        <p><strong>Faktiki uşaq sayı:</strong> {data.faktikiUsaqSayi}</p>
      </div>

      <div className="pdf-section">
        <h2>Monitorinq Sualları</h2>
        {Object.keys(data)
          .filter(key => key.startsWith('q'))
          .map((qKey, index) => (
            <div key={qKey} className="pdf-question">
              <p><strong>Sual {index + 1}:</strong> {data[qKey].answer}</p>
              {data[qKey].note && <p className="pdf-note"><strong>Qeyd:</strong> {data[qKey].note}</p>}
            </div>
          ))}
      </div>
      
      <div className="pdf-section">
        <h2>İmzalar</h2>
        <div className="pdf-signatures-grid">
          {data.signatures && data.signatures
            .filter(sig => sig.adSoyad || sig.imzaData)
            .map((sig, index) => (
              <div key={index} className="pdf-signature-item">
                <p>{sig.adSoyad || 'Adsız'}</p>
                <p><em>{sig.vezife || 'Vəzifəsiz'}</em></p>
                {sig.imzaData && <img src={sig.imzaData} alt="İmza" className="pdf-signature-img" />}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
});

export default ReportPDF;
