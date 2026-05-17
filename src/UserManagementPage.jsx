import React, { useEffect, useMemo, useState, useRef } from "react";
import { collection, getDocs, doc, updateDoc, getDoc, query, where, setDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "./firebase";
import * as XLSX from 'xlsx';

const UserManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const fileInputRef = useRef(null);

  // Modal üçün state
  const [editingUser, setEditingUser] = useState(null);
  
  const [filterText, setFilterText] = useState("");

  // MTM (Bağça) İdxalı üçün state-lər
  const [activeTab, setActiveTab] = useState("users"); // 'users' və ya 'mtm'
  const mtmFileInputRef = useRef(null);
  const [mtmPreviewData, setMtmPreviewData] = useState([]);
  const [mtmProgress, setMtmProgress] = useState(null); // { current, total }

  const fetchRoles = async () => {
    const snap = await getDoc(doc(db, "settings", "roles"));
    if (snap.exists()) {
      const list = snap.data().roles || [];
      setRoles(list);
    } else {
      setRoles(['admin', 'subadmin', 'mtm_user', 'school_user', 'mekteb_monitor', 'istifadəçi']);
    }
  };

  const fetchUsers = async () => {
    const qs = await getDocs(collection(db, "users"));
    const list = qs.docs.map(d => ({ id: d.id, ...d.data() }));
    list.sort((a, b) => String(a.email || "").localeCompare(String(b.email || "")));
    setUsers(list);
  };

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      setLoadError("");
      try {
        await fetchRoles();
        await fetchUsers();
      } catch (e) {
        console.error(e);
        setLoadError(e?.message || "Yükləmə zamanı xəta baş verdi.");
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const handleRoleChange = async (userId, role) => {
    try {
      await updateDoc(doc(db, "users", userId), { role });
      setUsers(prev => prev.map(u => (u.id === userId ? { ...u, role } : u)));
    } catch (e) {
      console.error(e);
      alert("Rol dəyişərkən xəta oldu.");
    }
  };

  const handleDeleteUser = async (user) => {
    const confirmed = window.confirm(
      `"${user.fullName || user.email}" istifadəçisini sistemdən tamamilə silmək istəyirsiniz?\n\nBu əməliyyat GERİ ALINMAZ!`
    );
    if (!confirmed) return;

    setIsLoading(true);
    try {
      const authInstance = getAuth();
      const currentUser = authInstance.currentUser;
      const token = currentUser ? await currentUser.getIdToken() : null;

      const fn = httpsCallable(functions, "deleteUserByAdmin");
      await fn({ uid: user.id, token });

      setUsers(prev => prev.filter(u => u.id !== user.id));
      alert(`"${user.email}" uğurla silindi.`);
    } catch (err) {
      console.error(err);
      alert("Silmə zamanı xəta baş verdi: " + (err.message || ""));
    } finally {
      setIsLoading(false);
    }
  };

  // Dinamik Excel (.xlsx) şablon faylı yaradıb endirən funksiya
  const downloadTemplate = (type) => {
    let headers = [];
    let sampleData = [];
    let fileName = "";

    if (type === 'users') {
      headers = [["Regionlar (vergüllə)", "Ad Soyad", "Vəzifə", "Email", "Şifrə"]];
      sampleData = [
        ["Abşeron-Xızı Regional Təhsil İdarəsi", "Əliyev Əli", "Mütəxəssis", "ali.aliyev@bakuedu.info", "Ali78956"]
      ];
      fileName = "istifadeci_import_sablon.xlsx";
    } else if (type === 'mtm') {
      headers = [["Regional Təhsil İdarəsi", "Rayon", "Müəssisə"]];
      sampleData = [
        ["Abşeron-Xızı Regional Təhsil İdarəsi", "Abşeron rayonu", "Abşeron rayon Xırdalan şəhər 1 nömrəli körpələr evi-uşaq bağçası"]
      ];
      fileName = "mtm_import_sablon.xlsx";
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([...headers, ...sampleData]);
    XLSX.utils.book_append_sheet(wb, ws, "Şablon");
    XLSX.writeFile(wb, fileName);
  };

  // MTM üçün unikal SHA-1 ID hesablayan funksiya (browser nativ Web Crypto API)
  const makeMtmDocId = async (regional, rayon, adi) => {
    const key = `${regional}||${rayon}||${adi}`.toLowerCase().trim();
    const msgBuffer = new TextEncoder().encode(key);
    const hashBuffer = await window.crypto.subtle.digest('SHA-1', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  // MTM Excel/CSV faylını seçib parse edən funksiya
  const handleMtmExcelUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Başlığı ötürük, sətirləri təmizləyirik
      const parsed = jsonData.slice(1)
        .map((row, idx) => ({
          regionalIdare: row[0] ? String(row[0]).trim() : "",
          rayon: row[1] ? String(row[1]).trim() : "",
          adi: row[2] ? String(row[2]).trim() : "",
          line: idx + 2
        }))
        .filter(row => row.regionalIdare && row.rayon && row.adi);

      setMtmPreviewData(parsed);
      if (parsed.length === 0) {
        alert("Faylda etibarlı məlumat tapılmadı. Zəhmət olmasa şablon faylını yoxlayın.");
      }
    } catch (error) {
      console.error("MTM Excel xətası:", error);
      alert("Fayl oxunarkən xəta baş verdi.");
    } finally {
      setIsLoading(false);
      e.target.value = '';
    }
  };

  // MTM məlumatlarını Firestore-a toplu şəkildə yazan funksiya
  const handleMtmImportSubmit = async () => {
    if (mtmPreviewData.length === 0) return;

    if (!window.confirm(`${mtmPreviewData.length} müəssisə Firestore-a yüklənəcək/yenilənəcək. Davam edilsin?`)) {
      return;
    }

    setIsLoading(true);
    setMtmProgress({ current: 0, total: mtmPreviewData.length });

    let successCount = 0;
    let errorCount = 0;

    try {
      for (let i = 0; i < mtmPreviewData.length; i++) {
        const item = mtmPreviewData[i];
        try {
          const docId = await makeMtmDocId(item.regionalIdare, item.rayon, item.adi);
          await setDoc(doc(db, "bagcalar", docId), {
            regionalIdare: item.regionalIdare,
            rayon: item.rayon,
            adi: item.adi
          }, { merge: true });

          successCount++;
        } catch (err) {
          console.error("MTM yazılma xətası:", item, err);
          errorCount++;
        }
        setMtmProgress({ current: i + 1, total: mtmPreviewData.length });
      }

      alert(`Yükləmə tamamlandı!\nYazılan/Yenilənən: ${successCount}\nXəta: ${errorCount}`);
      setMtmPreviewData([]);
    } catch (err) {
      console.error("MTM bulk import failed:", err);
      alert("Toplu yükləmə zamanı xəta baş verdi.");
    } finally {
      setIsLoading(false);
      setMtmProgress(null);
    }
  };

  const handleExcelUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!window.confirm("Excel faylındakı istifadəçilər sistemə yüklənəcək. Davam etmək istəyirsiniz?")) {
      e.target.value = '';
      return;
    }

    setIsLoading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // A: Region, B: Ad Soyad, C: Vəzifə, D: Email, E: Şifrə
      const newUsers = jsonData.slice(1).filter(row => row[3]);

      let successCount = 0;
      let errorCount = 0;
      let updatedCount = 0;

      // Mövcud istifadəçiləri yoxlamaq üçün bazanı çəkirik
      const qs = await getDocs(collection(db, "users"));
      const existingUsersMap = new Map();
      qs.docs.forEach(doc => {
         const data = doc.data();
         if (data.email) {
           existingUsersMap.set(data.email.toLowerCase(), {
             id: doc.id,
             viewScope: data.viewScope || "own",
             role: data.role || "mtm_user"
           });
         }
      });

      for (const row of newUsers) {
        const assignedRegions = row[0] ? String(row[0]).split(',').map(s => s.trim()) : [];
        const fullName = row[1] || "";
        const position = row[2] || "";
        const email = String(row[3]).trim().toLowerCase();
        const password = row[4] ? String(row[4]).trim() : "123456"; // Default şifrə
        const role = "mtm_user"; 
        const viewScope = "own";

        try {
          const existingUser = existingUsersMap.get(email);

          if (existingUser) {
             // İstifadəçi mövcuddur, yalnız datanı yeniləyirik (viewScope və role-nu qoruyuruq)
             await setDoc(doc(db, "users", existingUser.id), {
               fullName,
               position,
               assignedRegions,
               viewScope: existingUser.viewScope
             }, { merge: true });
             updatedCount++;
          } else {
             // Yeni istifadəçi yarat
             const authInstance = getAuth();
             const currentUser = authInstance.currentUser;
             const token = currentUser ? await currentUser.getIdToken() : null;

             const fn = httpsCallable(functions, "createUserByAdmin");
             const res = await fn({ email, password, role, token });
             
             let uid = res?.data?.uid;
             if (!uid) {
                const q = query(collection(db, "users"), where("email", "==", email));
                const qsQuery = await getDocs(q);
                if (!qsQuery.empty) {
                  uid = qsQuery.docs[0].id;
                }
             }

             if (uid) {
               await setDoc(doc(db, "users", uid), {
                 email,
                 role,
                 fullName,
                 position,
                 assignedRegions,
                 viewScope,
                 isFirstLogin: true
               }, { merge: true });
               successCount++;
             } else {
                errorCount++;
             }
          }
        } catch(err) {
          console.error("İmport xətası:", email, err);
          errorCount++;
        }
      }

      alert(`Yükləmə tamamlandı!\nYeni yaradılan: ${successCount}\nYenilənən: ${updatedCount}\nXəta: ${errorCount}`);
      await fetchUsers();
    } catch (error) {
      console.error("Excel xətası:", error);
      alert("Fayl oxunarkən xəta baş verdi.");
    } finally {
      setIsLoading(false);
      e.target.value = '';
    }

  };

  const handleEditUserSubmit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    
    setIsLoading(true);
    try {
      // String to array for regions
      const assignedRegions = typeof editingUser.assignedRegions === 'string' 
        ? editingUser.assignedRegions.split(',').map(s => s.trim()).filter(Boolean)
        : editingUser.assignedRegions || [];

      await updateDoc(doc(db, "users", editingUser.id), {
        fullName: editingUser.fullName || "",
        position: editingUser.position || "",
        role: editingUser.role || "istifadəçi",
        viewScope: editingUser.viewScope || "own",
        assignedRegions: assignedRegions
      });
      
      setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, ...editingUser, assignedRegions } : u));
      setEditingUser(null);
    } catch (err) {
      console.error(err);
      alert("Yenilənmə zamanı xəta baş verdi.");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const t = filterText.trim().toLowerCase();
    if (!t) return users;
    return users.filter(u =>
      String(u.email || "").toLowerCase().includes(t) ||
      String(u.fullName || "").toLowerCase().includes(t) ||
      String(u.role || "").toLowerCase().includes(t) ||
      (u.assignedRegions && u.assignedRegions.join(',').toLowerCase().includes(t))
    );
  }, [users, filterText]);

  if (isLoading && users.length === 0) return <div className="loading-screen">Yüklənir...</div>;

  return (
    <div className="admin-page-container">
      {/* Premium dizayn üslubları */}
      <style>{`
        .settings-tabs {
          display: flex;
          gap: 16px;
          border-bottom: 2px solid #e2e8f0;
          padding-bottom: 12px;
          margin-bottom: 24px;
        }
        .settings-tab-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: none;
          border: none;
          font-size: 16px;
          font-weight: 600;
          color: #64748b;
          padding: 10px 20px;
          cursor: pointer;
          position: relative;
          transition: all 0.3s ease;
          border-radius: 8px;
        }
        .settings-tab-btn:hover {
          color: #1e293b;
          background-color: #f1f5f9;
        }
        .settings-tab-btn.active {
          color: #3b82f6;
          background-color: #eff6ff;
        }
        .settings-tab-btn.active::after {
          content: '';
          position: absolute;
          bottom: -14px;
          left: 0;
          width: 100%;
          height: 3px;
          background-color: #3b82f6;
          border-radius: 3px;
        }
        .mtm-import-card {
          background: #ffffff;
          border: 2px dashed #cbd5e1;
          border-radius: 12px;
          padding: 50px 20px;
          text-align: center;
          margin-bottom: 24px;
          transition: all 0.3s ease;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .mtm-import-card:hover {
          border-color: #3b82f6;
          background-color: #f8fafc;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.05);
        }
        .mtm-import-card svg {
          width: 48px;
          height: 48px;
          color: #94a3b8;
          transition: all 0.3s ease;
        }
        .mtm-import-card:hover svg {
          color: #3b82f6;
          transform: translateY(-2px);
        }
        .mtm-preview-table-container {
          background: white;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);
          overflow: hidden;
          margin-top: 24px;
        }
        .mtm-action-bar {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 24px;
        }
        .progress-bar-container {
          width: 100%;
          background-color: #e2e8f0;
          border-radius: 9999px;
          height: 8px;
          overflow: hidden;
          margin-top: 12px;
          margin-bottom: 24px;
        }
        .progress-bar-fill {
          background-color: #3b82f6;
          height: 100%;
          transition: width 0.1s ease;
        }
        .template-download-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          color: #475569;
          font-weight: 500;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 14px;
        }
        .template-download-btn:hover {
          background-color: #f1f5f9;
          color: #1e293b;
          border-color: #cbd5e1;
        }
      `}</style>

      {/* Tab Naviqasiyası */}
      <div className="settings-tabs">
        <button 
          className={`settings-tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 18, height: 18 }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A11.386 11.386 0 0 1 10.089 20a11.386 11.386 0 0 1-4.918-.763V19.12a4.125 4.125 0 0 1 7.536-2.484c.501.91.786 1.957.786 3.07M9 10.519a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm5-3.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z" />
          </svg>
          İstifadəçi İdarəetməsi
        </button>
        <button 
          className={`settings-tab-btn ${activeTab === 'mtm' ? 'active' : ''}`}
          onClick={() => setActiveTab('mtm')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 18, height: 18 }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
          </svg>
          Müəssisələrin (MTM) İdxalı
        </button>
      </div>

      {activeTab === 'users' ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>İstifadəçi İdarəetmə Mərkəzi</h2>
            <div style={{ display: 'flex', gap: '10px' }}>
               <button 
                 className="template-download-btn"
                 onClick={() => downloadTemplate('users')}
               >
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 16, height: 16 }}>
                   <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                 </svg>
                 Şablonu Yüklə (.xlsx)
               </button>
               <input 
                 type="file" 
                 accept=".xlsx, .xls" 
                 style={{ display: 'none' }} 
                 ref={fileInputRef}
                 onChange={handleExcelUpload} 
               />
               <button 
                 className="login-button" 
                 style={{ backgroundColor: '#10b981', width: 'auto', padding: '10px 20px', margin: 0 }}
                 onClick={() => fileInputRef.current.click()}
                 disabled={isLoading}
               >
                 {isLoading ? "Yüklənir..." : "Excel-dən İmport Et"}
               </button>
            </div>
          </div>

          <div className="management-container" style={{ marginBottom: 10 }}>
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Axtar: email / ad / rol / region"
              className="role-select"
              style={{ width: "100%" }}
            />
          </div>

          <div className="management-container" style={{ overflowX: 'auto' }}>
            <table className="management-table">
              <thead>
                <tr>
                  <th>Ad Soyad</th>
                  <th>Email</th>
                  <th>Vəzifə</th>
                  <th>Regionlar</th>
                  <th>Görmə Səlahiyyəti</th>
                  <th>Rol</th>
                  <th>Əməliyyat</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u.id}>
                    <td>{u.fullName || "-"}</td>
                    <td>{u.email || "-"}</td>
                    <td>{u.position || "-"}</td>
                    <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={u.assignedRegions?.join(', ')}>
                      {u.assignedRegions && u.assignedRegions.length > 0 ? u.assignedRegions.join(', ') : 'Bütün regionlar / Yoxdur'}
                    </td>
                    <td>
                      {u.viewScope === 'all' ? 'Bütün hesabatlar' : u.viewScope === 'region' ? 'Təyin olunmuş region' : 'Yalnız öz hesabatları'}
                    </td>
                    <td>
                      <select value={u.role || ""} onChange={(e) => handleRoleChange(u.id, e.target.value)}>
                        {roles.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </td>
                    <td style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <button onClick={() => setEditingUser({
                        ...u,
                        assignedRegions: u.assignedRegions ? u.assignedRegions.join(', ') : ''
                      })} style={{ padding: '4px 8px', cursor: 'pointer', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px' }}>
                        Redaktə et
                      </button>
                      <button onClick={() => handleDeleteUser(u)} style={{ padding: '4px 8px', cursor: 'pointer', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px' }}>
                        Sil
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: "center", opacity: 0.8 }}>Nəticə tapılmadı.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>Müəssisələrin (MTM) Excel İdxal Mərkəzi</h2>
            <button 
              className="template-download-btn"
              onClick={() => downloadTemplate('mtm')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 16, height: 16 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Şablonu Yüklə (.xlsx)
            </button>
          </div>

          {mtmProgress ? (
            <div style={{ background: 'white', padding: '30px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: '#1e293b' }}>Müəssisələr Firestore-a İdxal Edilir...</h3>
              <p style={{ margin: '8px 0', color: '#64748b' }}>Yazılır: {mtmProgress.current} / {mtmProgress.total}</p>
              <div className="progress-bar-container">
                <div className="progress-bar-fill" style={{ width: `${(mtmProgress.current / mtmProgress.total) * 100}%` }}></div>
              </div>
            </div>
          ) : (
            <>
              <input 
                type="file" 
                accept=".xlsx, .xls, .csv" 
                style={{ display: 'none' }} 
                ref={mtmFileInputRef}
                onChange={handleMtmExcelUpload} 
              />
              <div className="mtm-import-card" onClick={() => mtmFileInputRef.current.click()}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                <span style={{ fontSize: '18px', fontWeight: 600, color: '#334155' }}>
                  Excel və ya CSV faylı seçin
                </span>
                <span style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
                  Dəstəklənən formatlar: .xlsx, .xls, .csv
                </span>
              </div>
            </>
          )}

          {mtmPreviewData.length > 0 && !mtmProgress && (
            <>
              <div className="mtm-action-bar">
                <button 
                  onClick={() => setMtmPreviewData([])}
                  style={{ padding: '10px 20px', cursor: 'pointer', border: '1px solid #e2e8f0', borderRadius: '6px', background: 'white', fontWeight: 600 }}
                  disabled={isLoading}
                >
                  Təmizlə
                </button>
                <button 
                  onClick={handleMtmImportSubmit}
                  style={{ padding: '10px 20px', cursor: 'pointer', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600 }}
                  disabled={isLoading}
                >
                  Bazaya Yaz ({mtmPreviewData.length} Müəssisə)
                </button>
              </div>

              <div className="mtm-preview-table-container">
                <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: 600, fontSize: '15px' }}>
                  Fayldan oxunan məlumatlar (Öncədən Baxış)
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="management-table" style={{ margin: 0, border: 'none' }}>
                    <thead>
                      <tr>
                        <th style={{ background: '#f8fafc' }}>Sətir</th>
                        <th style={{ background: '#f8fafc' }}>Regional Təhsil İdarəsi</th>
                        <th style={{ background: '#f8fafc' }}>Rayon</th>
                        <th style={{ background: '#f8fafc' }}>Müəssisə Adı</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mtmPreviewData.map((row, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: 500, color: '#64748b' }}>{row.line}</td>
                          <td>{row.regionalIdare}</td>
                          <td>{row.rayon}</td>
                          <td>{row.adi}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Edit Modal */}
      {editingUser && (
        <div className="sidebar-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '8px', width: '500px', maxWidth: '90%' }}>
            <h3 style={{ marginTop: 0 }}>İstifadəçi Tənzimləmələri: {editingUser.email}</h3>
            <form onSubmit={handleEditUserSubmit} style={{ display: "grid", gap: 15 }}>
              <div>
                <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>Ad və Soyad</label>
                <input type="text" className="role-select" style={{ width: "100%" }} value={editingUser.fullName || ''} onChange={e => setEditingUser({...editingUser, fullName: e.target.value})} />
              </div>
              <div>
                <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>Vəzifə</label>
                <input type="text" className="role-select" style={{ width: "100%" }} value={editingUser.position || ''} onChange={e => setEditingUser({...editingUser, position: e.target.value})} />
              </div>
              <div>
                <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>Təhkim Olunmuş Regionlar (vergüllə ayırın)</label>
                <input type="text" className="role-select" style={{ width: "100%" }} placeholder="Məs: Bakı, Şirvan-Salyan" value={editingUser.assignedRegions || ''} onChange={e => setEditingUser({...editingUser, assignedRegions: e.target.value})} />
              </div>
              <div>
                <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>Hesabat Görmə Səlahiyyəti</label>
                <select className="role-select" style={{ width: "100%" }} value={editingUser.viewScope || 'own'} onChange={e => setEditingUser({...editingUser, viewScope: e.target.value})}>
                  <option value="own">Yalnız öz yaratdığı hesabatları</option>
                  <option value="region">Təhkim olunmuş regionun BÜTÜN hesabatlarını</option>
                  <option value="all">Sistemdəki BÜTÜN hesabatları</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setEditingUser(null)} style={{ padding: '8px 16px', cursor: 'pointer', border: '1px solid #ccc', borderRadius: '4px', background: 'white' }}>Ləğv et</button>
                <button type="submit" style={{ padding: '8px 16px', cursor: 'pointer', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '4px' }} disabled={isLoading}>Yadda saxla</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementPage;
