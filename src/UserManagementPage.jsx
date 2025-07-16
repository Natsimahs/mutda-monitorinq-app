// src/UserManagementPage.jsx

import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

const UserManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      const usersList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
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

  const handleRoleChange = async (userId, newRole) => {
    try {
      const userDocRef = doc(db, "users", userId);
      await updateDoc(userDocRef, {
        role: newRole
      });
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId ? { ...user, role: newRole } : user
        )
      );
      alert("Rol uğurla yeniləndi!");
    } catch (error) {
      console.error("Rol yenilənərkən xəta:", error);
      alert("Xəta baş verdi. Zəhmət olmasa, yenidən cəhd edin.");
    }
  };

  if (isLoading) {
    return <div className="loading-screen">İstifadəçilər yüklənir...</div>;
  }

  return (
    <div className="admin-page-container">
      <h2>İstifadəçi Rollarının İdarə Edilməsi</h2>
      <p>
        Buradan mövcud istifadəçilərin səlahiyyətlərini dəyişə bilərsiniz. Yeni istifadəçi sistemə ilk dəfə daxil olduqdan sonra onun məlumatları bu siyahıda görünəcək və ona rol təyin etmək mümkün olacaq.
      </p>
      <div className="management-container">
        <table className="management-table">
          <thead>
            <tr>
              <th>Email (Login)</th>
              <th>Hazırkı Rol</th>
              <th>Yeni Rol Təyin Et</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>{user.email || 'Email tapılmadı'}</td>
                <td><span className={`role-badge role-${user.role}`}>{user.role}</span></td>
                <td>
                  <select 
                    className="role-select"
                    value={user.role} 
                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                  >
                    <option value="admin">Admin</option>
                    <option value="subadmin">Subadmin</option>
                    <option value="istifadəçi">İstifadəçi</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserManagementPage;
