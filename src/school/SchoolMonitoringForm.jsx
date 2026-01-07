// src/school/SchoolMonitoringForm.jsx

import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db } from '../firebase';
import SchoolQuestionBlock from './SchoolQuestionBlock.jsx';
import SchoolSignaturePad from './SchoolSignaturePad.jsx';
import { getAuth } from 'firebase/auth';

import schoolMonitoringQuestions from './schoolMonitoringQuestions';

// Komponentlər hər addım üçün

const Step1 = ({ data, setData, schools }) => {
  const rayonlar = [...new Set((schools || []).map(s => s?.rayon).filter(Boolean))];
  const mekteblerInRayon = (schools || []).filter(s => s?.rayon === data.rayon);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setData({ ...data, [name]: value, ...(name === 'rayon' ? { mektebId: '' } : {}) });
  };

  return (
    <div>
      <h3>Addım 1: Ümumi Məlumatlar</h3>

      <div className="form-group">
        <label>Rayonu seçin *</label>
        <select name="rayon" value={data.rayon || ''} onChange={handleChange}>
          <option value="">Rayon seçin...</option>
          {rayonlar.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>Müəssisəni seçin *</label>
        <select name="mektebId" value={data.mektebId || ''} onChange={handleChange} disabled={!data.rayon}>
          <option value="">Məktəb seçin...</option>
          {mekteblerInRayon.map((b) => (
            <option key={b.id} value={b.id}>{b.adi}</option>
          ))}
        </select>
      </div>
    </div>
  );
};

// Addım 2: Suallar (əvvəl Step3 idi)
const Step2 = ({ data, setData, onFileChange }) => {
  const handleAnswerChange = (index, answer) => {
    const newAnswers = [...(data.answers || [])];
    newAnswers[index] = answer;
    setData({ ...data, answers: newAnswers });
  };

  const handleNoteChange = (index, note) => {
    const newNotes = [...(data.notes || [])];
    newNotes[index] = note;
    setData({ ...data, notes: newNotes });
  };

  return (
    <div>
      <h3>Addım 2: Monitorinq Sualları</h3>

      {schoolMonitoringQuestions.map((q, index) => (
        <SchoolQuestionBlock
          key={index}
          index={index}
          question={q}
          answer={data.answers?.[index] || ''}
          note={data.notes?.[index] || ''}
          file={data.files?.[index] || null}
          onAnswerChange={(answer) => handleAnswerChange(index, answer)}
          onNoteChange={(note) => handleNoteChange(index, note)}
          onFileChange={(file) => onFileChange(index, file)}
          showRadio={index !== schoolMonitoringQuestions.length - 1} // SON SUAL: radio yoxdur
        />
      ))}
    </div>
  );
};

