// src/NewMonitoringReportsPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import * as XLSX from 'xlsx';
import NewMonitoringDetailModal from './NewMonitoringDetailModal.jsx';
import AktPDFModal from './AktPDFModal.jsx';
import monitoringQuestions from './monitoringQuestions';
import { useFilteredReports } from './hooks/useFilteredReports';

function getRiskLevel(report) {
  const count = report.answers?.filter(a => a === "Xeyr").length || 0;
  if (count >= 3) return "🔴";
  if (count >= 1) return "🟡";
  return "🟢";
}

const pageSize = 20;

const NewMonitoringReportsPage = () => {
  const [allReports, setAllReports] = useState([]);
  const [kindergartens, setKindergartens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedRayon, setSelectedRayon] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'gonderilmeTarixi', direction: 'descending' });
  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedReportForAkt, setSelectedReportForAkt] = useState(null);

  // Yeni filtrləmə və axtarış state-ləri
  const [searchTerm, setSearchTerm] = useState("");
  const [showCriticalOnly, setShowCriticalOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [visibleColumns, setVisibleColumns] = useState([
    "Tarix", "Saat", "Risk", "Rayon", "Müəssisə", "Əməkdaş", "Ətraflı", "PDF"
  ]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const kgSnapshot = await getDocs(collection(db, "bagcalar"));
        setKindergartens(kgSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        const reportSnapshot = await getDocs(collection(db, "newMonitorinqHesabatlari"));
        setAllReports(reportSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Hesabatlar yüklənərkən xəta:", error);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const getKindergartenNameById = (id) => kindergartens.find(k => k.id === id)?.adi || 'Bilinməyən';

  // Mövcud filterlərə search və kritiklik filtri əlavə olundu
  const filteredByDateAndRayon = useMemo(() => {
    let filtered = allReports.filter(report => {
      const reportDate = new Date(report.gonderilmeTarixi);
      const start = startDate ? new Date(startDate) : null;
      if (start) start.setHours(0, 0, 0, 0);
      const end = endDate ? new Date(endDate) : null;
      if (end) end.setHours(23, 59, 59, 999);
      const dateFilterPassed = (!start || reportDate >= start) && (!end || reportDate <= end);
      const rayonFilterPassed = (selectedRayon === 'all' || report.rayon === selectedRayon);
      return dateFilterPassed && rayonFilterPassed;
    });
    // Sort
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        const aValue = a[sortConfig.key] || '';
        const bValue = b[sortConfig.key] || '';
        if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return filtered;
  }, [allReports, startDate, endDate, selectedRayon, sortConfig]);

  // Əlavə filtrləmə və search (custom hook ilə)
  const filteredReports = useFilteredReports(filteredByDateAndRayon, searchTerm, showCriticalOnly);

  // Pagination
  const paginatedReports = filteredReports.slice(
    (currentPage - 1) * pageSize, currentPage * pageSize
  );
  const totalPages = Math.ceil(filteredReports.length / pageSize);

  // Dinamik sütunlar
  const columns = [
    { key: "Tarix", title: "Tarix" },
    { key: "Saat", title: "Saat" },
    { key: "Risk", title: "Kritiklik" },
    { key: "Rayon", title: "Rayon" },
    { key: "Müəssisə", title: "Müəssisə" },
    { key: "Əməkdaş", title: "Əməkdaş" },
    { key: "Ətraflı", title: "Ətraflı" },
    { key: "PDF", title: "PDF" }
  ];

  function handleColumnToggle(columnKey) {
    setVisibleColumns((prev) =>
      prev.includes(columnKey)
        ? prev.filter((c) => c !== columnKey)
        : [...prev, columnKey]
    );
  }

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortArrow = (key) => {
      if (sortConfig.key !== key) return '↕';
      return sortConfig.direction === 'ascending' ? '▲' : '▼';
  }

  const rayonlar = [...new Set(kindergartens.map(kg => kg.rayon))];
  if (loading) return <div className="loading-screen">Hesabatlar yüklənir...</div>;

  // Excel ixracı əvvəlki kimi saxlanılır
  const handleExportToExcel = (dataToExport, fileName) => {
    if (dataToExport.length === 0) {
        alert("İxrac etmək üçün məlumat yoxdur.");
        return;
    }
    const dataForExcel = dataToExport.map(report => {
        let row = {
            'Tarix': new Date(report.gonderilmeTarixi).toLocaleDateString('az-AZ'),
            'Saat': new Date(report.gonderilmeTarixi).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' }),
            'Monitorinq Müddəti': new Date(report.monitorinqMuddeti * 1000).toISOString().substr(11, 8),
            'GPS Ünvan': `${report.gps?.lat || ''}, ${report.gps?.lon || ''}`,
            'Əməkdaş': report.authorEmail,
            'Rayon': report.rayon,
            'Müəssisə': getKindergartenNameById(report.bagcaId),
            'Uşaq Tutumu': report.usaqTutumu,
            'MTİS üzrə Uşaq Sayı': report.mtisUsaqSayi,
            'Sifariş Edilən Qida': report.sifarisEdilenQida,
            'Faktiki Uşaq Sayı': report.faktikiUsaqSayi,
        };
        monitoringQuestions.forEach((question, index) => {
            row[question] = report.answers?.[index] || 'N/A';
            row[`Qeyd (${question})`] = report.notes?.[index] || '';
        });
        return row;
    });
    const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Monitorinq Hesabatları');
    const cols = Object.keys(dataForExcel[0]).map(key => ({ wch: Math.max(20, key.length) }));
    worksheet["!cols"] = cols;
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  };

  return (
    <>
      <div className="reports-page-container">
        <h2>MTM üzrə Monitorinq Hesabatları</h2>
        {/* Filtrlər və yeni UI */}
        <div className="filters-container">
          <div className="date-filters"><label>Başlanğıc Tarix:</label><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
          <div className="date-filters"><label>Son Tarix:</label><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
          <select value={selectedRayon} onChange={(e) => setSelectedRayon(e.target.value)}><option value="all">Bütün Rayonlar</option>{rayonlar.map(r => <option key={r} value={r}>{r}</option>)}</select>
          <input
            type="text"
            placeholder="Açar söz ilə axtar..."
            value={searchTerm}
            onChange={e => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            style={{ padding: 8, marginLeft: 16, width: 200 }}
          />
          <label style={{ marginLeft: 8 }}>
            <input
              type="checkbox"
              checked={showCriticalOnly}
              onChange={e => {
                setShowCriticalOnly(e.target.checked);
                setCurrentPage(1);
              }}
            />
            Yalnız ən az 3 "Xeyr" olanlar
          </label>
          <div className="export-buttons-group">
            <button onClick={() => handleExportToExcel(filteredReports, 'Filtrli_Hesabat')} className="export-button">
              Filtrə uyğun Excel
            </button>
            <button onClick={() => handleExportToExcel(allReports, 'Umumi_Hesabat')} className="export-button general-export">
              Ümumi Excel
            </button>
          </div>
        </div>
        {/* Dinamik sütun menyusu */}
        <div style={{ margin: '12px 0' }}>
          Sütunlar:
          {columns.map(col => (
            <label key={col.key} style={{ marginLeft: 8 }}>
              <input
                type="checkbox"
                checked={visibleColumns.includes(col.key)}
                onChange={() => handleColumnToggle(col.key)}
              />
              {col.title}
            </label>
          ))}
        </div>
        {/* Cədvəl */}
        <div className="table-container">
          <table className="reports-table">
            <thead>
              <tr>
                {columns.filter(col => visibleColumns.includes(col.key)).map(col => (
                  <th key={col.key}>{col.title}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedReports.length > 0 ? (
                paginatedReports.map(report => (
                  <tr key={report.id}>
                    {visibleColumns.includes("Tarix") && <td>{new Date(report.gonderilmeTarixi).toLocaleDateString('az-AZ')}</td>}
                    {visibleColumns.includes("Saat") && <td>{new Date(report.gonderilmeTarixi).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' })}</td>}
                    {visibleColumns.includes("Risk") && <td>{getRiskLevel(report)}</td>}
                    {visibleColumns.includes("Rayon") && <td>{report.rayon}</td>}
                    {visibleColumns.includes("Müəssisə") && <td>{getKindergartenNameById(report.bagcaId)}</td>}
                    {visibleColumns.includes("Əməkdaş") && <td>{report.authorEmail}</td>}
                    {visibleColumns.includes("Ətraflı") && (
                      <td><button className="details-button" onClick={() => setSelectedReport(report)}>Bax</button></td>
                    )}
                    {visibleColumns.includes("PDF") && (
                      <td><button className="details-button pdf-button" onClick={() => setSelectedReportForAkt(report)}>PDF</button></td>
                    )}
                  </tr>
                ))
              ) : (
                <tr><td colSpan={columns.length}>Filtrlərə uyğun hesabat tapılmadı.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div style={{ margin: 16 }}>
          Səhifə: {currentPage} / {totalPages}
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
            &lt; Prev
          </button>
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
            Next &gt;
          </button>
        </div>
        <div>Cəmi hesabat: {filteredReports.length}</div>
      </div>
      {selectedReport && (
        <NewMonitoringDetailModal
          report={selectedReport}
          kindergartenName={getKindergartenNameById(selectedReport.bagcaId)}
          onClose={() => setSelectedReport(null)}
        />
      )}
      {selectedReportForAkt && (
        <AktPDFModal
          report={selectedReportForAkt}
          kindergartenName={getKindergartenNameById(selectedReportForAkt.bagcaId)}
          onClose={() => setSelectedReportForAkt(null)}
        />
      )}
    </>
  );
};

export default NewMonitoringReportsPage;
