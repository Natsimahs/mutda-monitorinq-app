import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';

const Ikonlar = {
  Davamiyyet: () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2v4" /><path d="M16 2v4" /><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M3 10h18" /><path d="m9 16 2 2 4-4" /></svg>),
  Hesabat: () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><path d="M18.7 8a6 6 0 0 0-6 0" /><path d="M12.7 14a6 6 0 0 0-6 0" /><path d="M12 20v-6" /></svg>),
  Monitorinq: () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 2v6h6L2.5 2zM2.5 22v-6h6L2.5 22zM21.5 2v6h-6L21.5 2zM21.5 22v-6h-6L21.5 22z" /><path d="M12 8v8" /><path d="M8 12h8" /></svg>),
  Idareetme: () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5v14a9 3 0 0 0 18 0V5" /><path d="M3 12a9 3 0 0 0 18 0" /></svg>),
  Tenzimleme: () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 0 2l-.15.08a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l-.22-.38a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1 0-2l.15-.08a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>),
  Menu: () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>),
  Close: () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>)
};

const Sidebar = ({ user, handleLogout, isOpen, toggleSidebar }) => {
  const isAdmin = ['admin', 'subadmin'].includes(user.role);
  const canSeeSchool = isAdmin || user.role === 'school_user' || user.role === 'mekteb_monitor';
  const canSeeMtm = isAdmin || user.role === 'mtm_user';

  return (
    <>
      {/* Mobil üçün arxa fon overlay */}
      {isOpen && <div className="sidebar-overlay" onClick={toggleSidebar}></div>}

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>Monitorinq portal</h2>
          <button className="mobile-close-btn" onClick={toggleSidebar}><Ikonlar.Close /></button>
        </div>

        <div className="sidebar-user-info">
          <p className="user-email">{user.fullName ? `İstifadəçi: ${user.fullName}` : user.email}</p>
          <span className="user-role-badge">{user.position ? `Vəzifə: ${user.position}` : user.role}</span>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-group">
            <p className="nav-group-title">Əsas</p>
            <NavLink to="/" onClick={toggleSidebar} className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
              <Ikonlar.Hesabat /> Baş səhifə
            </NavLink>
          </div>

          {canSeeMtm && (
            <div className="nav-group">
              <p className="nav-group-title">Məktəbəqədər (MTM)</p>
              <NavLink to="/monitoring/new" onClick={toggleSidebar} className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                <Ikonlar.Monitorinq /> Yeni Monitorinq
              </NavLink>
              <NavLink to="/monitoring/reports" onClick={toggleSidebar} className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                <Ikonlar.Hesabat /> MTM Hesabatları
              </NavLink>
            </div>
          )}

          {canSeeSchool && (
            <div className="nav-group">
              <p className="nav-group-title">Məktəb</p>
              <NavLink to="/school/new" onClick={toggleSidebar} className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                <Ikonlar.Monitorinq /> Məktəb Monitorinqi
              </NavLink>
              <NavLink to="/school/reports" onClick={toggleSidebar} className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                <Ikonlar.Hesabat /> Məktəb Hesabatları
              </NavLink>
            </div>
          )}

          <div className="nav-group">
            <p className="nav-group-title">Davamiyyət</p>
            <NavLink to="/attendance" onClick={toggleSidebar} className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
              <Ikonlar.Davamiyyet /> Jurnal Qeydiyyatı
            </NavLink>
            <NavLink to="/attendance/reports" onClick={toggleSidebar} className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
              <Ikonlar.Hesabat /> Hesabatlar
            </NavLink>
          </div>

          {user.role === 'admin' && (
            <div className="nav-group">
              <p className="nav-group-title">Sistem</p>
              <NavLink to="/admin" onClick={toggleSidebar} className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                <Ikonlar.Idareetme /> Məlumat İdarəetməsi
              </NavLink>
              <NavLink to="/settings" onClick={toggleSidebar} className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                <Ikonlar.Tenzimleme /> Tənzimləmələr
              </NavLink>
            </div>
          )}

          <div className="nav-group">
            <p className="nav-group-title">Profil</p>
            <NavLink to="/profile" onClick={toggleSidebar} className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
              <Ikonlar.Tenzimleme /> Mənim Profilim
            </NavLink>
          </div>
        </nav>

        <div className="sidebar-footer">
          <button onClick={handleLogout} className="logout-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
            Sistemdən Çıxış
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
