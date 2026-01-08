import React, { useEffect, useMemo, useState } from "react";
import { collection, getDocs, doc, updateDoc, getDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "./firebase";

const UserManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Yeni user yaratmaq üçün
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createMsg, setCreateMsg] = useState("");
  const [createErr, setCreateErr] = useState("");

  const [filterText, setFilterText] = useState("");

  // 🔹 Rolları Firestore-dan oxu
  const fetchRoles = async () => {
    const snap = await getDoc(doc(db, "settings", "roles"));
    if (snap.exists()) {
      const list = snap.data().roles || [];
      setRoles(list);
      if (!newRole && list.length > 0) {
        setNewRole(list[0]);
      }
    }
  };

  // 🔹 İstifadəçiləri oxu
  const fetchUsers = async () => {
    const qs = await getDocs(collection(db, "users"));
    const list = qs.docs.map(d => ({
      id: d.id,
      ...d.data()
    }));
    list.sort((a, b) => String(a.email || "").localeCompare(String(b.email || "")));
    setUsers(list);
  };

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      await fetchRoles();
      await fetchUsers();
      setIsLoading(false);
    })();
  }, []);

  // 🔹 Rol dəyiş
  const handleRoleChange = async (userId, role) => {
    await updateDoc(doc(db, "users", userId), { role });
    setUsers(prev =>
      prev.map(u => (u.id === userId ? { ...u, role } : u))
    );
  };

  // 🔹 Yeni user yarat
  const canCreate = useMemo(() => {
    return (
      newEmail.includes("@") &&
      newPassword.length >= 6 &&
      roles.includes(newRole)
    );
  }, [newEmail, newPassword, newRole, roles]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreateErr("");
    setCreateMsg("");
    setCreateLoading(true);

    try {
      const fn = httpsCallable(functions, "createUserByAdmin");
      const res = await fn({
        email: newEmail.trim().toLowerCase(),
        password: newPassword,
        role: newRole
      });

      setCreateMsg(`İstifadəçi yaradıldı: ${res.data.email}`);
      setNewEmail("");
      setNewPassword("");
      await fetchUsers();
    } catch (err) {
      setCreateErr(err.message || "Xəta baş verdi");
    } finally {
      setCreateLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const t = filterText.toLowerCase();
    if (!t) return users;
    return users.filter(u =>
      (u.email || "").toLowerCase().includes(t) ||
      (u.role || "").toLowerCase().includes(t) ||
      u.id.includes(t)
    );
  }, [users, filterText]);

  if (isLoading) return <p>Yüklənir...</p>;

  return (
    <div className="admin-page-container">
      <h2>İstifadəçi Rollarının İdarə Edilməsi</h2>

      {/* 🔹 Yeni istifadəçi */}
      <div className="management-container">
        <h3>Yeni istifadəçi yarat</h3>

        <form onSubmit={handleCreateUser} style={{ maxWidth: 500 }}>
          <input
            placeholder="Email"
            value={newEmail}
            onChange={e => setNewEmail(e.target.value)}
          />

          <input
            placeholder="Parol (min 6)"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
          />

          <select value={newRole} onChange={e => setNewRole(e.target.value)}>
            {roles.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          {createErr && <div className="error-message">{createErr}</div>}
          {createMsg && <div style={{ color: "green" }}>{createMsg}</div>}

          <button disabled={!canCreate || createLoading}>
            {createLoading ? "Yaradılır..." : "İstifadəçi yarat"}
          </button>
        </form>
      </div>

      {/* 🔹 Axtarış */}
      <input
        placeholder="Axtar..."
        value={filterText}
        onChange={e => setFilterText(e.target.value)}
      />

      {/* 🔹 Siyahı */}
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
              <td>{u.email}</td>
              <td style={{ fontFamily: "monospace" }}>{u.id}</td>
              <td>{u.role}</td>
              <td>
                <select
                  value={u.role}
                  onChange={e => handleRoleChange(u.id, e.target.value)}
                >
                  {roles.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UserManagementPage;
