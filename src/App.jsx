// src/App.jsx

import React, { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from './firebase';

import LoginPage from './LoginPage.jsx';
import Dashboard from './Dashboard.jsx';
import MonitoringForm from './MonitoringForm.jsx';
import NewMonitoringForm from './NewMonitoringForm.jsx';
import NewMonitoringReportsPage from './NewMonitoringReportsPage.jsx';
import AdminManagementPage from './AdminManagementPage.jsx';
import AttendancePage from './AttendancePage.jsx';
import AttendanceReportsPage from './AttendanceReportsPage.jsx';
import UserManagementPage from './UserManagementPage.jsx';
import AktPDFModal from './AktPDFModal.jsx'; // Bunu da import etmək olar, amma birbaşa ReportsPage-də istifadə olunur
import './App.css';

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(() => sessionStorage.getItem('currentPage') || 'dashboard');

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDocRef = doc(db, "users", firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        // DƏYİŞİKLİK: hər iki halda email prioritet auth-dan gəlməlidir!
        const primaryEmail = firebaseUser.email || userDocSnap.data()?.email || "";
        if (userDocSnap.exists()) {
          setUser({ ...firebaseUser, role: userDocSnap.data().role, email: primaryEmail });
        } else {
          const newUserRole = { role: 'istifadəçi', email: primaryEmail };
          await setDoc(userDocRef, newUserRole);
          setUser({ ...firebaseUser, ...newUserRole });
        }
      } else {
        setUser(null);
        setCurrentPage('dashboard');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    sessionStorage.setItem('currentPage', currentPage);
  }, [currentPage]);

  const handleLogout = async () => {
    try {
      const auth = getAuth();
      await signOut(auth);
      sessionStorage.removeItem('currentPage');
      localStorage.removeItem('newMonitoringFormDraft');
      setUser(null);
      setCurrentPage('dashboard');
      console.log('İstifadəçi uğurla çıxış etdi');
    } catch (error) {
      console.error('Çıxış zamanı xəta:', error);
      alert('Çıxış zamanı xəta baş verdi. Zəhmət olmasa yenidən cəhd edin.');
    }
  };

  const handleNavigate = (page) => setCurrentPage(page);

  if (loading) return <div className="loading-screen">Yüklənir...</div>;
  if (!user) return <LoginPage />;

  const renderPage = () => {
    switch (currentPage) {
      case 'form': return <MonitoringForm />;
      case 'new-monitoring': return <NewMonitoringForm />;
      case 'reports': return <NewMonitoringReportsPage />;
      case 'new-monitoring-reports': return <NewMonitoringReportsPage />;
      case 'admin': return user.role === 'admin' ? <AdminManagementPage /> : <Dashboard user={user} handleNavigate={handleNavigate} handleLogout={handleLogout} />;
      case 'settings': return user.role === 'admin' ? <UserManagementPage /> : <Dashboard user={user} handleNavigate={handleNavigate} handleLogout={handleLogout} />;
      case 'attendance': return <AttendancePage user={user} />;
      case 'attendance-reports': return <AttendanceReportsPage />;
      case 'dashboard': default: return <Dashboard user={user} handleNavigate={handleNavigate} handleLogout={handleLogout} />;
    }
  };

  return (
    <div className="main-app-container">
      {currentPage !== 'dashboard' && (<button onClick={() => handleNavigate('dashboard')} className="back-button">&larr; Əsas Səhifəyə</button>)}
      {renderPage()}
    </div>
  );
};

export default App;
