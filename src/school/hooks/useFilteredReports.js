import { useMemo } from "react";
function filterCriticalReports(reports, minNoCount = 3) {
  return reports.filter(report =>
    (report.answers?.filter(ans => ans === "Xeyr").length || 0) >= minNoCount
  );
}
function searchReports(reports, searchTerm) {
  if (!searchTerm) return reports;
  return reports.filter(report => {
    const text =
      (report.answers ? report.answers.join(" ") : "") +
      " " +
      (report.notes ? report.notes.join(" ") : "") +
      (report.extraNotes ? report.extraNotes.join(" ") : "");
    return text.toLowerCase().includes(searchTerm.toLowerCase());
  });
}
export function useFilteredReports(allReports, searchTerm, showCriticalOnly) {
  return useMemo(() => {
    let data = [...allReports];
    if (showCriticalOnly) data = filterCriticalReports(data, 3);
    if (searchTerm) data = searchReports(data, searchTerm);
    return data;
  }, [allReports, searchTerm, showCriticalOnly]);
}
