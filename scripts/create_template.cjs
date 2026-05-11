const xlsx = require("xlsx");
const path = require("path");

const headers = [
  "A - Regionlar (vergüllə)",
  "B - Ad Soyad",
  "C - Vəzifə",
  "D - Email (məcburi)",
  "E - Şifrə (boş qoysanız Mutda2025! olacaq)",
  "F - Rol (mtm_user / admin / subadmin)",
  "G - Görmə Səlahiyyəti (own / region / all)",
];

const exampleRows = [
  [
    "Bakı Şəhəri üzrə Təhsil İdarəsi",
    "Əli Əliyev",
    "Metodist",
    "ali.aliyev@bakuedu.info",
    "Sifre123!",
    "mtm_user",
    "own",
  ],
  [
    "Şirvan-Salyan Regional Təhsil İdarəsi, Quba-Xaçmaz Regional Təhsil İdarəsi",
    "Aytən Hüseynova",
    "Mütəxəssis",
    "ayten.huseynova@edu.info",
    "Sifre456!",
    "mtm_user",
    "region",
  ],
];

const wb = xlsx.utils.book_new();
const wsData = [headers, ...exampleRows];
const ws = xlsx.utils.aoa_to_sheet(wsData);

ws["!cols"] = [
  { wch: 55 }, { wch: 25 }, { wch: 20 },
  { wch: 35 }, { wch: 30 }, { wch: 15 }, { wch: 15 },
];

xlsx.utils.book_append_sheet(wb, ws, "Istifadeciler");

const outPath = path.join(__dirname, "users_import.xlsx");
xlsx.writeFile(wb, outPath);
console.log("✅ Şablon Excel yaradıldı:", outPath);
console.log("Faylı açıb nümunə sətirləri silin və öz məlumatlarınızı yazın.");
