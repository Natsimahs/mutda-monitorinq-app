import React, { useState } from 'react';
import { getAuth, updatePassword, updateEmail } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

const ProfilePage = ({ user }) => {
  const [newPassword, setNewPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setMsg({ text: 'Şifrə ən azı 6 simvol olmalıdır.', type: 'error' });
      return;
    }
    setLoading(true);
    setMsg({ text: '', type: '' });
    try {
      const auth = getAuth();
      await updatePassword(auth.currentUser, newPassword);
      setMsg({ text: 'Şifrəniz uğurla dəyişdirildi!', type: 'success' });
      setNewPassword('');
    } catch (err) {
      if (err.code === 'auth/requires-recent-login') {
        setMsg({ text: 'Təhlükəsizlik səbəbilə şifrəni dəyişmək üçün sistemdən çıxıb yenidən daxil olmalısınız.', type: 'error' });
      } else {
        setMsg({ text: 'Şifrə dəyişdirilərkən xəta baş verdi.', type: 'error' });
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEmail = async (e) => {
    e.preventDefault();
    if (!newEmail.includes('@')) {
      setMsg({ text: 'Düzgün email ünvanı daxil edin.', type: 'error' });
      return;
    }
    setLoading(true);
    setMsg({ text: '', type: '' });
    try {
      const auth = getAuth();
      await updateEmail(auth.currentUser, newEmail);
      // Firestore-da da yeniləyək
      await updateDoc(doc(db, "users", user.uid), { email: newEmail });
      setMsg({ text: 'Email ünvanınız uğurla dəyişdirildi!', type: 'success' });
      setNewEmail('');
    } catch (err) {
      if (err.code === 'auth/requires-recent-login') {
        setMsg({ text: 'Təhlükəsizlik səbəbilə emaili dəyişmək üçün sistemdən çıxıb yenidən daxil olmalısınız.', type: 'error' });
      } else {
        setMsg({ text: 'Email dəyişdirilərkən xəta baş verdi.', type: 'error' });
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-page-container">
      <h2>Mənim Profilim</h2>
      <p style={{ color: '#64748b', marginBottom: '30px' }}>Sistemə daxil olarkən istifadə etdiyiniz məlumatları buradan yeniləyə bilərsiniz.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        
        <div className="management-container">
          <h3 style={{ marginTop: 0 }}>Profil Məlumatları</h3>
          <p><strong>Ad və Soyad:</strong> {user.fullName || '-'}</p>
          <p><strong>Vəzifə:</strong> {user.position || '-'}</p>
          <p><strong>Cari Email:</strong> {user.email || '-'}</p>
          <p><strong>Rol:</strong> <span className="user-role-badge">{user.role}</span></p>
          <p>
            <strong>Təhkim olunduğunuz idarələr:</strong><br/>
            {user.assignedRegions && user.assignedRegions.length > 0 
              ? user.assignedRegions.map(r => <span key={r} style={{ display:'inline-block', background:'#e2e8f0', padding:'4px 8px', borderRadius:'4px', margin:'4px 4px 0 0', fontSize:'0.85rem' }}>{r}</span>) 
              : 'Bütün regionlar / Yoxdur'}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className="management-container">
            <h3 style={{ marginTop: 0 }}>Şifrəni Yenilə</h3>
            <form onSubmit={handleUpdatePassword}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>Yeni Şifrə</label>
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="role-select" 
                  style={{ width: '100%' }}
                  placeholder="Ən azı 6 simvol"
                  required
                />
              </div>
              <button type="submit" className="login-button" disabled={loading} style={{ width: 'auto', padding: '10px 20px', margin: 0 }}>
                {loading ? 'Gözləyin...' : 'Şifrəni Dəyiş'}
              </button>
            </form>
          </div>

          <div className="management-container">
            <h3 style={{ marginTop: 0 }}>Emaili Yenilə</h3>
            <form onSubmit={handleUpdateEmail}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>Yeni Email</label>
                <input 
                  type="email" 
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="role-select" 
                  style={{ width: '100%' }}
                  placeholder="yeni@email.com"
                  required
                />
              </div>
              <button type="submit" className="login-button" disabled={loading} style={{ width: 'auto', padding: '10px 20px', margin: 0, backgroundColor: '#3b82f6' }}>
                {loading ? 'Gözləyin...' : 'Emaili Dəyiş'}
              </button>
            </form>
          </div>

        </div>

      </div>

      {msg.text && (
        <div style={{ 
          marginTop: '20px', 
          padding: '15px', 
          borderRadius: '6px', 
          backgroundColor: msg.type === 'error' ? '#fee2e2' : '#d1fae5',
          color: msg.type === 'error' ? '#991b1b' : '#065f46',
          borderLeft: `4px solid ${msg.type === 'error' ? '#ef4444' : '#10b981'}`
        }}>
          {msg.text}
        </div>
      )}

    </div>
  );
};

export default ProfilePage;
