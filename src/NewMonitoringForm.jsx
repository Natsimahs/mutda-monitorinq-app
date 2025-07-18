// src/NewMonitoringForm.jsx

import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db } from './firebase';
import NewQuestionBlock from './NewQuestionBlock.jsx';
import SignaturePad from './SignaturePad.jsx';
import { getAuth } from 'firebase/auth';

import monitoringQuestions from './monitoringQuestions';

// Komponentlər hər addım üçün (əvvəlki kimi)
const Step1 = ({ data, setData, kindergartens }) => {
  const rayonlar = [...new Set(kindergartens.map(kg => kg.rayon))];
  const bagcalarInRayon = kindergartens.filter(kg => kg.rayon === data.rayon);
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'rayon') { setData({ ...data, rayon: value, bagcaId: '' }); } 
    else { setData({ ...data, [name]: value }); }
  };
  return (
    <div>
      <h3>Addım 1: Ümumi Məlumatlar</h3>
      <div className="form-group"><label>Rayon seçin *</label><select name="rayon" value={data.rayon} onChange={handleChange} required><option value="">Rayon seçin...</option>{rayonlar.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
      <div className="form-group"><label>Müəssisəni seçin *</label><select name="bagcaId" value={data.bagcaId} onChange={handleChange} required disabled={!data.rayon}><option value="">Bağça seçin...</option>{bagcalarInRayon.map(b => <option key={b.id} value={b.id}>{b.adi}</option>)}</select></div>
    </div>
  );
};

const Step2 = ({ data, setData }) => {
  const handleChange = (e) => {
    setData({ ...data, [e.target.name]: e.target.value });
  };
  return (
    <div>
      <h3>Addım 2: Uşaq Sayları</h3>
      <div className="numeric-inputs-container">
        <div className="numeric-input-item"><label htmlFor="usaqTutumu">Uşaq tutumu:</label><input id="usaqTutumu" name="usaqTutumu" type="number" value={data.usaqTutumu || ''} onChange={handleChange} /></div>
        <div className="numeric-input-item"><label htmlFor="mtisUsaqSayi">MTİS üzrə uşaq sayı:</label><input id="mtisUsaqSayi" name="mtisUsaqSayi" type="number" value={data.mtisUsaqSayi || ''} onChange={handleChange} /></div>
        <div className="numeric-input-item"><label htmlFor="sifarisEdilenQida">Sifariş edilən qida sayı:</label><input id="sifarisEdilenQida" name="sifarisEdilenQida" type="number" value={data.sifarisEdilenQida || ''} onChange={handleChange} /></div>
        <div className="numeric-input-item"><label htmlFor="faktikiUsaqSayi">Faktiki uşaq sayı:</label><input id="faktikiUsaqSayi" name="faktikiUsaqSayi" type="number" value={data.faktikiUsaqSayi || ''} onChange={handleChange} /></div>
      </div>
    </div>
  );
};

const Step3 = ({ data, setData, onFileChange }) => {
  const handleAnswerChange = (index, answer) => {
    const newAnswers = [...data.answers];
    newAnswers[index] = answer;
    setData({ ...data, answers: newAnswers });
  };
  const handleNoteChange = (index, note) => {
    const newNotes = [...data.notes];
    newNotes[index] = note;
    setData({ ...data, notes: newNotes });
  };
  return (
    <div>
      <h3>Addım 3: Monitorinq Sualları</h3>
      {monitoringQuestions.map((q, index) => (
        <NewQuestionBlock
          key={index}
          index={index}
          question={q}
          answer={data.answers[index]}
          note={data.notes[index]}
          file={data.files[index]}
          onAnswerChange={(answer) => handleAnswerChange(index, answer)}
          onNoteChange={(note) => handleNoteChange(index, note)}
          onFileChange={(file) => onFileChange(index, file)}
        />
      ))}
    </div>
  );
};

const Step4 = ({ data, onSignatureChange }) => {
    return (
        <div>
            <h3>Addım 4: İmza</h3>
            {data.signatures.map((sig, index) => (
                <div className="signature-block" key={index}>
                    <div className="signature-inputs">
                        <input type="text" placeholder="Ad, soyad, ata adı" value={sig.adSoyad} onChange={(e) => onSignatureChange(index, 'adSoyad', e.target.value)} />
                        <input type="text" placeholder="Vəzifə" value={sig.vezife} onChange={(e) => onSignatureChange(index, 'vezife', e.target.value)} />
                    </div>
                    <label>İmza:</label>
                    <SignaturePad onSignatureEnd={(imzaData) => onSignatureChange(index, 'imzaData', imzaData)} />
                </div>
            ))}
        </div>
    );
};


