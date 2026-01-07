// src/school/SchoolAktPDFModal.jsx

import React, { useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import schoolMonitoringQuestions from './schoolMonitoringQuestions';

const SchoolAktPDFModal = ({ report, schoolName, onClose }) => {
  const aktContentRef = useRef(null);

  const handleDownload = async () => {
    const input = aktContentRef.current;
    if (!input) return;

    // Daha stabil nəticə üçün: ölçünü böyüdüb keyfiyyəti artırırıq
    const canvas = await html2canvas(input, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      scrollY: -window.scrollY,
    });

    const imgData = canvas.toDataURL('image/png');

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();   // ~210mm
    const pdfHeight = pdf.internal.pageSize.getHeight(); // ~297mm

    // Şəkli PDF eninə görə ölçüləndiririk
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = imgWidth / imgHeight;

    const renderWidth = pdfWidth;          // 210mm
    const renderHeight = renderWidth / ratio; // mm-lə hündürlük

    // MULTI-PAGE: Şəkil A4-dən uzundursa, səhifələrə böl
    let positionY = 0;
    let heightLeft = renderHeight;

    // 1-ci səhifə
    pdf.addImage(imgData, 'PNG', 0, positionY, renderWidth, renderHeight);
    heightLeft -= pdfHeight;

    // Növbəti səhifələr
    while (heightLeft > 0) {
      pdf.addPage();
      positionY = heightLeft - renderHeight; // mənfi dəyər yuxarıdan “kəsmə” effekti verir
      pdf.addImage(imgData, 'PNG', 0, positionY, renderWidth, renderHeight);
      heightLeft -= pdfHeight;
    }

    const datePart = (report?.gonderilmeTarixi || "").split("T")[0] || "tarix";
    pdf.save(`Akt_${schoolName || "Mekteb"}_${datePart}.pdf`);
  };

  const signatures = Array.isArray(report?.signatures) ? report.signatures : [];
  const answers = Array.isArray(report?.answers) ? report.answers : [];
  const notes = Array.isArray(report?.notes) ? report.notes : [];

  const filledSignatures = signatures.filter((sig) => (sig?.adSoyad || "").trim());
  const emptyLineCount = Math.max(0, 5 - filledSignatures.length);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content akt-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Akt Nümunəsi</h3>
          <div>
            <button onClick={handleDownload} className="action-button">Yüklə</button>
            <button onClick={onClose} className="modal-close-button">&times;</button>
          </div>
        </div>

        <div className="modal-body akt-body">
          {/* PDF üçün əsas kontent */}
          <div
            ref={aktContentRef}
            className="akt-content"
            style={{
              fontSize: "12px",
              lineHeight: 1.25,
              color: "#111",
              background: "#fff",
              padding: "10px",
              boxSizing: "border-box",
              width: "794px", // A4-ün ekranda “stabil” renderi üçün (təxmini)
              margin: "0 auto",
            }}
          >
            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: 8 }}>
              <div style={{ fontWeight: 700, letterSpacing: 0.4 }}>AKT</div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 10 }}>
              <div>Bakı şəhəri,</div>
              <div style={{ textAlign: "right" }}>
                <b>Tarix:</b> {new Date(report.gonderilmeTarixi).toLocaleDateString('az-AZ')}
              </div>

              <div>{report.rayon} rayonu,</div>
              <div style={{ textAlign: "right" }}>
                <b>Saat:</b> {new Date(report.gonderilmeTarixi).toLocaleTimeString('az-AZ')}
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <b>Məktəb:</b> {schoolName}
              </div>
            </div>

            {/* İmza edənlər (ad+vəzifə) */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ marginBottom: 6 }}>Biz, aşağıda imza edənlər:</div>

              <div style={{ display: "grid", gap: 4 }}>
                {filledSignatures.map((sig, idx) => (
                  <div
                    key={idx}
                    style={{
                      borderBottom: "1px solid #cfcfcf",
                      paddingBottom: 2,
                    }}
                  >
                    {(sig.adSoyad || "").trim()}, {(sig.vezife || "").trim()}
                  </div>
                ))}

                {[...Array(emptyLineCount)].map((_, i) => (
                  <div
                    key={i}
                    style={{
                      borderBottom: "1px solid #cfcfcf",
                      paddingBottom: 2,
                      height: 16,
                    }}
                  />
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 10 }}>
              Bu aktı tərtib edirik ona görə ki, qeyd olunan tarixdə müəssisədə (məktəbdə) olarkən aşağıdakı nəticələri
              aşkar etdik:
            </div>

            {/* Suallar + cavablar + qeydlər */}
            <div style={{ marginBottom: 12 }}>
              {schoolMonitoringQuestions.map((q, index) => {
                const ans = answers?.[index] ?? "";
                const note = (notes?.[index] ?? "").toString().trim();

                // Boş suallar düşməsin deyə (əgər massiv uzunluqları fərqlidirsə)
                if (!q) return null;

                return (
                  <div key={index} style={{ marginBottom: 6 }}>
                    <div style={{ fontWeight: 700 }}>
                      {index + 1}. {q}
                    </div>
                    <div style={{ marginTop: 1 }}>
                      <b>Cavab:</b> {ans || "—"}
                    </div>

                    {/* QEYD: boş deyilsə göstər */}
                    {note && (
                      <div style={{ marginTop: 1 }}>
                        <b>Qeyd:</b> <span style={{ fontStyle: "italic" }}>{note}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Son təsdiq + imza şəkilləri */}
            <div style={{ marginTop: 8 }}>
              <div style={{ marginBottom: 8 }}>Aktın doğruluğunu imzamızla təsdiq edirik.</div>

              {/* İmza şəkilləri: daha kiçik + A4 üçün 2 sütun */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {signatures
                  .filter((sig) => sig?.imzaData)
                  .map((sig, idx) => (
                    <div
                      key={idx}
                      style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: 8,
                        padding: 6,
                        minHeight: 90,
                      }}
                    >
                      <div
                        style={{
                          width: "100%",
                          height: 48, // əvvəl 60 idi, daha da kiçildirik
                          border: "1px solid #f0f0f0",
                          borderRadius: 6,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "#fff",
                        }}
                      >
                        <img
                          src={sig.imzaData}
                          alt="imza"
                          style={{
                            maxWidth: "100%",
                            maxHeight: "100%",
                            objectFit: "contain",
                            display: "block",
                          }}
                        />
                      </div>
                      <div style={{ marginTop: 6, fontSize: "11px" }}>
                        <b>{(sig.adSoyad || "").trim() || "—"}</b>
                        {sig.vezife ? <div>{sig.vezife}</div> : null}
                      </div>
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

export default SchoolAktPDFModal;
