// src/AttendanceReportsPage.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import * as XLSX from 'xlsx';
import AttendanceDetailModal from './AttendanceDetailModal.jsx';

const AttendanceReportsPage = () => {
  const [allReports, setAllReports] = useState([]);
  const [kindergartens, setKindergartens] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtrlər
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedRayon, setSelectedRayon] = useState('all');

  // Cədvəl üçün
  const [sortConfig, setSortConfig] = useState({ key: 'tarix', direction: 'descending' });
  const [selectedReport, setSelectedReport] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const kgSnapshot = await getDocs(collection(db, "bagcalar"));
        setKindergartens(kgSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        const reportSnapshot = await getDocs(collection(db, "davamiyyet"));
        setAllReports(reportSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Hesabatlar yüklənərkən xəta:", error);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const getKindergartenNameById = (id) => kindergartens.find(k => k.id === id)?.adi || 'Bilinməyən';

  const sortedAndFilteredReports = useMemo(() => {
    let filtered = allReports.filter(report => {
      const reportDate = new Date(report.tarix);
      const start = startDate ? new Date(startDate) : null;
      if (start) start.setHours(0, 0, 0, 0);
      const end = endDate ? new Date(endDate) : null;
      if (end) end.setHours(23, 59, 59, 999);
      const dateFilterPassed = (!start || reportDate >= start) && (!end || reportDate <= end);
      const rayonFilterPassed = (selectedRayon === 'all' || report.rayon === selectedRayon);
      return dateFilterPassed && rayonFilterPassed;
    });

    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];
        
        if(sortConfig.key.startsWith('statistika.')) {
            const subKey = sortConfig.key.split('.')[1];
            aValue = a.statistika?.[subKey] || 0;
            bValue = b.statistika?.[subKey] || 0;
        }

        if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return filtered;
  }, [allReports, startDate, endDate, selectedRayon, sortConfig]);

  const kpiMetrics = useMemo(() => {
      if(sortedAndFilteredReports.length === 0) return { avgAttendance: 0, maxDeviation: { value: 0 }, worstRayon: { name: 'N/A' }, totalChecks: 0 };
      const totalChecks = sortedAndFilteredReports.length;
      let totalAttendancePercentage = 0;
      let maxDeviation = { value: -Infinity, kgName: '', date: '' };
      const rayonStats = {};
      sortedAndFilteredReports.forEach(r => {
          const stats = r.statistika || { qeydiyyatda: 0, faktiki: 0, qidaKenarlasmasi: 0 };
          if(stats.qeydiyyatda > 0) {
              totalAttendancePercentage += (stats.faktiki / stats.qeydiyyatda);
          }
          if(stats.qidaKenarlasmasi > maxDeviation.value) {
              maxDeviation = { value: stats.qidaKenarlasmasi, kgName: getKindergartenNameById(r.bagcaId), date: new Date(r.tarix).toLocaleDateString('az-AZ') };
          }
          if(!rayonStats[r.rayon]) rayonStats[r.rayon] = { total: 0, count: 0 };
          rayonStats[r.rayon].total += (stats.qeydiyyatda > 0 ? (stats.faktiki / stats.qeydiyyatda) : 0);
          rayonStats[r.rayon].count += 1;
      });
      const avgAttendance = totalChecks > 0 ? ((totalAttendancePercentage / totalChecks) * 100).toFixed(1) : 0;
      let worstRayon = { name: 'N/A', avg: 101 };
      Object.keys(rayonStats).forEach(r => {
          const avg = (rayonStats[r].total / rayonStats[r].count) * 100;
          if(avg < worstRayon.avg) worstRayon = { name: r, avg: avg.toFixed(1) };
      });
      return { avgAttendance, maxDeviation, worstRayon, totalChecks };
  }, [sortedAndFilteredReports]);

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

  // YENİLƏNMİŞ: Ümumi Excel ixrac funksiyası
  const exportToExcel = (data, fileName) => {
    if (data.length === 0) {
        alert("İxrac etmək üçün məlumat yoxdur.");
        return;
    }

    const dataForExcel = data.map(report => {
        const stats = report.statistika || {};
        return {
            'Tarix': new Date(report.tarix).toLocaleDateString('az-AZ'),
            'Saat': new Date(report.tarix).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' }),
            'Rayon': report.rayon,
            'Bağça': getKindergartenNameById(report.bagcaId),
            'Qeydiyyatda': stats.qeydiyyatda || 0,
            'Faktiki': stats.faktiki || 0,
            'Fərq': stats.ferq || 0,
            'Qida Sifarişi': report.sifarisEdilenQida,
            'Kənarlaşma': stats.qidaKenarlasmasi || 0,
            'Əməkdaş': report.authorEmail,
        };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Davamiyyət Hesabatları');
    
    const cols = Object.keys(dataForExcel[0]).map(key => ({
        wch: Math.max(15, key.length, ...dataForExcel.map(row => String(row[key]).length))
    }));
    worksheet["!cols"] = cols;

    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  };

  const rayonlar = [...new Set(kindergartens.map(kg => kg.rayon))];

  if (loading) return <div className="loading-screen">Hesabatlar yüklənir...</div>;

  return (
    <>
      <div className="reports-page-container">
        <h2>Məktəbəqədər - Davamiyyət Hesabatları</h2>
        <div className="kpi-dashboard">
            <div className="kpi-card"><h4>Orta Davamiyyət</h4><p>{kpiMetrics.avgAttendance}%</p></div>
            <div className="kpi-card"><h4>Maks. Qida Kənarlaşması</h4><p>{kpiMetrics.maxDeviation.value}</p><span>{kpiMetrics.maxDeviation.kgName} ({kpiMetrics.maxDeviation.date})</span></div>
            <div className="kpi-card"><h4>Ən Problemli Rayon</h4><p>{kpiMetrics.worstRayon.name}</p><span>{kpiMetrics.worstRayon.avg}% davamiyyət</span></div>
            <div className="kpi-card"><h4>Ümumi Yoxlama</h4><p>{kpiMetrics.totalChecks}</p><span>seçilmiş dövrdə</span></div>
        </div>
        <div className="filters-container">
          <div className="date-filters"><label>Başlanğıc Tarix:</label><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
          <div className="date-filters"><label>Son Tarix:</label><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
          <select value={selectedRayon} onChange={(e) => setSelectedRayon(e.target.value)}><option value="all">Bütün Rayonlar</option>{rayonlar.map(r => <option key={r} value={r}>{r}</option>)}</select>
          
          {/* YENİLƏNMİŞ: İki ayrı Excel düyməsi */}
          <div className="export-buttons-group">
            <button onClick={() => exportToExcel(sortedAndFilteredReports, 'Filtrli_Hesabat')} className="export-button">
              Filtrə uyğun Excel
            </button>
            <button onClick={() => exportToExcel(allReports, 'Umumi_Hesabat')} className="export-button general-export">
              Ümumi Excel
            </button>
          </div>
        </div>
        <div className="table-container">
          <table className="reports-table">
            <thead>
              <tr>
                <th onClick={() => requestSort('tarix')}>Tarix {getSortArrow('tarix')}</th>
                <th onClick={() => requestSort('tarix')}>Saat {getSortArrow('tarix')}</th>
                <th onClick={() => requestSort('rayon')}>Rayon {getSortArrow('rayon')}</th>
                <th>Bağça</th>
                <th onClick={() => requestSort('statistika.qeydiyyatda')}>Qeyd. {getSortArrow('statistika.qeydiyyatda')}</th>
                <th onClick={() => requestSort('statistika.faktiki')}>Faktiki {getSortArrow('statistika.faktiki')}</th>
                <th onClick={() => requestSort('statistika.ferq')}>Fərq {getSortArrow('statistika.ferq')}</th>
                <th onClick={() => requestSort('sifarisEdilenQida')}>Qida Sif. {getSortArrow('sifarisEdilenQida')}</th>
                <th onClick={() => requestSort('statistika.qidaKenarlasmasi')}>Kənarlaşma {getSortArrow('statistika.qidaKenarlasmasi')}</th>
                <th onClick={() => requestSort('authorEmail')}>Əməkdaş {getSortArrow('authorEmail')}</th>
                <th>Ətraflı</th>
              </tr>
            </thead>
            <tbody>
              {sortedAndFilteredReports.length > 0 ? (
                sortedAndFilteredReports.map(report => (
                  <tr key={report.id}>
                    <td>{new Date(report.tarix).toLocaleDateString('az-AZ')}</td>
                    <td>{new Date(report.tarix).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td>{report.rayon}</td>
                    <td>{getKindergartenNameById(report.bagcaId)}</td>
                    <td>{report.statistika?.qeydiyyatda || 0}</td>
                    <td>{report.statistika?.faktiki || 0}</td>
                    <td>{report.statistika?.ferq || 0}</td>
                    <td>{report.sifarisEdilenQida}</td>
                    <td className={report.statistika?.qidaKenarlasmasi !== 0 ? 'kenarlasma-ferqli' : ''}>{report.statistika?.qidaKenarlasmasi || 0}</td>
                    <td>{report.authorEmail}</td>
                    <td><button className="details-button" onClick={() => setSelectedReport(report)}>Bax</button></td>
                  </tr>
                ))
              ) : ( <tr><td colSpan="11">Filtrlərə uyğun hesabat tapılmadı.</td></tr> )}
            </tbody>
          </table>
        </div>
      </div>
      {selectedReport && (
        <AttendanceDetailModal 
            report={selectedReport} 
            kindergartenName={getKindergartenNameById(selectedReport.bagcaId)} 
            onClose={() => setSelectedReport(null)} 
        />
      )}
    </>
  );
};

export default AttendanceReportsPage;
