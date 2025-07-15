// src/ReportsPage.jsx

import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';
import * as XLSX from 'xlsx';
import ReportDetailModal from './ReportDetailModal';

const monitoringQuestions = [ "Giriş-çıxış nəzarəti mövcuddurmu?", "Həyətyanı sahənin təmizliyinə riayət olunurmu?", "Dəhliz və otaqlarda təmizliyə riayət olunurmu?", "Sanitar qovşaqlarda təmizliyə riayət olunurmu?", "Gigiyenik vasitələrlə təmin edilib və təyinatı üzrə istifadə olunurmu?", "Mətbəxdə sanitar-gigiyenik qaydalara riayət olunurmu?", "Yemək menyusu ilə uyğundurmu?", "Vaxtı keçmiş qida məhsulları aşkar edilməmişdir?", "İnventar kitablanmada qeydiyyatı aparılırmı?", "Təsərrüfat mallarının uçotu jurnalı var və işləkdirmi?", "Texniki işçilərin iş bölgüsü var və riayət olunurmu?", "Texniki işçilərlə işə davamiyyət jurnalında qeydiyyat aparılırmı?" ];

// user obyekti App.jsx-dən ötürüləcək
const ReportsPage = ({ user }) => { 
  const [allReports, setAllReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    const fetchReports = async () => {
      if (!user || !user.role) return; // İstifadəçi və ya rolu yoxdursa, heç nə etmə

      setLoading(true);
      try {
        let reportsQuery;
        const reportsCollection = collection(db, 'monitorinqHesabatlari');

        // ROLA GÖRƏ SORĞU DƏYİŞİKLİYİ
        if (user.role === 'admin' || user.role === 'subadmin') {
          // Admin və Subadmin bütün hesabatları görür
          reportsQuery = query(reportsCollection);
        } else {
          // Adi istifadəçi yalnız öz hesabatlarını görür
          reportsQuery = query(reportsCollection, where("authorId", "==", user.uid));
        }

        const querySnapshot = await getDocs(reportsQuery);
        const reportsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAllReports(reportsData);
        setFilteredReports(reportsData);
      } catch (error) {
        console.error("Hesabatları çəkərkən xəta:", error);
        alert("Məlumatlar yüklənərkən xəta baş verdi.");
      }
      setLoading(false);
    };

    fetchReports();
  }, [user]); // user dəyişdikdə yenidən məlumatları çək

  // ... (useEffect for filtering and handleExportToExcel are unchanged) ...
  useEffect(() => { let reports = [...allReports]; if (searchTerm) { reports = reports.filter(report => report.muessise?.toLowerCase().includes(searchTerm.toLowerCase()) || report.rayon?.toLowerCase().includes(searchTerm.toLowerCase()) ); } if (startDate && endDate) { const start = new Date(startDate); const end = new Date(endDate); end.setHours(23, 59, 59, 999); reports = reports.filter(report => { const reportDate = new Date(report.gonderilmeTarixi); return reportDate >= start && reportDate <= end; }); } setFilteredReports(reports); }, [searchTerm, startDate, endDate, allReports]);
  const handleExportToExcel = () => { const dataForExcel = filteredReports.map(report => { const row = { 'Göndərilmə Tarixi': new Date(report.gonderilmeTarixi).toLocaleString('az-AZ'), 'Rayon': report.rayon, 'Müəssisə': report.muessise, 'Faktiki Uşaq Sayı': report.faktikiUsaqSayi, 'Göndərən': report.authorEmail, }; monitoringQuestions.forEach((question, index) => { const qKey = `q${index + 1}`; const answerData = report[qKey]; row[`Sual ${index + 1}`] = answerData?.answer || 'N/A'; row[`Qeyd ${index + 1}`] = answerData?.note || ''; }); return row; }); const worksheet = XLSX.utils.json_to_sheet(dataForExcel); const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, worksheet, 'Hesabatlar'); XLSX.writeFile(workbook, 'Monitorinq_Hesabatları.xlsx'); };

  if (loading) {
    return <div className="loading-screen">Hesabatlar yüklənir...</div>;
  }

  return (
    <>
      <div className="reports-page-container">
        <h2>Göndərilmiş Monitorinq Hesabatları</h2>
        {/* ... (filters container is unchanged) ... */}
        <div className="filters-container"> <input type="text" placeholder="Müəssisə və ya rayona görə axtar..." className="search-input" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /> <div className="date-filters"> <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /> <span>-</span> <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /> </div> <button onClick={handleExportToExcel} className="export-button">Excel olaraq yüklə</button> </div>
        <div className="table-container">
          {/* ... (table is unchanged) ... */}
          <table className="reports-table"> <thead> <tr> <th>Tarix</th> <th>Müəssisə</th> <th>Sual 1</th> <th>Sual 2</th> <th>Sual 3</th> <th>Sual 4</th> <th>Sual 5</th> <th>Sual 6</th> <th>Sual 7</th> <th>Sual 8</th> <th>Ətraflı</th> </tr> </thead> <tbody> {filteredReports.length > 0 ? ( filteredReports.map(report => ( <tr key={report.id}> <td>{new Date(report.gonderilmeTarixi).toLocaleDateString('az-AZ')}</td> <td>{report.muessise}</td> <td>{report.q1?.answer || 'N/A'}</td> <td>{report.q2?.answer || 'N/A'}</td> <td>{report.q3?.answer || 'N/A'}</td> <td>{report.q4?.answer || 'N/A'}</td> <td>{report.q5?.answer || 'N/A'}</td> <td>{report.q6?.answer || 'N/A'}</td> <td>{report.q7?.answer || 'N/A'}</td> <td>{report.q8?.answer || 'N/A'}</td> <td> <button className="details-button" onClick={() => setSelectedReport(report)}> Bax </button> </td> </tr> )) ) : ( <tr> <td colSpan="11">Filtrlərə uyğun hesabat tapılmadı.</td> </tr> )} </tbody> </table>
        </div>
      </div>
      {selectedReport && (
        <ReportDetailModal report={selectedReport} onClose={() => setSelectedReport(null)} />
      )}
    </>
  );
};

export default ReportsPage;
