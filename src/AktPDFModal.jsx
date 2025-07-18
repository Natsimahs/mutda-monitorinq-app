// src/AktPDFModal.jsx

import React, { useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import monitoringQuestions from './monitoringQuestions';

const AktPDFModal = ({ report, kindergartenName, onClose }) => {
  const aktContentRef = useRef(null);

  const handleDownload = async () => {
    const input = aktContentRef.current;
    if (!input) return;

    const canvas = await html2canvas(input, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = imgWidth / imgHeight;
    const imgHeightOnPdf = pdfWidth / ratio;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeightOnPdf);
    pdf.save(`Akt_${kindergartenName}_${report.gonderilmeTarixi.split('T')[0]}.pdf`);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content akt-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Akt Nümunəsi</h3>
          <div>
            <button onClick={handleDownload} className="action-button">Yüklə</button>
            <button onClick={onClose} className="modal-close-button">&times;</button>
          </div>
        </div>
        <div className="modal-body akt-body">
          <div ref={aktContentRef} className="akt-content">
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
            <div className="akt-section">
              <p>Biz, aşağıda imza edənlər:</p>
              <div className="signature-lines">
                {report.signatures.filter(sig => sig.adSoyad).map((sig, index) => (
                    <div key={index} className="signature-line">{sig.adSoyad}, {sig.vezife}</div>
                ))}
                {/* Boş xətlər üçün */}
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
            <div className="akt-section">
              {report.answers.map((answer, index) => (
                <p key={index}><b>{monitoringQuestions[index]}</b> - {answer}</p>
              ))}
            </div>
            <div className="akt-section">
                <p>Aktın doğruluğunu imzamızla təsdiq edirik.</p>
                <div className="signature-images">
                    {report.signatures.filter(sig => sig.imzaData).map((sig, index) => (
                        <div key={index} className="signature-image-item">
                            <img src={sig.imzaData} alt="imza" />
                            <p>{sig.adSoyad}</p>
                        </div>
                    ))}
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AktPDFModal;
