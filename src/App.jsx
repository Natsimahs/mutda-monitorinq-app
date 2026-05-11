// src/App.jsx

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './Layout.jsx';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';

import LoginPage from './LoginPage.jsx';
import Dashboard from './Dashboard.jsx';
import NewMonitoringForm from './NewMonitoringForm.jsx';
import NewMonitoringReportsPage from './NewMonitoringReportsPage.jsx';
import AdminManagementPage from './AdminManagementPage.jsx';
import AttendancePage from './AttendancePage.jsx';
import AttendanceReportsPage from './AttendanceReportsPage.jsx';
import UserManagementPage from './UserManagementPage.jsx';
import ProfilePage from './ProfilePage.jsx';

import SchoolMonitoringForm from './school/SchoolMonitoringForm.jsx';
import SchoolMonitoringReportsPage from './school/SchoolMonitoringReportsPage.jsx';

import './App.css';

const AppRoutes = () => {
  const { user, loading, logout } = useAuth();

  if (loading) return <div className="loading-screen">Yüklənir...</div>;

  return (
    <Router>
      <Routes>
        {/* İctimai Səhifə (Login) */}
        <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" />} />

        {/* Qorunan Səhifələr (Layout daxilində) */}
        <Route path="/" element={
          <ProtectedRoute>
            <Layout user={user} handleLogout={logout} />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard user={user} />} />
          
          {/* MTM Modulu */}
          <Route path="monitoring/new" element={
            <ProtectedRoute allowedRoles={['admin', 'subadmin', 'mtm_user']}>
              <NewMonitoringForm user={user} />
            </ProtectedRoute>
          } />
          <Route path="monitoring/reports" element={
            <ProtectedRoute allowedRoles={['admin', 'subadmin', 'mtm_user']}>
              <NewMonitoringReportsPage user={user} />
            </ProtectedRoute>
          } />
          
          {/* Məktəb Modulu */}
          <Route path="school/new" element={
            <ProtectedRoute allowedRoles={['admin', 'subadmin', 'school_user', 'mekteb_monitor']}>
              <SchoolMonitoringForm user={user} />
            </ProtectedRoute>
          } />
          <Route path="school/reports" element={
            <ProtectedRoute allowedRoles={['admin', 'subadmin', 'school_user', 'mekteb_monitor']}>
              <SchoolMonitoringReportsPage user={user} />
            </ProtectedRoute>
          } />
          
          {/* Davamiyyət Modulu */}
          <Route path="attendance" element={<AttendancePage user={user} />} />
          <Route path="attendance/reports" element={<AttendanceReportsPage />} />
          
          {/* Admin İdarəetməsi */}
          <Route path="admin" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminManagementPage />
            </ProtectedRoute>
          } />
          <Route path="settings" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <UserManagementPage />
            </ProtectedRoute>
          } />

          {/* Şəxsi Profil Səhifəsi */}
          <Route path="profile" element={<ProfilePage user={user} />} />
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
};

export default App;