const NewMonitoringForm = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [kindergartens, setKindergartens] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [gpsData, setGpsData] = useState({ lat: '', lon: '' });
  const [currentTime, setCurrentTime] = useState(new Date());

  // State-in ilkin yüklənməsi - indi 12 sual üçün düzəldilib
  const getInitialState = () => ({
    rayon: '', bagcaId: '', usaqTutumu: '', mtisUsaqSayi: '', sifarisEdilenQida: '', faktikiUsaqSayi: '',
    answers: Array(monitoringQuestions.length).fill(''),
    notes: Array(monitoringQuestions.length).fill(''),
    files: Array(monitoringQuestions.length).fill(null),
    signatures: Array(6).fill({ adSoyad: '', vezife: '', imzaData: null }),
  });

  const [formData, setFormData] = useState(() => {
    const savedDraft = localStorage.getItem('newMonitoringFormDraft');
    const initialState = getInitialState();
    if (savedDraft) {
      try {
        const parsedData = JSON.parse(savedDraft);
        // Yaddaşdakı datanı ilkin strukturla birləşdiririk
        return { ...initialState, ...parsedData };
      } catch (e) {
        console.error("Qaralama yüklənərkən xəta:", e);
        return initialState;
      }
    }
    return initialState;
  });

  // Avtomatik yadda saxlama
  useEffect(() => {
    // Faylları yaddaşa yazmamaq üçün onları müvəqqəti silirik
    const dataToSave = { ...formData };
    delete dataToSave.files;
    localStorage.setItem('newMonitoringFormDraft', JSON.stringify(dataToSave));
  }, [formData]);

  // Saat, Sayğac və GPS
  useEffect(() => {
    const timerId = setInterval(() => setCurrentTime(new Date()), 1000);
    const stopWatchId = setInterval(() => setElapsedTime(prev => prev + 1), 1000);
    navigator.geolocation.getCurrentPosition(
      (position) => setGpsData({ lat: position.coords.latitude.toFixed(5), lon: position.coords.longitude.toFixed(5) }),
      (error) => console.error("GPS xətası:", error)
    );
    return () => {
      clearInterval(timerId);
      clearInterval(stopWatchId);
    };
  }, []);

  useEffect(() => {
    const fetchKindergartens = async () => {
      setIsLoading(true);
      const querySnapshot = await getDocs(collection(db, "bagcalar"));
      setKindergartens(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setIsLoading(false);
    };
    fetchKindergartens();
  }, []);

  const totalSteps = 4;
  const progress = ((currentStep - 1) / (totalSteps - 1)) * 100;

  const handleFileChange = (index, file) => {
    const newFiles = [...formData.files];
    newFiles[index] = file;
    setFormData({ ...formData, files: newFiles });
  };

  const handleSignatureChange = (index, field, value) => {
    const newSignatures = [...formData.signatures];
    newSignatures[index] = { ...newSignatures[index], [field]: value };
    setFormData({ ...formData, signatures: newSignatures });
  };

  const saveAsDraft = () => {
      alert("Forma qaralama kimi brauzer yaddaşında saxlanıldı!");
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const auth = getAuth();
    const user = auth.currentUser;

    try {
        const fileURLs = await Promise.all(
            formData.files.map(async (file) => {
                if (!file) return null;
                const storage = getStorage();
                const filePath = `uploads/${user.uid}/${Date.now()}_${file.name}`;
                const storageRef = ref(storage, filePath);
                await uploadBytes(storageRef, file);
                return await getDownloadURL(storageRef);
            })
        );

        const dataToSave = { ...formData };
        delete dataToSave.files;
        dataToSave.fileURLs = fileURLs;

        const finalData = {
            ...dataToSave,
            authorId: user.uid,
            authorEmail: user.email,
            gonderilmeTarixi: new Date().toISOString(),
            gps: gpsData,
            monitorinqMuddeti: elapsedTime,
        };
        
        const docRef = doc(collection(db, "newMonitorinqHesabatlari"));
        await setDoc(docRef, finalData);
        alert("Monitorinq uğurla təsdiqləndi!");
        localStorage.removeItem('newMonitoringFormDraft');
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
      if (currentStep === 1 && (!formData.rayon || !formData.bagcaId)) {
        alert("Zəhmət olmasa, rayon və müəssisəni seçin.");
        return;
      }
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => { if (currentStep > 1) { setCurrentStep(currentStep - 1); } };

  const renderStep = () => {
    switch (currentStep) {
      case 1: return <Step1 data={formData} setData={setFormData} kindergartens={kindergartens} />;
      case 2: return <Step2 data={formData} setData={setFormData} />;
      case 3: return <Step3 data={formData} setData={setFormData} onFileChange={handleFileChange} />;
      case 4: return <Step4 data={formData} onSignatureChange={handleSignatureChange} />;
      default: return <Step1 data={formData} setData={setFormData} kindergartens={kindergartens} />;
    }
  };

  return (
    <div className="new-monitoring-form-container">
      <div className="form-top-bar">
          <div className="form-main-title">Məktəbəqədər təhsil müəssisəsində monitorinq aparılması</div>
          <div className="header-info-bar">
            <span><strong>Tarix:</strong> {currentTime.toLocaleDateString('az-AZ')}</span>
            <span><strong>Saat:</strong> {currentTime.toLocaleTimeString('az-AZ')}</span>
            <span><strong>Müddət:</strong> {new Date(elapsedTime * 1000).toISOString().substr(11, 8)}</span>
            <span><strong>GPS:</strong> {gpsData.lat ? `${gpsData.lat}, ${gpsData.lon}`: 'Alınır...'}</span>
          </div>
      </div>
      
      <button onClick={saveAsDraft} className="draft-button">Qaralama kimi yadda saxla</button>

      <div className="progress-bar-container"><div className="progress-bar" style={{ width: `${progress}%` }}></div></div>
      <div className="step-counter">Addım {currentStep} / {totalSteps}</div>
      <div className="form-content">{isLoading ? <p>Məlumatlar yüklənir...</p> : renderStep()}</div>
      <div className="navigation-buttons">
        {currentStep > 1 && (<button onClick={prevStep} className="nav-button prev">Geri</button>)}
        {currentStep < totalSteps ? 
            (<button onClick={nextStep} className="nav-button next">Növbəti</button>) : 
            (<button onClick={handleSubmit} className="nav-button submit" disabled={isSubmitting}>{isSubmitting ? 'Göndərilir...' : 'Təsdiqlə'}</button>)
        }
      </div>
    </div>
  );
};

export default NewMonitoringForm;
