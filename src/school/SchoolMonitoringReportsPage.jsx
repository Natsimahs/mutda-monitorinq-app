// src/school/SchoolMonitoringReportsPage.jsx
import React, { useState, useEffect, useMemo } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import * as XLSX from "xlsx";

import SchoolMonitoringDetailModal from "./SchoolMonitoringDetailModal.jsx";
import SchoolAktPDFModal from "./SchoolAktPDFModal.jsx";
import schoolMonitoringQuestions from "./schoolMonitoringQuestions";
import { useFilteredReports } from "./hooks/useFilteredReports";
import SchoolMapModal from "./SchoolMapModal.jsx";

function getRiskLevel(report) {
  const count = report.answers?.filter((a) => a === "Xeyr").length || 0;
  if (count >= 3) return "🔴";
  if (count >= 1) return "🟡";
  return "🟢";
}

const pageSize = 20;

const SchoolMonitoringReportsPage = ({ user }) => {
  const [allReports, setAllReports] = useState([]);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedRayon, setSelectedRayon] = useState("all");
  const [sortConfig, setSortConfig] = useState({
    key: "gonderilmeTarixi",
    direction: "descending",
  });

  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedReportForAkt, setSelectedReportForAkt] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [showCriticalOnly, setShowCriticalOnly] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);

  const [visibleColumns, setVisibleColumns] = useState([
    "Tarix",
    "Saat",
    "Risk",
    "Rayon",
    "Müəssisə",
    "Əməkdaş",
    "Ətraflı",
    "PDF",
  ]);

  const [mapOpen, setMapOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Məktəblər
        const schoolSnapshot = await getDocs(collection(db, "mektebler"));
        setSchools(schoolSnapshot.docs.map((d) => ({ id: d.id, ...d.data() })));

        // Hesabatlar
        const reportsCol = collection(db, "newMektebMonitorinqHesabatlari");

        if (user?.role === "admin") {
          const reportSnapshot = await getDocs(reportsCol);
          setAllReports(reportSnapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        } else {
          const uid = user?.uid || "";
          const emailRaw = (user?.email || "").trim();
          const emailLower = emailRaw.toLowerCase();

          const requests = [];
          if (uid) requests.push(getDocs(query(reportsCol, where("authorId", "==", uid))));
          if (emailRaw) requests.push(getDocs(query(reportsCol, where("authorEmail", "==", emailRaw))));
          if (emailLower && emailLower !== emailRaw) {
            requests.push(getDocs(query(reportsCol, where("authorEmail", "==", emailLower))));
          }

          const results = await Promise.all(requests);
          const merged = new Map();
          results.forEach((snap) => {
            snap.forEach((docSnap) => merged.set(docSnap.id, { id: docSnap.id, ...docSnap.data() }));
          });

          setAllReports(Array.from(merged.values()));
        }
      } catch (error) {
        console.error("Hesabatlar yüklənərkən xəta:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // *** ƏSAS DÜZƏLİŞ: bu funksiya əvvəldən çağırıldığı üçün mütləq mövcud olmalıdır ***
  const getSchoolNameById = (id) => {
    if (!id) return "Bilinməyən";
    return schools.find((s) => s.id === id)?.adi || "Bilinməyən";
  };

  const filteredByDateAndRayon = useMemo(() => {
    let filtered = allReports.filter((report) => {
      const reportDate = new Date(report.gonderilmeTarixi);

      const start = startDate ? new Date(startDate) : null;
      if (start) start.setHours(0, 0, 0, 0);

      const end = endDate ? new Date(endDate) : null;
      if (end) end.setHours(23, 59, 59, 999);

      const dateFilterPassed = (!start || reportDate >= start) && (!end || reportDate <= end);
      const rayonFilterPassed = selectedRayon === "all" || report.rayon === selectedRayon;

      return dateFilterPassed && rayonFilterPassed;
    });

    if (sortConfig.key) {
      filtered.sort((a, b) => {
        const aValue = a?.[sortConfig.key] ?? "";
        const bValue = b?.[sortConfig.key] ?? "";
        if (aValue < bValue) return sortConfig.direction === "ascending" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "ascending" ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [allReports, startDate, endDate, selectedRayon, sortConfig]);

  const filteredReports = useFilteredReports(filteredByDateAndRayon, searchTerm, showCriticalOnly);

  // Statistika
  const totalCount = filteredReports.length;

  const questionNoCounts = Array(schoolMonitoringQuestions.length).fill(0);
  filteredReports.forEach((r) => {
    (r.answers || []).forEach((ans, i) => {
      if (ans === "Xeyr") questionNoCounts[i]++;
    });
  });
  const maxNoCount = Math.max(...questionNoCounts);
  const maxNoIndex = questionNoCounts.findIndex((v) => v === maxNoCount);
  const maxNoQuestion = maxNoCount > 0 ? schoolMonitoringQuestions[maxNoIndex] : "-";

  const gpsList = filteredReports
    .filter((r) => r.gps && r.gps.lat && r.gps.lon)
    .map((r) => ({
      lat: r.gps.lat,
      lon: r.gps.lon,
      title: getSchoolNameById(r.mektebId),
      id: r.id,
    }));

  const paginatedReports = filteredReports.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalPages = Math.max(1, Math.ceil(filteredReports.length / pageSize));

  const columns = [
    { key: "Tarix", title: "Tarix" },
    { key: "Saat", title: "Saat" },
    { key: "Risk", title: "Kritiklik" },
    { key: "Rayon", title: "Rayon" },
    { key: "Müəssisə", title: "Müəssisə" },
    { key: "Əməkdaş", title: "Əməkdaş" },
    { key: "Ətraflı", title: "Ətraflı" },
    { key: "PDF", title: "PDF" },
  ];

  function handleColumnToggle(columnKey) {
    setVisibleColumns((prev) =>
      prev.includes(columnKey) ? prev.filter((c) => c !== columnKey) : [...prev, columnKey]
    );
  }

  const rayonlar = [...new Set((schools || []).map((s) => s?.rayon).filter(Boolean))];

  const handleExportToExcel = (dataToExport, fileName) => {
    if (!dataToExport || dataToExport.length === 0) {
      alert("İxrac etmək üçün məlumat yoxdur.");
      return;
    }

    const dataForExcel = dataToExport.map((report) => {
      const durationSec = Number(report.monitorinqMuddeti || 0);
      const durationStr = new Date(durationSec * 1000).toISOString().substr(11, 8);

      const row = {
        Tarix: new Date(report.gonderilmeTarixi).toLocaleDateString("az-AZ"),
        Saat: new Date(report.gonderilmeTarixi).toLocaleTimeString("az-AZ", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        "Monitorinq Müddəti": durationStr,
        "GPS Ünvan": `${report.gps?.lat || ""}, ${report.gps?.lon || ""}`,
        Əməkdaş: report.authorEmail,
        Rayon: report.rayon,
        Müəssisə: getSchoolNameById(report.mektebId),
        "Uşaq Tutumu": report.usaqTutumu,
        "MTİS üzrə Uşaq Sayı": report.mtisUsaqSayi,
        "Sifariş Edilən Qida": report.sifarisEdilenQida,
        "Faktiki Uşaq Sayı": report.faktikiUsaqSayi,
      };

      schoolMonitoringQuestions.forEach((question, index) => {
        row[question] = report.answers?.[index] || "N/A";
        row[`Qeyd (${question})`] = report.notes?.[index] || "";
      });

      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Monitorinq Hesabatları");

    const cols = Object.keys(dataForExcel[0]).map((key) => ({ wch: Math.max(20, key.length) }));
    worksheet["!cols"] = cols;

    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  };

  if (loading) return <div className="loading-screen">Hesabatlar yüklənir...</div>;

  return (
    <>
      <div className="reports-page-container">
        <h2>Müəssisələr üzrə Monitorinq Hesabatları</h2>

        <div className="stats-panel">
          <div className="stat-card">
            <div className="stat-label">Ümumi Monitorinq</div>
            <div className="stat-value">{totalCount}</div>
            <div className="stat-hint">Seçilmiş dövrdə</div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Ən çox “Xeyr” cavabı verilən sual</div>
            <div className="stat-value" style={{ fontSize: "1.04em", fontWeight: 600 }}>
              {maxNoQuestion !== "-" ? maxNoQuestion : <span style={{ fontWeight: 400 }}>Sual yoxdur</span>}
            </div>
            <div className="stat-hint">{maxNoQuestion !== "-" ? `"Xeyr" cavabının sayı: ${maxNoCount}` : ""}</div>
          </div>
        </div>

        <div className="filters-container">
          <div className="date-filters">
            <label>Başlanğıc Tarix:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <div className="date-filters">
            <label>Son Tarix:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <select
            value={selectedRayon}
            onChange={(e) => {
              setSelectedRayon(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="all">Bütün Rayonlar</option>
            {rayonlar.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Açar söz ilə axtar..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            style={{ padding: 8, marginLeft: 16, width: 200 }}
          />

          <label style={{ marginLeft: 8 }}>
            <input
              type="checkbox"
              checked={showCriticalOnly}
              onChange={(e) => {
                setShowCriticalOnly(e.target.checked);
                setCurrentPage(1);
              }}
            />
            Yalnız ən az 3 "Xeyr" olanlar
          </label>

          <div className="export-buttons-group">
            <button onClick={() => handleExportToExcel(filteredReports, "Filtrli_Hesabat")} className="export-button">
              Filtrə uyğun Excel
            </button>
            <button onClick={() => handleExportToExcel(allReports, "Umumi_Hesabat")} className="export-button general-export">
              Ümumi Excel
            </button>
            <button
              onClick={() => setMapOpen(true)}
              className="export-button"
              style={{ background: "#38bdf8", color: "#fff" }}
            >
              Xəritədə Bax
            </button>
          </div>
        </div>

        <div style={{ margin: "12px 0" }}>
          Sütunlar:
          {columns.map((col) => (
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

        <div className="table-container">
          <table className="reports-table">
            <thead>
              <tr>
                {columns
                  .filter((col) => visibleColumns.includes(col.key))
                  .map((col) => (
                    <th key={col.key}>{col.title}</th>
                  ))}
              </tr>
            </thead>

            <tbody>
              {paginatedReports.length > 0 ? (
                paginatedReports.map((report) => (
                  <tr key={report.id}>
                    {visibleColumns.includes("Tarix") && (
                      <td>{new Date(report.gonderilmeTarixi).toLocaleDateString("az-AZ")}</td>
                    )}
                    {visibleColumns.includes("Saat") && (
                      <td>
                        {new Date(report.gonderilmeTarixi).toLocaleTimeString("az-AZ", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    )}
                    {visibleColumns.includes("Risk") && <td>{getRiskLevel(report)}</td>}
                    {visibleColumns.includes("Rayon") && <td>{report.rayon}</td>}
                    {visibleColumns.includes("Müəssisə") && <td>{getSchoolNameById(report.mektebId)}</td>}
                    {visibleColumns.includes("Əməkdaş") && <td>{report.authorEmail}</td>}

                    {visibleColumns.includes("Ətraflı") && (
                      <td>
                        <button className="details-button" onClick={() => setSelectedReport(report)}>
                          Bax
                        </button>
                      </td>
                    )}

                    {visibleColumns.includes("PDF") && (
                      <td>
                        <button className="details-button pdf-button" onClick={() => setSelectedReportForAkt(report)}>
                          PDF
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length}>Filtrlərə uyğun hesabat tapılmadı.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ margin: 16 }}>
          Səhifə: {currentPage} / {totalPages}{" "}
          <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
            &lt; Prev
          </button>
          <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
            Next &gt;
          </button>
        </div>

        <div>Cəmi hesabat: {filteredReports.length}</div>
      </div>

      {selectedReport && (
        <SchoolMonitoringDetailModal
          report={selectedReport}
          schoolName={getSchoolNameById(selectedReport.mektebId)}
          onClose={() => setSelectedReport(null)}
        />
      )}

      {selectedReportForAkt && (
        <SchoolAktPDFModal
          report={selectedReportForAkt}
          schoolName={getSchoolNameById(selectedReportForAkt.mektebId)}
          onClose={() => setSelectedReportForAkt(null)}
        />
      )}

      {mapOpen && <SchoolMapModal gpsList={gpsList} onClose={() => setMapOpen(false)} />}
    </>
  );
};

export default SchoolMonitoringReportsPage;
