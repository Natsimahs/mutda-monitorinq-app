// src/ManageGroups.jsx

import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import * as XLSX from 'xlsx';

const ManageGroups = () => {
  const [groups, setGroups] = useState([]);
  const [kindergartens, setKindergartens] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);

  const [name, setName] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [kindergartenId, setKindergartenId] = useState('');
  const [isEditing, setIsEditing] = useState(null);

  const yasQruplari = ["Körpələr qrupu (1.5-2 yaş)", "Kiçik qrup (2-3 yaş)", "Orta qrup (3-4 yaş)", "Böyük qrup (4-5 yaş)", "Məktəbə hazırlıq qrupu (5-6 yaş)"];

  const fetchData = async () => {
    setIsLoading(true);
    const kgSnapshot = await getDocs(collection(db, "bagcalar"));
    const kgList = kgSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setKindergartens(kgList);

    const grSnapshot = await getDocs(collection(db, "qruplar"));
    const grList = grSnapshot.docs.map(doc => {
      const kg = kgList.find(k => k.id === doc.data().bagcaId);
      return { id: doc.id, ...doc.data(), bagcaAdi: kg ? kg.adi : 'Bilinməyən' };
    });
    setGroups(grList);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !teacherName || !kindergartenId) {
      alert("Bütün sahələr mütləq daxil edilməlidir.");
      return;
    }
    const dataToSave = { adi: name, terbiyeciAdi: teacherName, bagcaId: kindergartenId };
    if (isEditing) {
      await updateDoc(doc(db, "qruplar", isEditing), dataToSave);
    } else {
      await addDoc(collection(db, "qruplar"), dataToSave);
    }
    resetForm();
    fetchData();
  };

  const handleEdit = (group) => {
    setIsEditing(group.id);
    setName(group.adi);
    setTeacherName(group.terbiyeciAdi);
    setKindergartenId(group.bagcaId);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Bu qrupu silmək istədiyinizə əminsiniz?")) {
      await deleteDoc(doc(db, "qruplar", id));
      fetchData();
    }
  };

  const resetForm = () => {
    setIsEditing(null);
    setName('');
    setTeacherName('');
    setKindergartenId('');
  };

  // YENİ: Qrupları Excel-dən import edən funksiya
  const handleExcelImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);

        if (json.length === 0 || !json[0].hasOwnProperty('adi') || !json[0].hasOwnProperty('terbiyeciAdi') || !json[0].hasOwnProperty('bagcaAdi')) {
          alert("Excel faylı boşdur və ya faylda 'adi', 'terbiyeciAdi', 'bagcaAdi' sütunları yoxdur.");
          setIsImporting(false);
          return;
        }

        // Bağça adlarını ID-lərə çevirmək üçün bir xəritə yaradırıq
        const kgNameIdMap = new Map(kindergartens.map(kg => [kg.adi.toLowerCase(), kg.id]));
        const batch = writeBatch(db);
        let errorCount = 0;

        json.forEach((row) => {
          const bagcaId = kgNameIdMap.get(row.bagcaAdi.toLowerCase());
          if (bagcaId) {
            const newGroupRef = doc(collection(db, "qruplar"));
            batch.set(newGroupRef, {
              adi: row.adi,
              terbiyeciAdi: row.terbiyeciAdi,
              bagcaId: bagcaId
            });
          } else {
            console.warn(`"${row.bagcaAdi}" adlı bağça tapılmadı. Bu sətir import edilmədi.`);
            errorCount++;
          }
        });

        await batch.commit();
        const successCount = json.length - errorCount;
        let alertMessage = `${successCount} qrup uğurla sistemə əlavə edildi!`;
        if (errorCount > 0) {
          alertMessage += `\n${errorCount} sətirdə isə bağça adı tapılmadığı üçün xəta baş verdi. Detallar üçün konsola baxın.`;
        }
        alert(alertMessage);
        fetchData();

      } catch (error) {
        console.error("Excel importu zamanı xəta:", error);
        alert("Fayl import edilərkən xəta baş verdi.");
      } finally {
        setIsImporting(false);
        event.target.value = null;
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="management-container">
      <div className="import-container">
        <h4>Excel-dən Kütləvi Import</h4>
        <p>Qrupların siyahısını `.xlsx` formatında yükləyin. Faylda `adi`, `terbiyeciAdi` və `bagcaAdi` sütunları olmalıdır.</p>
        <input type="file" accept=".xlsx, .xls" onChange={handleExcelImport} disabled={isImporting} />
        {isImporting && <p>Import edilir, zəhmət olmasa gözləyin...</p>}
      </div>
      <hr />
      <h3>Əl ilə İdarəetmə</h3>
      <form onSubmit={handleSubmit} className="management-form">
        <select value={name} onChange={(e) => setName(e.target.value)} required>
          <option value="">Qrup adı seçin...</option>
          {yasQruplari.map(q => <option key={q} value={q}>{q}</option>)}
        </select>
        <input type="text" placeholder="Tərbiyəçinin Adı, Soyadı" value={teacherName} onChange={(e) => setTeacherName(e.target.value)} required />
        <select value={kindergartenId} onChange={(e) => setKindergartenId(e.target.value)} required>
          <option value="">Aid olduğu bağçanı seçin...</option>
          {kindergartens.map(kg => <option key={kg.id} value={kg.id}>{kg.adi}</option>)}
        </select>
        <div className="form-buttons">
          <button type="submit">{isEditing ? 'Yenilə' : 'Əlavə Et'}</button>
          {isEditing && <button type="button" onClick={resetForm}>Ləğv Et</button>}
        </div>
      </form>
      <hr />
      <h3>Mövcud Qruplar</h3>
      {isLoading ? <p>Yüklənir...</p> : (
        <table className="management-table">
          <thead>
            <tr>
              <th>Qrup Adı</th>
              <th>Tərbiyəçi</th>
              <th>Bağça</th>
              <th>Əməliyyatlar</th>
            </tr>
          </thead>
          <tbody>
            {groups.map(gr => (
              <tr key={gr.id}>
                <td>{gr.adi}</td>
                <td>{gr.terbiyeciAdi}</td>
                <td>{gr.bagcaAdi}</td>
                <td className="action-buttons">
                  <button onClick={() => handleEdit(gr)}>Redaktə</button>
                  <button onClick={() => handleDelete(gr.id)} className="delete">Sil</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default ManageGroups;
