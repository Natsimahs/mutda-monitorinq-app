import React, { useEffect, useMemo, useState, useRef } from "react";
import { collection, getDocs, doc, updateDoc, getDoc, query, where, setDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "./firebase";
import * as xlsx from 'xlsx';

const UserManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const fileInputRef = useRef(null);

  // Modal üçün state
  const [editingUser, setEditingUser] = useState(null);
  
  const [filterText, setFilterText] = useState("");

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
      const workbook = xlsx.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

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
         if (data.email) existingUsersMap.set(data.email.toLowerCase(), doc.id);
      });

      for (const row of newUsers) {
        const assignedRegions = row[0] ? row[0].split(',').map(s => s.trim()) : [];
        const fullName = row[1] || "";
        const position = row[2] || "";
        const email = String(row[3]).trim().toLowerCase();
        const password = row[4] ? String(row[4]).trim() : "123456"; // Default şifrə
        const role = "mtm_user"; 
        const viewScope = "own";

        try {
          const existingUid = existingUsersMap.get(email);

          if (existingUid) {
             // İstifadəçi mövcuddur, yalnız datanı yeniləyirik
             await setDoc(doc(db, "users", existingUid), {
               fullName,
               position,
               assignedRegions,
               viewScope: viewScope // mövcudları 'own' kimi yeniləyir və ya köhnəni qoruya bilərik
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>İstifadəçi İdarəetmə Mərkəzi</h2>
        <div>
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
                <td>
                  <button onClick={() => setEditingUser({
                    ...u,
                    assignedRegions: u.assignedRegions ? u.assignedRegions.join(', ') : ''
                  })} style={{ padding: '4px 8px', cursor: 'pointer', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px' }}>
                    Redaktə et
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