// Addım 3: İmza (əvvəl Step4 idi)
const Step3 = ({ data, onSignatureChange }) => {
  return (
    <div>
      <h3>Addım 3: İmza</h3>
      {(data.signatures || []).map((sig, index) => (
        <div className="signature-block" key={index}>
          <div className="signature-inputs">
            <input
              type="text"
              placeholder="Ad, soyad"
              value={sig?.adSoyad || ''}
              onChange={(e) => onSignatureChange(index, 'adSoyad', e.target.value)}
            />
            <input
              type="text"
              placeholder="Vəzifə"
              value={sig?.vezife || ''}
              onChange={(e) => onSignatureChange(index, 'vezife', e.target.value)}
            />
          </div>
          <div className="signature-pad-container">
            <SchoolSignaturePad
              onSignatureEnd={(imzaData) => onSignatureChange(index, 'imzaData', imzaData)}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

const SchoolMonitoringForm = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [schools, setSchools] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [gpsData, setGpsData] = useState({ lat: '', lon: '' });
  const [currentTime, setCurrentTime] = useState(new Date());

  const totalSteps = 3;

  const getInitialState = () => ({
    // Variant 2: məktəbdə “uşaq sayları” yoxdur — tam çıxarırıq
    rayon: '',
    mektebId: '',

    answers: Array(schoolMonitoringQuestions.length).fill(''),
    notes: Array(schoolMonitoringQuestions.length).fill(''),
    files: Array(schoolMonitoringQuestions.length).fill(null),

    // imza obyektləri ayrı-ayrı olmalıdır (fill() eyni referans verməsin)
    signatures: Array.from({ length: 6 }, () => ({ adSoyad: '', vezife: '', imzaData: null })),
  });

  const [formData, setFormData] = useState(() => {
    const savedDraft = localStorage.getItem('newSchoolMonitoringFormDraft');
    const initialState = getInitialState();

    if (savedDraft) {
      try {
        const parsedData = JSON.parse(savedDraft);

        // Köhnə draft-larda uşaq sayları varsa, təmizləyirik (Variant 2)
        const merged = { ...initialState, ...parsedData };
        delete merged.usaqTutumu;
        delete merged.mtisUsaqSayi;
        delete merged.sifarisEdilenQida;
        delete merged.faktikiUsaqSayi;

        return merged;
      } catch (e) {
        console.error("Draft parse xətası:", e);
        return initialState;
      }
    }
    return initialState;
  });

  // Draft autosave
  useEffect(() => {
    localStorage.setItem('newSchoolMonitoringFormDraft', JSON.stringify(formData));
  }, [formData]);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => setElapsedTime((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Saat
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // GPS
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setGpsData({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => setGpsData({ lat: '', lon: '' })
    );
  }, []);

  // Məktəbləri yüklə
  useEffect(() => {
    const fetchSchools = async () => {
      setIsLoading(true);
      try {
        const snapshot = await getDocs(collection(db, "mektebler"));
        setSchools(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error("Məktəblər yüklənmədi:", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSchools();
  }, []);

  const handleFileChange = (index, file) => {
    const newFiles = [...(formData.files || [])];
    newFiles[index] = file;
    setFormData({ ...formData, files: newFiles });
  };

  const handleSignatureChange = (index, field, value) => {
    const newSigs = [...(formData.signatures || [])];
    newSigs[index] = { ...(newSigs[index] || {}), [field]: value };
    setFormData({ ...formData, signatures: newSigs });
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const auth = getAuth();
    const user = auth.currentUser;

    try {
      const fileURLs = await Promise.all(
        (formData.files || []).map(async (file) => {
          if (!file) return null;
          const storage = getStorage();
          const filePath = `uploads/${user.uid}/${Date.now()}_${file.name}`;
          const storageRef = ref(storage, filePath);
          await uploadBytes(storageRef, file);
          return await getDownloadURL(storageRef);
        })
      );

      // Variant 2: payload-u “təmiz” yığırıq (uşaq sayları yoxdur)
      const dataToSave = {
        rayon: formData.rayon,
        mektebId: formData.mektebId,
        answers: formData.answers,
        notes: formData.notes,
        fileURLs,
        signatures: formData.signatures,

        authorId: user.uid,
        authorEmail: user.email,
        gonderilmeTarixi: new Date().toISOString(),
        gps: gpsData,
        monitorinqMuddeti: elapsedTime,
      };

      const docRef = doc(collection(db, "newMektebMonitorinqHesabatlari"));
      await setDoc(docRef, dataToSave);

      alert("Monitorinq uğurla təsdiqləndi!");
      localStorage.removeItem('newSchoolMonitoringFormDraft');
      window.location.reload();
    } catch (error) {
      console.error("Xəta:", error);
      alert("Hesabat göndərilərkən xəta baş verdi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      if (currentStep === 1 && (!formData.rayon || !formData.mektebId)) {
        alert("Zəhmət olmasa, rayon və müəssisəni seçin.");
        return;
      }
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1 data={formData} setData={setFormData} schools={schools} />;
      case 2:
        return <Step2 data={formData} setData={setFormData} onFileChange={handleFileChange} />;
      case 3:
        return <Step3 data={formData} onSignatureChange={handleSignatureChange} />;
      default:
        return <Step1 data={formData} setData={setFormData} schools={schools} />;
    }
  };

  return (
    <div className="new-monitoring-form-container">
      <div className="form-top-bar">
        <div className="form-main-title">Məktəblərdə monitorinq aparılması</div>
        <div className="header-info-bar">
          <span><strong>Tarix:</strong> {currentTime.toLocaleDateString('az-AZ')}</span>
          <span><strong>Saat:</strong> {currentTime.toLocaleTimeString('az-AZ')}</span>
          <span><strong>Müddət:</strong> {new Date(elapsedTime * 1000).toISOString().substr(11, 8)}</span>
          <span><strong>GPS:</strong> {gpsData.lat ? `${gpsData.lat}, ${gpsData.lon}` : 'Alınır...'}</span>
        </div>
      </div>

      <div className="step-counter">Addım {currentStep} / {totalSteps}</div>

      <div className="form-content">
        {isLoading ? <p>Məlumatlar yüklənir...</p> : renderStep()}
      </div>

      <div className="navigation-buttons">
        {currentStep > 1 && (
          <button onClick={prevStep} className="nav-button prev">Geri</button>
        )}

        {currentStep < totalSteps ? (
          <button onClick={nextStep} className="nav-button next">Növbəti</button>
        ) : (
          <button onClick={handleSubmit} className="nav-button submit" disabled={isSubmitting}>
            {isSubmitting ? 'Göndərilir...' : 'Təsdiqlə'}
          </button>
        )}
      </div>
    </div>
  );
};

export default SchoolMonitoringForm;
