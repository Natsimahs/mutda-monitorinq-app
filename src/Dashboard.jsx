// src/Dashboard.jsx

import React from 'react';

// user obyekti App.jsx-dən ötürüləcək
const Dashboard = ({ user, handleNavigate, handleLogout }) => {
  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Monitorinq və Qiymətləndirmə Sistemi</h1>
        <div className="header-user-info">
          <span>Xoş gəldiniz, {user.email} ({user.role})</span>
          <button onClick={handleLogout} className="logout-button">Çıxış</button>
        </div>
      </header>

      <main className="module-selection">
        <h3>Zəhmət olmasa, davam etmək üçün bir modul seçin:</h3>
        <div className="module-grid">
          <div className="module-card" onClick={() => handleNavigate('form')}>
            <h4>Məktəbəqədər təhsil müəssisələri üzrə monitorinq</h4>
            <p>Yeni monitorinq formunu doldurmaq üçün bura daxil olun.</p>
          </div>
          
          <div className="module-card" onClick={() => handleNavigate('reports')}>
            <h4>Hesabatlara Baxış</h4>
            <p>Göndərilmiş monitorinq nəticələrini görmək və idarə etmək.</p>
          </div>

          {/* YALNIZ ADMİNLƏRİN GÖRDÜYÜ DÜYMƏ */}
          {user.role === 'admin' && (
            <div className="module-card admin-card" onClick={() => handleNavigate('admin')}>
              <h4>İdarəetmə Paneli</h4>
              <p>İstifadəçiləri və sistem tənzimləmələrini idarə etmək.</p>
            </div>
          )}

          <div className="module-card disabled">
            <h4>Ümumtəhsil müəssisələri üzrə monitorinq</h4>
            <p>(Hazırlanır)</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
