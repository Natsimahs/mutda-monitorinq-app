// src/LoginPage.jsx

import React, { useState } from 'react';
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          {/* Buraya loqo da əlavə etmək olar */}
          <h2>Monitorinq Sisteminə Giriş</h2>
          <p>Zəhmət olmasa, hesab məlumatlarınızı daxil edin.</p>
        </div>
        <form onSubmit={handleLogin}>
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
          {error && <p className="error-message">{error}</p>}
          <button type="submit" className="login-button" disabled={isLoading}>
            {isLoading ? 'Yoxlanılır...' : 'Daxil Ol'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
