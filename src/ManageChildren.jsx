// src/ManageChildren.jsx

import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import * as XLSX from 'xlsx';

const ManageChildren = () => {
  const [children, setChildren] = useState([]);
  const [groups, setGroups] = useState([]);
  const [kindergartens, setKindergartens] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [dob, setDob] = useState('');
  const [groupId, setGroupId] = useState('');
  const [isEditing, setIsEditing] = useState(null);

  const fetchData = async () => {
    setIsLoading(true);
    const kgSnapshot = await getDocs(collection(db, "bagcalar"));
    const kgList = kgSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setKindergartens(kgList);

    const grSnapshot = await getDocs(collection(db, "qruplar"));
    const grList = grSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setGroups(grList);

    const chSnapshot = await getDocs(collection(db, "usaqlar"));
    const chList = chSnapshot.docs.map(doc => {
      const gr = grList.find(g => g.id === doc.data().qrupId);
      return { id: doc.id, ...doc.data(), qrupAdi: gr ? `${gr.adi} (${gr.terbiyeciAdi})` : 'Bilinməyən' };
    });
    setChildren(chList);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!firstName || !lastName || !groupId) {
      alert("Ad, Soyad və Qrup mütləq daxil edilməlidir.");
      return;
    }
    const dataToSave = { ad: firstName, soyad: lastName, ataAdi: fatherName, dogumTarixi: dob, qrupId: groupId };
    if (isEditing) {
      await updateDoc(doc(db, "usaqlar", isEditing), dataToSave);
    } else {
      await addDoc(collection(db, "usaqlar"), dataToSave);
    }
    resetForm();
    fetchData();
  };

  const handleEdit = (child) => {
    setIsEditing(child.id);
    setFirstName(child.ad);
    setLastName(child.soyad);
    setFatherName(child.ataAdi || '');
    setDob(child.dogumTarixi || '');
    setGroupId(child.qrupId);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Bu uşağın məlumatlarını silmək istədiyinizə əminsiniz?")) {
      await deleteDoc(doc(db, "usaqlar", id));
      fetchData();
    }
  };

  const resetForm = () => {
    setIsEditing(null);
    setFirstName('');
    setLastName('');
    setFatherName('');
    setDob('');
    setGroupId('');
  };

  // YENİ: Uşaqları Excel-dən import edən funksiya
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

        const requiredColumns = ['ad', 'soyad', 'qrupAdi', 'terbiyeciAdi', 'bagcaAdi'];
        if (json.length === 0 || !requiredColumns.every(col => json[0].hasOwnProperty(col))) {
          alert(`Excel faylı boşdur və ya faylda tələb olunan sütunlar (${requiredColumns.join(', ')}) yoxdur.`);
          setIsImporting(false);
          return;
        }

        // Qrupları tapmaq üçün bir xəritə yaradırıq
        const groupMap = new Map();
        groups.forEach(gr => {
            const kg = kindergartens.find(k => k.id === gr.bagcaId);
            if (kg) {
                const key = `${gr.adi}-${gr.terbiyeciAdi}-${kg.adi}`.toLowerCase();
                groupMap.set(key, gr.id);
            }
        });

        const batch = writeBatch(db);
        let errorCount = 0;

        json.forEach((row) => {
          const key = `${row.qrupAdi}-${row.terbiyeciAdi}-${row.bagcaAdi}`.toLowerCase();
          const groupId = groupMap.get(key);
          
          if (groupId) {
            const newChildRef = doc(collection(db, "usaqlar"));
            batch.set(newChildRef, {
              ad: row.ad,
              soyad: row.soyad,
              ataAdi: row.ataAdi || '',
              dogumTarixi: row.dogumTarixi || '',
              qrupId: groupId
            });
          } else {
            console.warn(`"${row.bagcaAdi}" bağçasında, "${row.terbiyeciAdi}" adlı tərbiyəçinin "${row.qrupAdi}" qrupu tapılmadı. Bu sətir import edilmədi.`);
            errorCount++;
          }
        });

        await batch.commit();
        const successCount = json.length - errorCount;
        let alertMessage = `${successCount} uşaq uğurla sistemə əlavə edildi!`;
        if (errorCount > 0) {
          alertMessage += `\n${errorCount} sətirdə isə uyğun qrup tapılmadığı üçün xəta baş verdi. Detallar üçün konsola baxın.`;
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
        <p>Uşaqların siyahısını `.xlsx` formatında yükləyin. Faylda `ad`, `soyad`, `ataAdi`, `dogumTarixi`, `qrupAdi`, `terbiyeciAdi`, `bagcaAdi` sütunları olmalıdır.</p>
        <input type="file" accept=".xlsx, .xls" onChange={handleExcelImport} disabled={isImporting} />
        {isImporting && <p>Import edilir, zəhmət olmasa gözləyin...</p>}
      </div>
      <hr />
      <h3>Əl ilə İdarəetmə</h3>
      <form onSubmit={handleSubmit} className="management-form">
        <input type="text" placeholder="Ad" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
        <input type="text" placeholder="Soyad" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
        <input type="text" placeholder="Ata adı" value={fatherName} onChange={(e) => setFatherName(e.target.value)} />
        <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
        <select value={groupId} onChange={(e) => setGroupId(e.target.value)} required>
          <option value="">Qrup seçin...</option>
          {groups.map(gr => <option key={gr.id} value={gr.id}>{`${gr.adi} (${gr.terbiyeciAdi})`}</option>)}
        </select>
        <div className="form-buttons">
          <button type="submit">{isEditing ? 'Yenilə' : 'Əlavə Et'}</button>
          {isEditing && <button type="button" onClick={resetForm}>Ləğv Et</button>}
        </div>
      </form>
      <hr />
      <h3>Mövcud Uşaqlar</h3>
      {isLoading ? <p>Yüklənir...</p> : (
        <table className="management-table">
          <thead>
            <tr>
              <th>Ad, Soyad, Ata Adı</th>
              <th>Qrup (Tərbiyəçi)</th>
              <th>Əməliyyatlar</th>
            </tr>
          </thead>
          <tbody>
            {children.map(ch => (
              <tr key={ch.id}>
                <td>{`${ch.ad} ${ch.soyad} ${ch.ataAdi || ''}`}</td>
                <td>{ch.qrupAdi}</td>
                <td className="action-buttons">
                  <button onClick={() => handleEdit(ch)}>Redaktə</button>
                  <button onClick={() => handleDelete(ch.id)} className="delete">Sil</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default ManageChildren;
