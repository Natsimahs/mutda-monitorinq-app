// src/AttendanceReportsPage.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import * as XLSX from 'xlsx';

const AttendanceReportsPage = () => {
  const [allReports, setAllReports] = useState([]);
  const [kindergartens, setKindergartens] = useState([]);
  const [loading, setLoading] = useState(true);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedRayon, setSelectedRayon] = useState('all');

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
        alert("Məlumatlar yüklənərkən xəta baş verdi.");
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const filteredReports = useMemo(() => {
    return allReports.filter(report => {
      const reportDate = new Date(report.tarix);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;
      if (end) end.setHours(23, 59, 59, 999);

      const dateFilterPassed = (!start || reportDate >= start) && (!end || reportDate <= end);
      const rayonFilterPassed = (selectedRayon === 'all' || report.rayon === selectedRayon);

      return dateFilterPassed && rayonFilterPassed;
    });
  }, [allReports, startDate, endDate, selectedRayon]);
  
  const getKindergartenNameById = (id) => {
    const kg = kindergartens.find(k => k.id === id);
    return kg ? kg.adi : 'Bilinməyən Bağça';
  };

  const handleExportToExcel = () => {
    const dataForExcel = filteredReports.map(report => {
        const stats = report.statistika || {};
        return {
            'Tarix': new Date(report.tarix).toLocaleDateString('az-AZ'),
            'Rayon': report.rayon,
            'Bağça': getKindergartenNameById(report.bagcaId),
            'Qeydiyyatda olan uşaq sayı': stats.qeydiyyatda,
            'Faktiki uşaq sayı': stats.faktiki,
            'Fərq': stats.ferq,
            'Sifariş edilən qida': report.sifarisEdilenQida,
            'Qida kənarlaşması': stats.qidaKenarlasmasi,
            'Qeyd edən əməkdaş': report.authorEmail,
        };
    });

    if (dataForExcel.length === 0) {
        alert("İxrac etmək üçün məlumat yoxdur.");
        return;
    }

    const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Davamiyyət Hesabatları');
    XLSX.writeFile(workbook, 'Davamiyyet_Hesabatları.xlsx');
  };

  const rayonlar = [...new Set(kindergartens.map(kg => kg.rayon))];

  if (loading) {
    return <div className="loading-screen">Hesabatlar yüklənir...</div>;
  }

  return (
    <div className="reports-page-container">
      <h2>Məktəbəqədər - Davamiyyət Hesabatları</h2>
      <div className="filters-container">
        <div className="date-filters">
          <label>Başlanğıc Tarix:</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="date-filters">
          <label>Son Tarix:</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <select value={selectedRayon} onChange={(e) => setSelectedRayon(e.target.value)}>
            <option value="all">Bütün Rayonlar</option>
            {rayonlar.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <button onClick={handleExportToExcel} className="export-button">
          Excel olaraq yüklə
        </button>
      </div>

      <div className="table-container">
        <table className="reports-table">
          <thead>
            <tr>
              <th>Tarix</th>
              <th>Rayon</th>
              <th>Bağça</th>
              <th>Qeydiyyatda</th>
              <th>Faktiki</th>
              <th>Fərq</th>
              <th>Qida Sifarişi</th>
              <th>Kənarlaşma</th>
            </tr>
          </thead>
          <tbody>
            {filteredReports.length > 0 ? (
              filteredReports.map(report => (
                <tr key={report.id}>
                  <td>{new Date(report.tarix).toLocaleDateString('az-AZ')}</td>
                  <td>{report.rayon}</td>
                  <td>{getKindergartenNameById(report.bagcaId)}</td>
                  <td>{report.statistika?.qeydiyyatda || 0}</td>
                  <td>{report.statistika?.faktiki || 0}</td>
                  <td>{report.statistika?.ferq || 0}</td>
                  <td>{report.sifarisEdilenQida}</td>
                  <td className={report.statistika?.qidaKenarlasmasi !== 0 ? 'kenarlasma-ferqli' : ''}>
                    {report.statistika?.qidaKenarlasmasi || 0}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8">Filtrlərə uyğun hesabat tapılmadı.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AttendanceReportsPage;
