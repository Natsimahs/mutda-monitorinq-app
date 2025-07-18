// src/AttendancePage.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, where, doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import SearchableDropdown from './SearchableDropdown.jsx';

const AttendancePage = ({ user }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [allKindergartens, setAllKindergartens] = useState([]);
  const [allGroups, setAllGroups] = useState([]);
  const [childrenInKg, setChildrenInKg] = useState([]);
  const [unvalidatedRows, setUnvalidatedRows] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [pageState, setPageState] = useState(() => {
    const savedState = localStorage.getItem('attendanceFormState');
    return savedState ? JSON.parse(savedState) : {
      selectedRayon: '', selectedBagcaId: '', selectedGroupFilter: 'all',
      selectedTeacherFilter: 'all', attendanceData: {}, qidaSayi: '',
    };
  });

  useEffect(() => { localStorage.setItem('attendanceFormState', JSON.stringify(pageState)); }, [pageState]);
  useEffect(() => { const timer = setInterval(() => setCurrentTime(new Date()), 1000); return () => clearInterval(timer); }, []);

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        const kgSnapshot = await getDocs(collection(db, "bagcalar"));
        setAllKindergartens(kgSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        const grSnapshot = await getDocs(collection(db, "qruplar"));
        setAllGroups(grSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) { console.error("İlkin məlumatlar çəkilərkən xəta:", error); }
      setIsLoading(false);
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (!pageState.selectedBagcaId) { setChildrenInKg([]); return; }
    const fetchChildren = async () => {
      setIsLoading(true);
      try {
        const relevantGroupIds = allGroups.filter(g => g.bagcaId === pageState.selectedBagcaId).map(g => g.id);
        if (relevantGroupIds.length === 0) { setChildrenInKg([]); setIsLoading(false); return; }
        const childrenQuery = query(collection(db, "usaqlar"), where("qrupId", "in", relevantGroupIds));
        const childrenSnapshot = await getDocs(childrenQuery);
        const childrenList = childrenSnapshot.docs.map(doc => {
          const childData = doc.data();
          const group = allGroups.find(g => g.id === childData.qrupId);
          return { id: doc.id, ...childData, qrupAdi: group?.adi || 'N/A', terbiyeciAdi: group?.terbiyeciAdi || 'N/A' };
        });
        setChildrenInKg(childrenList);
        
        const initialAttendance = {};
        childrenList.forEach(child => {
          initialAttendance[child.id] = pageState.attendanceData[child.id] || 'seçilməyib';
        });
        setPageState(prev => ({ ...prev, attendanceData: initialAttendance }));
      } catch (error) { console.error("Uşaqlar çəkilərkən xəta:", error); }
      setIsLoading(false);
    };
    fetchChildren();
  }, [pageState.selectedBagcaId, allGroups]);

  const filteredChildren = useMemo(() => {
    return childrenInKg.filter(child => 
      (pageState.selectedGroupFilter === 'all' || child.qrupAdi === pageState.selectedGroupFilter) &&
      (pageState.selectedTeacherFilter === 'all' || child.terbiyeciAdi === pageState.selectedTeacherFilter)
    );
  }, [childrenInKg, pageState.selectedGroupFilter, pageState.selectedTeacherFilter]);

  const stats = useMemo(() => {
    const qeydiyyatda = filteredChildren.length;
    const faktiki = Object.values(pageState.attendanceData).filter(s => s === 'gəlib').length;
    const ferq = qeydiyyatda - faktiki;
    const qida = parseInt(pageState.qidaSayi, 10) || 0;
    const qidaKenarlasmasi = faktiki - qida;

    const byGroup = filteredChildren.reduce((acc, child) => {
      const groupName = child.qrupAdi;
      if (!acc[groupName]) { acc[groupName] = { qeydiyyatda: 0, faktiki: 0 }; }
      acc[groupName].qeydiyyatda += 1;
      if (pageState.attendanceData[child.id] === 'gəlib') { acc[groupName].faktiki += 1; }
      return acc;
    }, {});
    return { qeydiyyatda, faktiki, ferq, qidaKenarlasmasi, byGroup };
  }, [filteredChildren, pageState.attendanceData, pageState.qidaSayi]);


  const handleStatusChange = (childId, status) => {
    setPageState(prev => ({ ...prev, attendanceData: { ...prev.attendanceData, [childId]: status } }));
    setUnvalidatedRows(prev => prev.filter(id => id !== childId));
  };

  // DÜZƏLİŞ BURADADIR
  const handleSubmit = async () => {
    const unselectedChildren = filteredChildren.filter(child => pageState.attendanceData[child.id] === 'seçilməyib');
    if (unselectedChildren.length > 0) {
      setUnvalidatedRows(unselectedChildren.map(c => c.id));
      alert(`XƏBƏRDARLIQ: ${unselectedChildren.length} uşağın davamiyyət statusu qeyd edilməyib.`);
      return;
    }
    setIsLoading(true);
    
    // 1. Statistika obyektinin açarlarını təmizləyək (sanitize)
    const sanitizedByGroupStats = {};
    for (const key in stats.byGroup) {
      const sanitizedKey = key.replace(/[.()]/g, '_').replace(/\s/g, '_');
      sanitizedByGroupStats[sanitizedKey] = stats.byGroup[key];
    }
    const sanitizedStats = { ...stats, byGroup: sanitizedByGroupStats };

    // 2. Əsas məlumatları hazırlayaq
    const today = new Date();
    const docId = `${pageState.selectedBagcaId}_${today.toISOString().split('T')[0]}`;
    const reportData = {
      tarix: today.toISOString(),
      bagcaId: pageState.selectedBagcaId,
      rayon: pageState.selectedRayon,
      authorId: user.uid,
      authorEmail: user.email,
      sifarisEdilenQida: parseInt(pageState.qidaSayi, 10) || 0,
      davamiyyetQeydleri: pageState.attendanceData,
      statistika: sanitizedStats, // Təmizlənmiş statistikanı istifadə edirik
    };

    // 3. Firebase-ə göndərək
    try {
      await setDoc(doc(db, "davamiyyet", docId), reportData);
      alert("Davamiyyət hesabatı uğurla yadda saxlanıldı!");
      localStorage.removeItem('attendanceFormState');
      setPageState(getInitialState());
      setChildrenInKg([]);
    } catch (error) {
      console.error("Hesabat göndərilərkən xəta:", error);
      alert("Xəta baş verdi. Zəhmət olmasa, yenidən cəhd edin. Detallar üçün konsola baxın.");
    } finally {
      setIsLoading(false);
    }
  };
  
  const rayonlar = useMemo(() => [...new Set(allKindergartens.map(kg => kg.rayon))], [allKindergartens]);
  const bagcalarInRayon = useMemo(() => allKindergartens.filter(kg => kg.rayon === pageState.selectedRayon), [pageState.selectedRayon, allKindergartens]);
  const groupsInKg = useMemo(() => [...new Set(childrenInKg.map(c => c.qrupAdi))], [childrenInKg]);
  const teachersInKg = useMemo(() => [...new Set(childrenInKg.map(c => c.terbiyeciAdi))], [childrenInKg]);
  const handleStateChange = (field, value) => setPageState(prev => ({ ...prev, [field]: value }));
  const handleRayonChange = (e) => { const newState = getInitialState(); setPageState({ ...newState, selectedRayon: e.target.value }); setChildrenInKg([]); };
  const handleBagcaChange = (e) => setPageState(prev => ({ ...prev, selectedBagcaId: e.target.value, attendanceData: {}, qidaSayi: '' }));
  const getInitialState = () => ({ selectedRayon: '', selectedBagcaId: '', selectedGroupFilter: 'all', selectedTeacherFilter: 'all', attendanceData: {}, qidaSayi: '' });


  return (
    <div className="attendance-page-container">
      <div className="page-header">
        <h2>Elektron Davamiyyət Jurnalı</h2>
        <div className="header-info-bar">
          <span><strong>Tarix:</strong> {currentTime.toLocaleDateString('az-AZ')}</span>
          <span><strong>Saat:</strong> {currentTime.toLocaleTimeString('az-AZ')}</span>
          <span><strong>Əməkdaş:</strong> {user.email} ({user.role})</span>
        </div>
      </div>
      <div className="selection-panel"> <select value={pageState.selectedRayon} onChange={handleRayonChange}> <option value="">Rayon seçin...</option> {rayonlar.map(r => <option key={r} value={r}>{r}</option>)} </select> <select value={pageState.selectedBagcaId} onChange={handleBagcaChange} disabled={!pageState.selectedRayon}> <option value="">Bağça seçin...</option> {bagcalarInRayon.map(b => <option key={b.id} value={b.id}>{b.adi}</option>)} </select> </div>
      
      {isLoading && <div className="loading-screen">Yüklənir...</div>}

      {pageState.selectedBagcaId && !isLoading && (
        <>
          <div className="stats-panel">
            <div className="stat-card"><h4>Qeydiyyatda (Filtr üzrə)</h4><p className="total-stat">{stats.qeydiyyatda}</p><div className="group-stats">{Object.entries(stats.byGroup).map(([groupName, groupStats]) => (<span key={groupName}>{groupName}: <strong>{groupStats.qeydiyyatda}</strong></span>))}</div></div>
            <div className="stat-card"><h4>Faktiki</h4><p className="total-stat">{stats.faktiki}</p><div className="group-stats">{Object.entries(stats.byGroup).map(([groupName, groupStats]) => (<span key={groupName}>{groupName}: <strong>{groupStats.faktiki}</strong></span>))}</div></div>
            <div className="stat-card"><h4>Fərq</h4><p className="total-stat">{stats.ferq}</p><div className="group-stats">{Object.entries(stats.byGroup).map(([groupName, groupStats]) => (<span key={groupName}>{groupName}: <strong>{groupStats.qeydiyyatda - groupStats.faktiki}</strong></span>))}</div></div>
            <div className="stat-card qida-card"><h4>Qida Sifarişi</h4><input type="number" placeholder="Sayı daxil et" value={pageState.qidaSayi} onChange={(e) => handleStateChange('qidaSayi', e.target.value)} /><p className={`kenarlasma ${stats.qidaKenarlasmasi !== 0 ? 'ferqli' : ''}`}>Kənarlaşma: {stats.qidaKenarlasmasi}</p></div>
          </div>

          <div className="table-section">
            <div className="table-filters">
              <SearchableDropdown options={groupsInKg} value={pageState.selectedGroupFilter} onChange={(value) => handleStateChange('selectedGroupFilter', value)} placeholder="Qrup üzrə filtr" />
              <SearchableDropdown options={teachersInKg} value={pageState.selectedTeacherFilter} onChange={(value) => handleStateChange('selectedTeacherFilter', value)} placeholder="Tərbiyəçi üzrə filtr" />
            </div>
            <div className="table-container">
              <table className="attendance-table">
                <thead><tr><th>Uşağın Adı, Soyadı, Ata Adı</th><th>Qrup</th><th>Tərbiyəçi</th><th>Davamiyyət Statusu</th></tr></thead>
                <tbody>
                  {filteredChildren.length > 0 ? (
                    filteredChildren.map(child => (
                      <tr key={child.id} className={unvalidatedRows.includes(child.id) ? 'unvalidated-row' : ''}>
                        <td>{`${child.ad} ${child.soyad} ${child.ataAdi || ''}`}</td>
                        <td>{child.qrupAdi}</td>
                        <td>{child.terbiyeciAdi}</td>
                        <td>
                          <select className={`status-select status-${pageState.attendanceData[child.id]}`} value={pageState.attendanceData[child.id] || 'seçilməyib'} onChange={(e) => handleStatusChange(child.id, e.target.value)}>
                            <option value="seçilməyib" disabled>Seçim edin...</option><option value="gəlib">Gəlib</option><option value="gəlməyib">Gəlməyib</option><option value="üzrlü">Üzrlü</option>
                          </select>
                        </td>
                      </tr>
                    ))
                  ) : ( <tr><td colSpan="4">Bu bağçada qeydiyyatda olan uşaq tapılmadı və ya filtrə uyğun nəticə yoxdur.</td></tr> )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="submission-section"><button className="action-button" onClick={handleSubmit} disabled={isLoading}>Təsdiqlə</button></div>
        </>
      )}
    </div>
  );
};

export default AttendancePage;
