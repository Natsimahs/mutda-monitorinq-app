// src/NewMonitoringReportsPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, where, doc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import * as XLSX from 'xlsx';
import NewMonitoringDetailModal from './NewMonitoringDetailModal.jsx';
import AktPDFModal from './AktPDFModal.jsx';
import monitoringQuestions from './monitoringQuestions';
import { useFilteredReports } from './hooks/useFilteredReports';
import MapModal from './MapModal.jsx';

// Master şifrə — Firestore Rules (server) + admin rolu ilə qorunur
const MASTER_PASSWORD = '202420252026';

function getRiskLevel(report) {
  let negativeCount = 0;
  if (report.answers) {
    report.answers.forEach((ans, index) => {
      if (index === 7) {
        if (ans === "Bəli") negativeCount++;
      } else {
        if (ans === "Xeyr") negativeCount++;
      }
    });
  }
  if (negativeCount >= 3) return "🔴";
  if (negativeCount >= 1) return "🟡";
  return "🟢";
}

const pageSize = 20;

const NewMonitoringReportsPage = ({ user }) => {
  const [allReports, setAllReports] = useState([]);
  const [kindergartens, setKindergartens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedRegional, setSelectedRegional] = useState('all');
  const [selectedRayon, setSelectedRayon] = useState('all');
  const [selectedMekteb, setSelectedMekteb] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'gonderilmeTarixi', direction: 'descending' });
  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedReportForAkt, setSelectedReportForAkt] = useState(null);
  // Silmə modalı üçün state
  const [deleteModal, setDeleteModal] = useState({ open: false, report: null });
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  // Yeni filtrləmə və axtarış state-ləri
  const [searchTerm, setSearchTerm] = useState("");
  const [showCriticalOnly, setShowCriticalOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const base = ["Tarix", "Saat", "Risk", "Regional İdarə", "Rayon", "Müəssisə", "Əməkdaş", "Ətraflı", "PDF"];
    return user?.role === 'admin' ? [...base, "Sil"] : base;
  });
  // Xəritə modalı üçün state
  const [mapOpen, setMapOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Bağçalar
        const kgSnapshot = await getDocs(collection(db, "bagcalar"));
        setKindergartens(kgSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        // Reportlar: admin və ya viewScope === 'all' hamısını görür
        const reportsCol = collection(db, "newMonitorinqHesabatlari");

        if (user?.role === 'admin' || user?.viewScope === 'all') {
          const reportSnapshot = await getDocs(reportsCol);
          setAllReports(reportSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } else if (user?.viewScope === 'region' && user?.assignedRegions?.length > 0) {
          // Regionlara görə axtarış (Firestore 'in' limiti 10-dur, buna görə chunk edirik)
          const regions = user.assignedRegions;
          const merged = new Map();
          
          for (let i = 0; i < regions.length; i += 10) {
            const chunk = regions.slice(i, i + 10);
            const q = query(reportsCol, where('regionalIdare', 'in', chunk));
            const snap = await getDocs(q);
            snap.forEach(d => merged.set(d.id, { id: d.id, ...d.data() }));
          }
          setAllReports(Array.from(merged.values()));
        } else {
          // viewScope === 'own' və ya default: Yalnız öz yazdıqlarını görür
          const uid = user?.uid || '';
          const emailRaw = (user?.email || '').trim();
          const emailLower = emailRaw.toLowerCase();

          const queries = [];
          if (uid) queries.push(getDocs(query(reportsCol, where('authorId', '==', uid))));
          if (emailRaw) queries.push(getDocs(query(reportsCol, where('authorEmail', '==', emailRaw))));
          if (emailLower && emailLower !== emailRaw) {
            queries.push(getDocs(query(reportsCol, where('authorEmail', '==', emailLower))));
          }

          const results = await Promise.all(queries);
          const merged = new Map();
          results.forEach(snap => {
            snap.forEach(d => merged.set(d.id, { id: d.id, ...d.data() }));
          });

          setAllReports(Array.from(merged.values()));
        }
      } catch (error) {
        console.error("Hesabatlar yüklənərkən xəta:", error);
      }
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const getKindergartenNameById = (id) => kindergartens.find(k => k.id === id)?.adi || 'Bilinməyən';

  // Mövcud filterlərə search və kritiklik filtri əlavə olundu
  const filteredByDateAndHierarchy = useMemo(() => {
    let filtered = allReports.filter(report => {
      const reportDate = new Date(report.gonderilmeTarixi);
      const start = startDate ? new Date(startDate) : null;
      if (start) start.setHours(0, 0, 0, 0);
      const end = endDate ? new Date(endDate) : null;
      if (end) end.setHours(23, 59, 59, 999);
      const dateFilterPassed = (!start || reportDate >= start) && (!end || reportDate <= end);
      
      const regionalFilterPassed = (selectedRegional === 'all' || report.regionalIdare === selectedRegional);
      const rayonFilterPassed = (selectedRayon === 'all' || report.rayon === selectedRayon);
      const mektebFilterPassed = (selectedMekteb === 'all' || report.bagcaId === selectedMekteb);
      
      return dateFilterPassed && regionalFilterPassed && rayonFilterPassed && mektebFilterPassed;
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
  }, [allReports, startDate, endDate, selectedRegional, selectedRayon, selectedMekteb, sortConfig]);

  // Əlavə filtrləmə və search (custom hook ilə)
  const filteredReports = useFilteredReports(filteredByDateAndHierarchy, searchTerm, showCriticalOnly);

  // --- STATİSTİKA HESABLARI ---
  // 1. Ümumi monitorinq sayı (filtrə uyğun)
  const totalCount = filteredReports.length;

  // 2. Rayonlar üzrə monitorinq sayı (obyekt: rayon -> say)
  const rayonCountObj = {};
  filteredReports.forEach(r => {
    if (!rayonCountObj[r.rayon]) rayonCountObj[r.rayon] = 0;
    rayonCountObj[r.rayon]++;
  });

  // 3. Ən çox mənfi cavab verilən sual (filtrə uyğun)
  const questionNoCounts = Array(monitoringQuestions.length).fill(0);
  filteredReports.forEach(r => {
    (r.answers || []).forEach((ans, i) => {
      if (i === 7) {
        if(ans === "Bəli") questionNoCounts[i]++;
      } else {
        if(ans === "Xeyr") questionNoCounts[i]++;
      }
    });
  });
  const maxNoCount = Math.max(...questionNoCounts);
  const maxNoIndex = questionNoCounts.findIndex(v => v === maxNoCount);
  const maxNoQuestion = maxNoCount > 0 ? monitoringQuestions[maxNoIndex] : "-";

  // --- Qalan kodlar dəyişmir! ---
  const gpsList = filteredReports
    .filter(r => r.gps && r.gps.lat && r.gps.lon)
    .map(r => ({
      lat: r.gps.lat,
      lon: r.gps.lon,
      title: getKindergartenNameById(r.bagcaId),
      id: r.id,
    }));
  const paginatedReports = filteredReports.slice(
    (currentPage - 1) * pageSize, currentPage * pageSize
  );
  const totalPages = Math.ceil(filteredReports.length / pageSize);
  const columns = [
    { key: "Tarix", title: "Tarix" },
    { key: "Saat", title: "Saat" },
    { key: "Risk", title: "Kritiklik" },
    { key: "Regional İdarə", title: "Regional İdarə" },
    { key: "Rayon", title: "Rayon" },
    { key: "Müəssisə", title: "Müəssisə" },
    { key: "Əməkdaş", title: "Əməkdaş" },
    { key: "Ətraflı", title: "Ətraflı" },
    { key: "PDF", title: "PDF" },
    ...(user?.role === 'admin' ? [{ key: "Sil", title: "Sil" }] : [])
  ];

  const handleDeleteReport = async () => {
    // Şifrə yoxlanması (Firestore Rules server tərəfindən admin rolunu yoxlayır)
    if (deletePassword !== MASTER_PASSWORD) {
      setDeleteError('Master şifrə yanlışdır!');
      return;
    }
    try {
      await deleteDoc(doc(db, 'newMonitorinqHesabatlari', deleteModal.report.id));
      setAllReports(prev => prev.filter(r => r.id !== deleteModal.report.id));
      setDeleteModal({ open: false, report: null });
      setDeletePassword('');
      setDeleteError('');
    } catch (err) {
      console.error(err);
      const msg = err?.message || 'Silmə zamanı xəta baş verdi.';
      setDeleteError(msg);
    }
  };

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
  
  const regionalIdareler = useMemo(() => {
    return [...new Set(allReports.map(r => r.regionalIdare).filter(Boolean))];
  }, [allReports]);
  
  const rayonlar = useMemo(() => {
    let filteredReports = allReports;
    if (selectedRegional !== 'all') {
      filteredReports = filteredReports.filter(r => r.regionalIdare === selectedRegional);
    }
    return [...new Set(filteredReports.map(r => r.rayon).filter(Boolean))];
  }, [allReports, selectedRegional]);
  
  const mekteblerFilterList = useMemo(() => {
    let filteredReports = allReports;
    if (selectedRegional !== 'all') filteredReports = filteredReports.filter(r => r.regionalIdare === selectedRegional);
    if (selectedRayon !== 'all') filteredReports = filteredReports.filter(r => r.rayon === selectedRayon);
    const uniqueIds = [...new Set(filteredReports.map(r => r.bagcaId).filter(Boolean))];
    return uniqueIds.map(id => ({ 
        id, 
        adi: kindergartens.find(k => k.id === id)?.adi || 'Bilinməyən' 
    }));
  }, [allReports, kindergartens, selectedRegional, selectedRayon]);

  if (loading) return <div className="loading-screen">Hesabatlar yüklənir...</div>;
  const handleExportToExcel = (dataToExport, fileName) => {
    if (dataToExport.length === 0) {
        alert("İxrac etmək üçün məlumat yoxdur.");
        return;
    }
    
    // Excel üçün datanı ən yeni ən üstdə olmaqla (tarixə görə azalan) sıralayırıq
    const sortedData = [...dataToExport].sort((a, b) => {
        return new Date(b.gonderilmeTarixi) - new Date(a.gonderilmeTarixi);
    });

    const dataForExcel = sortedData.map(report => {
        let row = {
            'Tarix': new Date(report.gonderilmeTarixi).toLocaleDateString('az-AZ'),
            'Saat': new Date(report.gonderilmeTarixi).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' }),
            'Monitorinq Müddəti': new Date(report.monitorinqMuddeti * 1000).toISOString().substr(11, 8),
            'GPS Ünvan': `${report.gps?.lat || ''}, ${report.gps?.lon || ''}`,
            'Əməkdaş': report.authorEmail,
            'Regional Təhsil İdarəsi': report.regionalIdare,
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
        {/* --- STATISTIKA PANELI BURADA --- */}
      <div className="stats-panel">
  <div className="stat-card">
    <div className="stat-label">Ümumi Monitorinq</div>
    <div className="stat-value">{totalCount}</div>
    <div className="stat-hint">Seçilmiş dövrdə</div>
  </div>
  <div className="stat-card">
    <div className="stat-label">Ən çox mənfi cavab verilən sual</div>
    <div className="stat-value" style={{fontSize:'1.04em', fontWeight:600}}>
      {maxNoQuestion !== "-" ? maxNoQuestion : <span style={{fontWeight:400}}>Sual yoxdur</span>}
    </div>
    <div className="stat-hint">
      {maxNoQuestion !== "-" ? `Mənfi cavabın sayı: ${maxNoCount}` : ""}
    </div>
  </div>
</div>
        {/* --- STATISTIKA PANELI SON --- */}

        {/* Filtrlər və yeni UI */}
        <div className="filters-container">
          <div className="date-filters"><label>Başlanğıc Tarix:</label><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
          <div className="date-filters"><label>Son Tarix:</label><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
          
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
            <select value={selectedRegional} onChange={(e) => { setSelectedRegional(e.target.value); setSelectedRayon('all'); setSelectedMekteb('all'); setCurrentPage(1); }}>
              <option value="all">Bütün Regional İdarələr</option>
              {regionalIdareler.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <select value={selectedRayon} onChange={(e) => { setSelectedRayon(e.target.value); setSelectedMekteb('all'); setCurrentPage(1); }}>
              <option value="all">Bütün Rayonlar</option>
              {rayonlar.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <select value={selectedMekteb} onChange={(e) => { setSelectedMekteb(e.target.value); setCurrentPage(1); }}>
              <option value="all">Bütün Müəssisələr</option>
              {mekteblerFilterList.map(m => <option key={m.id} value={m.id}>{m.adi}</option>)}
            </select>
          </div>
          
          <div style={{ marginTop: '8px' }}>
          <input
            type="text"
            placeholder="Açar söz ilə axtar..."
            value={searchTerm}
            onChange={e => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            style={{ padding: 8, width: 200 }}
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
            Yalnız kritik (ən az 3 mənfi cavab) olanlar
          </label>
          </div>
          <div className="export-buttons-group">
            <button onClick={() => handleExportToExcel(filteredReports, 'Filtrli_Hesabat')} className="export-button">
              Filtrə uyğun Excel
            </button>
            <button onClick={() => handleExportToExcel(allReports, 'Umumi_Hesabat')} className="export-button general-export">
              Ümumi Excel
            </button>
            <button onClick={() => setMapOpen(true)} className="export-button" style={{background:'#38bdf8', color:'#fff'}}>
              Xəritədə Bax
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
                    {visibleColumns.includes("Regional İdarə") && <td>{report.regionalIdare}</td>}
                    {visibleColumns.includes("Rayon") && <td>{report.rayon}</td>}
                    {visibleColumns.includes("Müəssisə") && <td>{getKindergartenNameById(report.bagcaId)}</td>}
                    {visibleColumns.includes("Əməkdaş") && <td>{report.authorEmail}</td>}
                    {visibleColumns.includes("Ətraflı") && (
                      <td><button className="details-button" onClick={() => setSelectedReport(report)}>Bax</button></td>
                    )}
                    {visibleColumns.includes("PDF") && (
                      <td><button className="details-button pdf-button" onClick={() => setSelectedReportForAkt(report)}>PDF</button></td>
                    )}
                    {visibleColumns.includes("Sil") && (
                      <td>
                        <button
                          className="details-button"
                          style={{ backgroundColor: '#ef4444', color: 'white' }}
                          onClick={() => {
                            setDeleteModal({ open: true, report });
                            setDeletePassword('');
                            setDeleteError('');
                          }}
                        >
                          Sil
                        </button>
                      </td>
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
      {mapOpen && (
        <MapModal gpsList={gpsList} onClose={() => setMapOpen(false)} />
      )}

      {/* Master Şifrə ilə Silmə Dialoqu */}
      {deleteModal.open && (
        <div className="sidebar-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{
            backgroundColor: 'white', padding: '30px', borderRadius: '12px',
            width: '420px', maxWidth: '92%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🔐</div>
              <h3 style={{ margin: 0, color: '#1e293b' }}>Hesabatı Sil</h3>
              <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: '0.9rem' }}>
                <strong>{getKindergartenNameById(deleteModal.report?.bagcaId)}</strong> müəssisəsinin
                {deleteModal.report?.gonderilmeTarixi && ` ${new Date(deleteModal.report.gonderilmeTarixi).toLocaleDateString('az-AZ')} tarixli`} hesabatı silinəcək.
                Bu əməliyyat <strong style={{ color: '#ef4444' }}>GERİ ALINMAZ</strong>!
              </p>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                Hesabatı silmək üçün master şifrəni daxil edin:
              </label>
              <input
                type="password"
                value={deletePassword}
                onChange={e => { setDeletePassword(e.target.value); setDeleteError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleDeleteReport()}
                placeholder="Master şifrə..."
                autoFocus
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: '6px',
                  border: deleteError ? '2px solid #ef4444' : '1px solid #d1d5db',
                  fontSize: '1rem', outline: 'none', boxSizing: 'border-box'
                }}
              />
              {deleteError && (
                <p style={{ margin: '6px 0 0', color: '#ef4444', fontSize: '0.85rem' }}>❌ {deleteError}</p>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => { setDeleteModal({ open: false, report: null }); setDeletePassword(''); setDeleteError(''); }}
                style={{
                  flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db',
                  backgroundColor: 'white', cursor: 'pointer', fontWeight: 500
                }}
              >
                ← Geri
              </button>
              <button
                onClick={handleDeleteReport}
                style={{
                  flex: 1, padding: '10px', borderRadius: '6px', border: 'none',
                  backgroundColor: '#ef4444', color: 'white', cursor: 'pointer', fontWeight: 600
                }}
              >
                Hesabatı Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default NewMonitoringReportsPage;
