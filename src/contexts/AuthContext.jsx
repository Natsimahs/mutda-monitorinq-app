import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const userDocRef = doc(db, "users", firebaseUser.uid);
          const primaryEmail = firebaseUser.email || "";

          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const role = userDocSnap.data()?.role || null;
            const emailFromDb = userDocSnap.data()?.email || "";
            const finalEmail = primaryEmail || emailFromDb || "";

            if (!role) {
                // Sənəd var, amma rol boşdur
                setUser({ ...firebaseUser, role: 'none', email: finalEmail });
            } else {
                setUser({ ...firebaseUser, role, email: finalEmail });
            }
          } else {
            // TƏHLÜKƏSİZLİK YAMASI: Artıq frontend özünə rol YAZMIR.
            // Əgər admin tərəfindən rol təyin edilməyibsə, istifadəçinin rolu 'none' olur
            // və o, sistemə buraxılmayacaq.
            setUser({ ...firebaseUser, role: 'none', email: primaryEmail });
          }
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error("İstifadəçi məlumatları oxunarkən xəta:", err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    try {
      const auth = getAuth();
      await signOut(auth);
      setUser(null);
    } catch (error) {
      console.error('Çıxış zamanı xəta:', error);
      throw error;
    }
  };

  const value = {
    user,
    loading,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
