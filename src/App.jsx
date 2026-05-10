// src/App.jsx

import React, { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from './firebase';

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './Layout.jsx';

import LoginPage from './LoginPage.jsx';
import Dashboard from './Dashboard.jsx';
import MonitoringForm from './MonitoringForm.jsx';
import NewMonitoringForm from './NewMonitoringForm.jsx';
import NewMonitoringReportsPage from './NewMonitoringReportsPage.jsx';
import AdminManagementPage from './AdminManagementPage.jsx';
import AttendancePage from './AttendancePage.jsx';
import AttendanceReportsPage from './AttendanceReportsPage.jsx';
import UserManagementPage from './UserManagementPage.jsx';
import AktPDFModal from './AktPDFModal.jsx'; 

import SchoolMonitoringForm from './school/SchoolMonitoringForm.jsx';
import SchoolMonitoringReportsPage from './school/SchoolMonitoringReportsPage.jsx';

import './App.css';

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const userDocRef = doc(db, "users", firebaseUser.uid);
          const primaryEmail = firebaseUser.email || "";

          try {
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists()) {
              const role = userDocSnap.data()?.role || 'istifadəçi';
              const emailFromDb = userDocSnap.data()?.email || "";
              const finalEmail = primaryEmail || emailFromDb || "";

              setUser({ ...firebaseUser, role, email: finalEmail });
            } else {
              const newUserRole = { role: 'istifadəçi', email: primaryEmail };
              await setDoc(userDocRef, newUserRole);
              setUser({ ...firebaseUser, ...newUserRole });
            }
          } catch (err) {
            console.warn("users/{uid} oxunarkən xəta oldu, default rol tətbiq edildi:", err);
            setUser({ ...firebaseUser, role: 'istifadəçi', email: primaryEmail });
          }
        } else {
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      const auth = getAuth();
      await signOut(auth);
      setUser(null);
    } catch (error) {
      console.error('Çıxış zamanı xəta:', error);
      alert('Çıxış zamanı xəta baş verdi. Zəhmət olmasa yenidən cəhd edin.');
    }
  };

  if (loading) return <div className="loading-screen">Yüklənir...</div>;

  return (
    <Router>
      {!user ? (
        <Routes>
          <Route path="*" element={<LoginPage />} />
        </Routes>
      ) : (
        <Routes>
          <Route path="/" element={<Layout user={user} handleLogout={handleLogout} />}>
            <Route index element={<Dashboard user={user} />} />
            
            <Route path="monitoring/new" element={<NewMonitoringForm user={user} />} />
            <Route path="monitoring/reports" element={<NewMonitoringReportsPage user={user} />} />
            
            <Route path="school/new" element={<SchoolMonitoringForm user={user} />} />
            <Route path="school/reports" element={<SchoolMonitoringReportsPage user={user} />} />
            
            <Route path="attendance" element={<AttendancePage user={user} />} />
            <Route path="attendance/reports" element={<AttendanceReportsPage />} />
            
            {/* Protected Routes for Admin */}
            <Route path="admin" element={user.role === 'admin' ? <AdminManagementPage /> : <Navigate to="/" />} />
            <Route path="settings" element={user.role === 'admin' ? <UserManagementPage /> : <Navigate to="/" />} />
            
            {/* Fallback route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      )}
    </Router>
  );
};

export default App;
