// src/LoginPage.jsx

import React, { useState } from 'react';
import { getAuth, signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    const auth = getAuth();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Uğurlu girişdən sonra App.jsx avtomatik olaraq istifadəçini yönləndirəcək
    } catch (err) {
      setError("Email və ya parol səhvdir. Zəhmət olmasa, yenidən yoxlayın.");
      console.error("Login xətası:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!email) {
      setError("Zəhmət olmasa email ünvanınızı daxil edin.");
      return;
    }
    setIsLoading(true);
    setError('');
    setMessage('');
    const auth = getAuth();
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage("Şifrə sıfırlama linki email ünvanınıza göndərildi. Zəhmət olmasa poçtunuzu yoxlayın.");
    } catch (err) {
      setError("Şifrə sıfırlama linki göndərilərkən xəta baş verdi. Zəhmət olmasa emailinizi yoxlayın.");
      console.error("Reset xətası:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <h2>{isResetMode ? 'Şifrəni Sıfırla' : 'Monitorinq Sisteminə Giriş'}</h2>
          <p>{isResetMode ? 'Şifrəni sıfırlamaq üçün email ünvanınızı daxil edin.' : 'Zəhmət olmasa, hesab məlumatlarınızı daxil edin.'}</p>
        </div>
        <form onSubmit={!isResetMode ? handleLogin : handleResetPassword}>
          <div className="input-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="nümunə@mutda.az"
            />
          </div>
          
          {!isResetMode && (
            <div className="input-group">
              <label htmlFor="password">Parol</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
            </div>
          )}
          {error && <p className="error-message">{error}</p>}
          {message && <p className="success-message" style={{ color: 'green', fontSize: '0.9rem', marginBottom: '10px' }}>{message}</p>}
          
          {!isResetMode ? (
            <>
              <button type="submit" className="login-button" disabled={isLoading}>
                {isLoading ? 'Yoxlanılır...' : 'Daxil Ol'}
              </button>
              <div style={{ marginTop: '15px', textAlign: 'center' }}>
                <button 
                  type="button" 
                  onClick={() => { setIsResetMode(true); setError(''); setMessage(''); }}
                  style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Şifrəni unutmusunuz?
                </button>
              </div>
            </>
          ) : (
            <>
              <button type="button" onClick={handleResetPassword} className="login-button" disabled={isLoading} style={{ backgroundColor: '#10b981', marginBottom: '10px' }}>
                {isLoading ? 'Göndərilir...' : 'Sıfırlama Linki Göndər'}
              </button>
              <div style={{ textAlign: 'center' }}>
                <button 
                  type="button" 
                  onClick={() => { setIsResetMode(false); setError(''); setMessage(''); }}
                  style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Giriş səhifəsinə qayıt
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
