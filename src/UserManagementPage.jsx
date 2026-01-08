// src/UserManagementPage.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { httpsCallable } from "firebase/functions";
import { db, functions } from './firebase';

const ROLES = ["admin", "subadmin", "istifadəçi"];

const UserManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Yeni istifadəçi yaratmaq üçün state-lər
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("istifadəçi");
  const [createLoading, setCreateLoading] = useState(false);
  const [createMsg, setCreateMsg] = useState("");
  const [createErr, setCreateErr] = useState("");

  // Axtarış (istəyə bağlı, amma faydalıdır)
  const [filterText, setFilterText] = useState("");

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      const usersList = querySnapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));

      // Siyahını email-ə görə sort edək (daha rahat)
      usersList.sort((a, b) => String(a.email || "").localeCompare(String(b.email || "")));

      setUsers(usersList);
    } catch (error) {
      console.error("İstifadəçiləri çəkərkən xəta:", error);
      alert("İstifadəçilər yüklənərkən xəta baş verdi.");
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId, newRoleValue) => {
    try {
      const userDocRef = doc(db, "users", userId);
      await updateDoc(userDocRef, { role: newRoleValue });

      setUsers(prevUsers =>
        prevUsers.map(u => (u.id === userId ? { ...u, role: newRoleValue } : u))
      );

      alert("Rol uğurla yeniləndi!");
    } catch (error) {
      console.error("Rol yenilənərkən xəta:", error);
      alert("Xəta baş verdi. Zəhmət olmasa, yenidən cəhd edin.");
    }
  };

  const canCreate = useMemo(() => {
    const email = newEmail.trim().toLowerCase();
    return email.includes("@") && newPassword.trim().length >= 6 && ROLES.includes(newRole);
  }, [newEmail, newPassword, newRole]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreateErr("");
    setCreateMsg("");

    if (!canCreate) {
      setCreateErr("Email düzgün olmalı və parol ən azı 6 simvol olmalıdır.");
      return;
    }

    setCreateLoading(true);
    try {
      const createUserByAdmin = httpsCallable(functions, "createUserByAdmin");
      const res = await createUserByAdmin({
        email: newEmail.trim().toLowerCase(),
        password: newPassword.trim(),
        role: newRole
      });

      const created = res?.data;

      setCreateMsg(`İstifadəçi yaradıldı: ${created?.email} (rol: ${created?.role})`);
      setNewEmail("");
      setNewPassword("");
      setNewRole("istifadəçi");

      await fetchUsers(); // siyahını yenilə
    } catch (err) {
      console.error("createUserByAdmin error:", err);
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

  if (isLoading) {
    return <div className="loading-screen">İstifadəçilər yüklənir...</div>;
  }

  return (
    <div className="admin-page-container">
      <h2>İstifadəçi Rollarının İdarə Edilməsi</h2>
      <p>
        Buradan mövcud istifadəçilərin səlahiyyətlərini dəyişə və yeni istifadəçi hesabı yarada bilərsiniz.
      </p>

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
            <small style={{ opacity: 0.8 }}>
              Təhlükəsizlik üçün istifadəçiyə sonra parolu dəyişməyi tapşıra bilərsiniz.
            </small>
          </div>

          <div>
            <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>Rol</label>
            <select
              className="role-select"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              style={{ width: "100%" }}
            >
              <option value="admin">Admin</option>
              <option value="subadmin">Subadmin</option>
              <option value="istifadəçi">İstifadəçi</option>
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
              <th>Email (Login)</th>
              <th>UID</th>
              <th>Hazırkı Rol</th>
              <th>Yeni Rol Təyin Et</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => (
              <tr key={user.id}>
                <td>{user.email || 'Email tapılmadı'}</td>
                <td style={{ fontFamily: "monospace", fontSize: 12 }}>{user.id}</td>
                <td>
                  <span className={`role-badge role-${user.role}`}>{user.role || "istifadəçi"}</span>
                </td>
                <td>
                  <select
                    className="role-select"
                    value={user.role || "istifadəçi"}
                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                  >
                    <option value="admin">Admin</option>
                    <option value="subadmin">Subadmin</option>
                    <option value="istifadəçi">İstifadəçi</option>
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
