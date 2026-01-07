// src/Dashboard.jsx

import React from 'react';

const Ikonlar = { Davamiyyet: () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="m9 16 2 2 4-4"/></svg> ), Hesabat: () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M18.7 8a6 6 0 0 0-6 0"/><path d="M12.7 14a6 6 0 0 0-6 0"/><path d="M12 20v-6"/></svg> ), Monitorinq: () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 2v6h6L2.5 2zM2.5 22v-6h6L2.5 22zM21.5 2v6h-6L21.5 2zM21.5 22v-6h-6L21.5 22z"/><path d="M12 8v8"/><path d="M8 12h8"/></svg> ), Netice: () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="m10 10-2 2 2 2"/><path d="m14 14 2-2-2-2"/></svg> ), Idareetme: () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/></svg> ), Tenzimleme: () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 0 2l-.15.08a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l-.22-.38a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1 0-2l.15-.08a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg> ), };

const Dashboard = ({ user, handleNavigate, handleLogout }) => {
  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>Monitorinq və Qiymətləndirmə Sistemi</h1>
          <p className="welcome-message">Xoş gəldiniz, {user.email} ({user.role})</p>
        </div>
        <button onClick={handleLogout} className="logout-button">Çıxış</button>
      </header>
      <main className="module-selection">
        <h3>Zəhmət olmasa, davam etmək üçün bir modul seçin:</h3>
        <div className="module-grid">
          <div className="module-card" onClick={() => handleNavigate('attendance')}><div className="card-icon color-1"><Ikonlar.Davamiyyet /></div><div className="card-text"><h4>Elektron Davamiyyət Jurnalı</h4><p>Məktəbəqədər təhsil müəssisələri üzrə gündəlik davamiyyətin qeydiyyatı.</p></div></div>
          <div className="module-card" onClick={() => handleNavigate('attendance-reports')}><div className="card-icon color-2"><Ikonlar.Hesabat /></div><div className="card-text"><h4>Davamiyyət Hesabatları</h4><p>Davamiyyət jurnalı üzrə toplanmış məlumatlara baxış və analiz.</p></div></div>
          <div className="module-card" onClick={() => handleNavigate('new-monitoring')}><div className="card-icon color-3"><Ikonlar.Monitorinq /></div><div className="card-text"><h4>MTM Monitorinqi (Yeni)</h4><p>Sübut toplama və dinamik suallarla təkmilləşdirilmiş yeni yoxlama forması.</p></div></div>
          
          {/* DƏYİŞİKLİK BURADADIR */}
          <div className="module-card" onClick={() => handleNavigate('new-monitoring-reports')}>
            <div className="card-icon color-4"><Ikonlar.Netice /></div>
            <div className="card-text">
              <h4>MTM - monitorinq hesabatı (yeni)</h4>
              <p>Yeni forma ilə aparılmış monitorinqlərin hesabatları.</p>
            </div>
          </div>

          {/* ✅ YENİ: Məktəb modulu (yalnız icazəli rollar görür) */}
          {['admin', 'subadmin', 'mekteb_monitor'].includes(user.role) && (
            <>
              <div className="module-card" onClick={() => handleNavigate('school-monitoring')}>
                <div className="card-icon color-3"><Ikonlar.Monitorinq /></div>
                <div className="card-text">
                  <h4>Məktəb Monitorinqi</h4>
                  <p>Məktəblər üçün yoxlama forması.</p>
                </div>
              </div>

              <div className="module-card" onClick={() => handleNavigate('school-monitoring-reports')}>
                <div className="card-icon color-4"><Ikonlar.Netice /></div>
                <div className="card-text">
                  <h4>Məktəb - monitorinq hesabatları</h4>
                  <p>Məktəb forması ilə aparılmış monitorinqlərin hesabatları.</p>
                </div>
              </div>
            </>
          )}

          {user.role === 'admin' && (
            <>
              <div className="module-card admin-card" onClick={() => handleNavigate('admin')}><div className="card-icon color-5"><Ikonlar.Idareetme /></div><div className="card-text"><h4>Məlumatların İdarə Edilməsi</h4><p>Sistemə yeni bağça, qrup və uşaq məlumatlarını daxil etmək.</p></div></div>
              <div className="module-card admin-card" onClick={() => handleNavigate('settings')}><div className="card-icon color-6"><Ikonlar.Tenzimleme /></div><div className="card-text"><h4>Tənzimləmələr</h4><p>İstifadəçi rollarını və sistem tənzimləmələrini idarə etmək.</p></div></div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
