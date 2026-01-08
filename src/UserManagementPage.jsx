import React, { useEffect, useMemo, useState } from "react";
import { collection, getDocs, doc, updateDoc, getDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "./firebase";

const UserManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Yeni user yaratmaq üçün
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createMsg, setCreateMsg] = useState("");
  const [createErr, setCreateErr] = useState("");

  const [filterText, setFilterText] = useState("");

  const fetchRoles = async () => {
    const snap = await getDoc(doc(db, "settings", "roles"));
    if (!snap.exists()) {
      throw new Error('settings/roles sənədi tapılmadı. Firestore-da settings → roles yaradın.');
    }
    const list = snap.data().roles || [];
    if (!Array.isArray(list) || list.length === 0) {
      throw new Error('settings/roles içində "roles" array boşdur və ya düzgün deyil.');
    }
    setRoles(list);

    // Yeni user formunda default rol
    setNewRole(prev => prev || list[0]);
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
        setLoadError(e?.message || "Yükləmə zamanı xəta baş verdi. İcazələri (rules) yoxlayın.");
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const handleRoleChange = async (userId, role) => {
    try {
      await updateDoc(doc(db, "users", userId), { role });
      setUsers(prev => prev.map(u => (u.id === userId ? { ...u, role } : u)));
      alert("Rol uğurla yeniləndi!");
    } catch (e) {
      console.error(e);
      alert(e?.message || "Rol dəyişərkən xəta oldu.");
    }
  };

  const canCreate = useMemo(() => {
    const emailOk = newEmail.trim().toLowerCase().includes("@");
    const passOk = newPassword.trim().length >= 6;
    const roleOk = roles.includes(newRole);
    return emailOk && passOk && roleOk;
  }, [newEmail, newPassword, newRole, roles]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreateErr("");
    setCreateMsg("");

    if (!canCreate) {
      setCreateErr("Email düzgün olmalı, parol ən azı 6 simvol olmalı və rol siyahıda olmalıdır.");
      return;
    }

    setCreateLoading(true);
    try {
      const fn = httpsCallable(functions, "createUserByAdmin");
      const res = await fn({
        email: newEmail.trim().toLowerCase(),
        password: newPassword.trim(),
        role: newRole
      });

      setCreateMsg(`İstifadəçi yaradıldı: ${res?.data?.email || "OK"}`);
      setNewEmail("");
      setNewPassword("");
      await fetchUsers();
    } catch (err) {
      console.error(err);
      setCreateErr(err?.message || "İstifadəçi yaradıla bilmədi.");
    } finally {
      setCreateLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const t = filterText.trim().toLowerCase();
    if (!t) return users;
    return users.filter(u =>
      String(u.email || "").toLowerCase().includes(t) ||
      String(u.role || "").toLowerCase().includes(t) ||
      String(u.id || "").toLowerCase().includes(t)
    );
  }, [users, filterText]);

  if (isLoading) return <p>Yüklənir...</p>;
  if (loadError) return <p style={{ color: "red" }}>{loadError}</p>;

  return (
    <div className="admin-page-container">
      <h2>İstifadəçi Rollarının İdarə Edilməsi</h2>

      {/* Yeni istifadəçi yarat */}
      <div className="management-container" style={{ marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>Yeni istifadəçi yarat</h3>

        <form onSubmit={handleCreateUser} style={{ display: "grid", gap: 10, maxWidth: 520 }}>
          <div>
            <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>Email</label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="user@example.com"
              className="role-select"
              style={{ width: "100%" }}
              autoComplete="off"
            />
          </div>

          <div>
            <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>Keçici parol</label>
            <input
              type="text"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="ən azı 6 simvol"
              className="role-select"
              style={{ width: "100%" }}
              autoComplete="off"
            />
          </div>

          <div>
            <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>Rol</label>
            <select
              className="role-select"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              style={{ width: "100%" }}
            >
              {roles.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {createErr && <div className="error-message" style={{ marginTop: 6 }}>{createErr}</div>}
          {createMsg && <div style={{ marginTop: 6, color: "green" }}>{createMsg}</div>}

          <button
            type="submit"
            className="login-button"
            disabled={createLoading || !canCreate}
            style={{ width: "fit-content" }}
          >
            {createLoading ? "Yaradılır..." : "İstifadəçi yarat"}
          </button>
        </form>
      </div>

      {/* Axtarış */}
      <div className="management-container" style={{ marginBottom: 10 }}>
        <input
          type="text"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          placeholder="Axtar: email / rol / uid"
          className="role-select"
          style={{ width: "100%" }}
        />
      </div>

      {/* Siyahı */}
      <div className="management-container">
        <table className="management-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>UID</th>
              <th>Rol</th>
              <th>Rol dəyiş</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(u => (
              <tr key={u.id}>
                <td>{u.email || "-"}</td>
                <td style={{ fontFamily: "monospace", fontSize: 12 }}>{u.id}</td>
                <td>{u.role || "-"}</td>
                <td>
                  <select value={u.role || ""} onChange={(e) => handleRoleChange(u.id, e.target.value)}>
                    {roles.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}

            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: "center", opacity: 0.8 }}>
                  Nəticə tapılmadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserManagementPage;
