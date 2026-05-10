// src/AktPDFModal.jsx

import React, { useRef, useState } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import monitoringQuestions from './monitoringQuestions';

const AktPDFModal = ({ report, kindergartenName, onClose }) => {
  const aktContentRef = useRef(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showSignatures, setShowSignatures] = useState(true);

  const performDownload = async (withSignatures) => {
    if (isDownloading) return;
    setIsDownloading(true);
    setShowSignatures(withSignatures);

    // Render olunması üçün qısa fasilə veririk
    setTimeout(async () => {
      try {
        const input = aktContentRef.current;
        if (!input) return;

        const canvas = await html2canvas(input, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/png');
        
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = imgWidth / imgHeight;
        
        const imgHeightOnPdf = pdfWidth / ratio;
        let heightLeft = imgHeightOnPdf;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeightOnPdf);
        heightLeft -= pdfHeight;

        // Əgər qalan hissə (heightLeft) 15mm-dən azdırsa, o sadəcə ağ boşluqdur (padding), ona görə də yeni səhifə açmırıq.
        while (heightLeft > 15) {
          position = heightLeft - imgHeightOnPdf;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeightOnPdf);
          heightLeft -= pdfHeight;
        }

        const signatureText = withSignatures ? "imzali" : "imzasiz";
        pdf.save(`Akt_${kindergartenName}_${report.gonderilmeTarixi.split('T')[0]}_${signatureText}.pdf`);
      } catch (error) {
        console.error("PDF yüklənərkən xəta:", error);
      } finally {
        setShowSignatures(true);
        setIsDownloading(false);
      }
    }, 300);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content akt-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Akt Nümunəsi</h3>
          <div>
            <button onClick={() => performDownload(true)} className="action-button" disabled={isDownloading}>
              {isDownloading ? 'Gözləyin...' : 'İmzalı Yüklə'}
            </button>
            <button onClick={() => performDownload(false)} className="action-button" style={{marginLeft: '8px', background: '#64748b'}} disabled={isDownloading}>
              İmzasız Yüklə
            </button>
            <button onClick={onClose} className="modal-close-button" style={{marginLeft: '12px'}}>&times;</button>
          </div>
        </div>
        <div className="modal-body akt-body">
          <div ref={aktContentRef} className="akt-content" style={{ fontSize: '13px', lineHeight: '1.5', padding: '20px', background: 'white', color: 'black' }}>
            <div className="akt-header">
              <p>AKT</p>
              <div className="akt-header-details">
                <span>Bakı şəhəri,</span>
                <span><b>Tarix:</b> {new Date(report.gonderilmeTarixi).toLocaleDateString('az-AZ')}</span>
                <span>{report.rayon} rayonu,</span>
                <span><b>Saat:</b> {new Date(report.gonderilmeTarixi).toLocaleTimeString('az-AZ')}</span>
                <span>{kindergartenName}</span>
              </div>
            </div>

            {(!report.regionalIdare || report.regionalIdare === 'Bakı Şəhəri üzrə Təhsil İdarəsi') ? (
              <>
                <div className="akt-section">
                  <p>Biz, aşağıda imza edənlər:</p>
                  <div className="signature-lines">
                    {report.signatures.filter(sig => sig.adSoyad).map((sig, index) => (
                        <div key={index} className="signature-line">{sig.adSoyad}, {sig.vezife}</div>
                    ))}
                    {[...Array(Math.max(0, 5 - report.signatures.filter(sig => sig.adSoyad).length))].map((_, i) => (
                        <div key={i} className="signature-line"></div>
                    ))}
                  </div>
                </div>
                <div className="akt-section">
                  <p>
                    Bu aktı tərtib edirik ona görə ki, qeyd olunan tarixdə müəssisədə olarkən aşağıdakı nəticələri aşkar etdik:
                    Müəssisənin uşaq tutumu <b>{report.usaqTutumu}</b>, MTİS üzrə uşaq sayı <b>{report.mtisUsaqSayi}</b>, sifariş edilən qida sayı <b>{report.sifarisEdilenQida}</b>, faktiki uşaq sayı <b>{report.faktikiUsaqSayi}</b> olmuşdur.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="akt-section" style={{textAlign: 'center', fontWeight: 'bold', margin: '20px 0', fontSize: '14px'}}>
                  Məktəbəqədər təhsil müəssisələrində aparılan monitorinqə dair AKT
                </div>
                <div className="akt-section">
                  <p>
                    Müəssisənin uşaq tutumu <b>{report.usaqTutumu}</b>, MTİS üzrə uşaq sayı <b>{report.mtisUsaqSayi}</b>, sifariş edilən qida sayı <b>{report.sifarisEdilenQida}</b>, faktiki uşaq sayı <b>{report.faktikiUsaqSayi}</b> olmuşdur.
                  </p>
                </div>
              </>
            )}

            <div className="akt-section">
              {report.answers.map((answer, index) => (
                <div key={index} style={{ marginBottom: '10px' }}>
                  <p style={{ margin: 0 }}><b>{monitoringQuestions[index]}</b> - {answer}</p>
                  {report.notes && report.notes[index] && (
                    <p style={{ margin: '4px 0 0 10px', fontSize: '0.95em', color: '#333' }}>
                      <i>Qeyd: {report.notes[index]}</i>
                    </p>
                  )}
                </div>
              ))}
            </div>
            {showSignatures && (
              <div className="akt-section">
                  <p>Aktın doğruluğunu imzamızla təsdiq edirik.</p>
                  <div className="signature-images" style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginTop: '10px' }}>
                      {report.signatures.filter(sig => sig.imzaData).map((sig, index) => (
                          <div key={index} className="signature-image-item" style={{ textAlign: 'center' }}>
                              <img src={sig.imzaData} alt="imza" style={{ width: '120px', borderBottom: '1px solid #000' }} />
                              <p style={{ margin: '4px 0 0 0', fontSize: '11px' }}>{sig.adSoyad}</p>
                              <p style={{ margin: 0, fontSize: '10px', color: '#555' }}>({sig.vezife})</p>
                          </div>
                      ))}
                  </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AktPDFModal;
