import React from 'react';
import { Navigate } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';
import { useAuth } from './contexts/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading-screen">Yüklənir...</div>;
  }

  if (!user) {
    // Giriş edilməyib
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'none') {
    // Giriş edilib, amma rol təyin edilməyib
    return (
      <div className="unauthorized-screen" style={{ textAlign: 'center', padding: '50px' }}>
        <h2>Giriş rədd edildi</h2>
        <p>Hesabınız təsdiqlənməyib və ya sizə rol təyin edilməyib.</p>
        <p>Zəhmət olmasa, sistem inzibatçısı ilə əlaqə saxlayın.</p>
        <button 
           onClick={() => signOut(getAuth())} 
           style={{ marginTop: '20px', padding: '10px 20px', cursor: 'pointer' }}
        >
          Çıxış et
        </button>
      </div>
    );
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Rolun bu səhifəyə icazəsi yoxdur
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
