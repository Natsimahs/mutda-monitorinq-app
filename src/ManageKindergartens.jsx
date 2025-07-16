// src/ManageKindergartens.jsx

import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import * as XLSX from 'xlsx';

const ManageKindergartens = () => {
  const [kindergartens, setKindergartens] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false); // Əl ilə əlavə etmə prosesi üçün
  const [isImporting, setIsImporting] = useState(false);
  
  const [name, setName] = useState('');
  const [rayon, setRayon] = useState('');
  const [isEditing, setIsEditing] = useState(null);

  const rayonlar = ["Xətai", "Yasamal", "Səbail", "Qaradağ", "Suraxanı", "Nizami", "Binəqədi", "Xəzər", "Sabunçu", "Pirallahı", "Nərimanov", "Nəsimi"];

  const fetchKindergartens = async () => {
    setIsLoading(true);
    const querySnapshot = await getDocs(collection(db, "bagcalar"));
    const kgList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setKindergartens(kgList);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchKindergartens();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !rayon) {
      alert("Bağça adı və rayon mütləq daxil edilməlidir.");
      return;
    }
    setIsSubmitting(true);
    const dataToSave = { adi: name, rayon: rayon };

    try {
      if (isEditing) {
        await updateDoc(doc(db, "bagcalar", isEditing), dataToSave);
      } else {
        await addDoc(collection(db, "bagcalar"), dataToSave);
      }
      resetForm();
      fetchKindergartens();
    } catch (error) {
      console.error("Əməliyyat zamanı xəta:", error);
      alert("Məlumatlar yadda saxlanılarkən xəta baş verdi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (kg) => {
    setIsEditing(kg.id);
    setName(kg.adi);
    setRayon(kg.rayon);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Bu bağçanı silmək istədiyinizə əminsiniz?")) {
      try {
        await deleteDoc(doc(db, "bagcalar", id));
        fetchKindergartens();
      } catch (error) {
        console.error("Silmə zamanı xəta:", error);
        alert("Bağça silinərkən xəta baş verdi.");
      }
    }
  };

  const resetForm = () => {
    setIsEditing(null);
    setName('');
    setRayon('');
  };

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

        if (json.length === 0) {
          throw new Error("Excel faylı boşdur.");
        }

        // DÜZƏLİŞ: Sütun adlarını kiçik hərflərə çevirərək yoxlamaq
        const firstRow = json[0];
        const headers = Object.keys(firstRow).map(h => h.toLowerCase());
        if (!headers.includes('adi') || !headers.includes('rayon')) {
          throw new Error("Excel faylında 'adi' və 'rayon' başlıqlı sütunlar olmalıdır.");
        }

        const batch = writeBatch(db);
        json.forEach((row) => {
          // DÜZƏLİŞ: Sütun adlarını case-insensitive (böyük/kiçik hərf fərqi olmadan) tapmaq
          const adiKey = Object.keys(row).find(k => k.toLowerCase() === 'adi');
          const rayonKey = Object.keys(row).find(k => k.toLowerCase() === 'rayon');
          
          if (row[adiKey] && row[rayonKey]) {
            const newKgRef = doc(collection(db, "bagcalar"));
            batch.set(newKgRef, {
              adi: String(row[adiKey]),
              rayon: String(row[rayonKey])
            });
          }
        });

        await batch.commit();
        alert(`${json.length} bağça uğurla sistemə əlavə edildi!`);
        fetchKindergartens();

      } catch (error) {
        console.error("Excel importu zamanı xəta:", error);
        alert(`Fayl import edilərkən xəta baş verdi: ${error.message}`);
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
        <p>Bağçaların siyahısını `.xlsx` formatında yükləyin. Faylda `adi` və `rayon` sütunları olmalıdır.</p>
        <input 
          type="file" 
          accept=".xlsx, .xls"
          onChange={handleExcelImport}
          disabled={isImporting}
        />
        {isImporting && <p>Import edilir, zəhmət olmasa gözləyin...</p>}
      </div>

      <hr />

      <h3>Əl ilə İdarəetmə</h3>
      <form onSubmit={handleSubmit} className="management-form">
        <input type="text" placeholder="Bağçanın adı" value={name} onChange={(e) => setName(e.target.value)} required />
        <select value={rayon} onChange={(e) => setRayon(e.target.value)} required>
          <option value="">Rayon seçin...</option>
          {rayonlar.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <div className="form-buttons">
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Yadda saxlanılır...' : (isEditing ? 'Yenilə' : 'Əlavə Et')}
          </button>
          {isEditing && <button type="button" onClick={resetForm} disabled={isSubmitting}>Ləğv Et</button>}
        </div>
      </form>

      <hr />

      <h3>Mövcud Bağçalar</h3>
      {isLoading ? <p>Yüklənir...</p> : (
        <table className="management-table">
          <thead>
            <tr>
              <th>Adı</th>
              <th>Rayon</th>
              <th>Əməliyyatlar</th>
            </tr>
          </thead>
          <tbody>
            {kindergartens.map(kg => (
              <tr key={kg.id}>
                <td>{kg.adi}</td>
                <td>{kg.rayon}</td>
                <td className="action-buttons">
                  <button onClick={() => handleEdit(kg)}>Redaktə</button>
                  <button onClick={() => handleDelete(kg.id)} className="delete">Sil</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default ManageKindergartens;
