// src/App.jsx

import React, { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from './firebase';

import LoginPage from './LoginPage.jsx';
import Dashboard from './Dashboard.jsx';
import MonitoringForm from './MonitoringForm.jsx';
import ReportsPage from './ReportsPage.jsx';
import AdminPage from './AdminPage.jsx'; // Admin səhifəsini import edirik
import './App.css';

const App = () => {
  const [user, setUser] = useState(null); // Auth state + user role
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(() => sessionStorage.getItem('currentPage') || 'dashboard');

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // İstifadəçi daxil olubsa, onun rolunu Firestore-dan çəkək
        const userDocRef = doc(db, "users", firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          // Auth məlumatları ilə rol məlumatını birləşdir
          setUser({ ...firebaseUser, role: userDocSnap.data().role });
        } else {
          // Firestore-da rolu yoxdursa, default rol verək
          console.warn("İstifadəçinin rolu təyin edilməyib. Default rol 'istifadəçi' olaraq təyin edilir.");
          setUser({ ...firebaseUser, role: 'istifadəçi' });
        }
      } else {
        // İstifadəçi çıxış edib
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
    const auth = getAuth();
    try {
      await signOut(auth);
      sessionStorage.removeItem('currentPage');
    } catch (error) {
      console.error("Çıxış zamanı xəta:", error);
    }
  };

  const handleNavigate = (page) => {
    setCurrentPage(page);
  };

  if (loading) {
    return <div className="loading-screen">Yüklənir...</div>;
  }

  if (!user) {
    return <LoginPage />;
  }

  // İstifadəçi daxil olubsa, səhifələri göstər
  return (
    <div className="main-app-container">
      {currentPage !== 'dashboard' && (
        <button onClick={() => handleNavigate('dashboard')} className="back-button">
          &larr; Əsas Səhifəyə
        </button>
      )}

      {currentPage === 'dashboard' && (
        <Dashboard user={user} handleNavigate={handleNavigate} handleLogout={handleLogout} />
      )}
      {currentPage === 'form' && (
        <MonitoringForm />
      )}
      {currentPage === 'reports' && (
        <ReportsPage user={user} />
      )}
      {currentPage === 'admin' && user.role === 'admin' && (
        <AdminPage />
      )}
    </div>
  );
};

export default App;
