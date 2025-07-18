// src/AttendanceDetailModal.jsx

import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';

const AttendanceDetailModal = ({ report, kindergartenName, onClose }) => {
  const [details, setDetails] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!report || !report.bagcaId) return;
      setIsLoading(true);
      try {
        // 1. Hesabatın aid olduğu bağçanın bütün qruplarını tapırıq
        const groupsQuery = query(collection(db, "qruplar"), where("bagcaId", "==", report.bagcaId));
        const groupsSnapshot = await getDocs(groupsQuery);
        const groupsData = groupsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const groupIds = groupsData.map(g => g.id);

        if (groupIds.length === 0) {
          setDetails([]);
          setIsLoading(false);
          return;
        }
        
        // 2. Həmin qruplara aid bütün uşaqları çəkirik
        // Firestore-un "in" operatoru 30 elementə qədər dəstəkləyir.
        // Əgər bir bağçada 30-dan çox qrup varsa, bu kod daha mürəkkəb olmalıdır.
        // Ancaq bu, çox nadir bir hal olduğu üçün hazırkı həll yolu yetərlidir.
        const childrenQuery = query(collection(db, "usaqlar"), where("qrupId", "in", groupIds));
        const childrenSnapshot = await getDocs(childrenQuery);
        const childrenData = childrenSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // 3. Uşaqların məlumatlarını hesabatdakı statuslarla birləşdiririk
        const detailedList = Object.entries(report.davamiyyetQeydleri).map(([childId, status]) => {
          const childInfo = childrenData.find(c => c.id === childId);
          const groupInfo = childInfo ? groupsData.find(g => g.id === childInfo.qrupId) : null;
          return {
            id: childId,
            ad: childInfo?.ad || 'Naməlum',
            soyad: childInfo?.soyad || 'Uşaq',
            qrupAdi: groupInfo?.adi || 'N/A',
            status: status,
          };
        });
        
        setDetails(detailedList);
      } catch (error) {
        console.error("Hesabat detalları çəkilərkən xəta:", error);
      }
      setIsLoading(false);
    };

    fetchDetails();
  }, [report]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>"{kindergartenName}" üçün Hesabat Detalları</h3>
          <p><strong>Tarix:</strong> {new Date(report.tarix).toLocaleString('az-AZ')}</p>
          <button onClick={onClose} className="modal-close-button">&times;</button>
        </div>
        <div className="modal-body">
          {isLoading ? (
            <p>Detallar yüklənir...</p>
          ) : (
            <table className="details-table">
              <thead>
                <tr>
                  <th>Uşağın Adı, Soyadı</th>
                  <th>Qrup</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {details.length > 0 ? details.map(item => (
                  <tr key={item.id}>
                    <td>{`${item.ad} ${item.soyad}`}</td>
                    <td>{item.qrupAdi}</td>
                    <td>
                      <span className={`status-badge status-${item.status}`}>
                        {item.status === 'gəlib' ? 'Gəlib' : item.status === 'gəlməyib' ? 'Gəlməyib' : 'Üzrlü'}
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan="3">Detallar tapılmadı.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttendanceDetailModal;
