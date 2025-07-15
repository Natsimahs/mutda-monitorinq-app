// src/MonitoringForm.jsx - formRef XƏTASININ DÜZƏLDİLDİYİ KOD

import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc } from "firebase/firestore";
import { db } from './firebase';
import QuestionBlock from './QuestionBlock.jsx';
import SignaturePad from './SignaturePad.jsx';
import ReportPDF from './ReportPDF.jsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { getAuth } from "firebase/auth"; // Bu sətri ən yuxarıya, digər importların yanına əlavə edin


// Data (dəyişməyib)
const muessiseData = { "Xətai": [ "10 saylı uşaq-körpələr evi", "17 saylı uşaq-körpələr evi", "22 saylı körpələr evi-uşaq bağçası", "24 saylı uşaq körpələr evi", "25 saylı körpələr evi-uşaq bağçası", "31 saylı körpələr evi-uşaq bağçası", "40 saylı körpələr evi-uşaq bağçası", "44 saylı körpələr evi-uşaq bağçası", "62 saylı körpələr evi-uşaq bağçası", "64 saylı körpələr evi-uşaq bağçası", "74 saylı uşaq-körpələr evi", "78 saylı körpələr evi-uşaq bağçası", "85 saylı körpələr evi-uşaq bağçası", "138 saylı körpələr evi-uşaq bağçası", "165 saylı körpələr evi-uşaq bağçası", "171 saylı körpələr evi-uşaq bağçası", "242 saylı körpələr evi-uşaq bağçası", "256 saylı körpələr evi-uşaq bağçası", "263 saylı körpələr evi-uşaq bağçası" ], "Yasamal": [ "21 saylı körpələr evi-uşaq bağçası", "37 saylı körpələr evi-uşaq bağçası", "46 saylı uşaq bağçası", "53 saylı körpələr evi-uşaq bağçası", "55 saylı körpələr evi-uşaq bağçası", "78 saylı körpələr evi-uşaq bağçası", "86 saylı körpələr evi-uşaq bağçası", "95 saylı körpələr evi-uşaq bağçası", "157 saylı körpələr evi-uşaq bağçası", "172 saylı körpələr evi-uşaq bağçası", "182 saylı körpələr evi-uşaq bağçası", "194 saylı körpələr evi-uşaq bağçası", "212 saylı körpələr evi-uşaq bağçası", "240 saylı körpələr evi-uşaq bağçası", "299 saylı körpələr evi-uşaq bağçası" ], "Səbail": [ "8 saylı körpələr evi-uşaq bağçası", "34 saylı körpələr evi-uşaq bağçası", "47 saylı körpələr evi-uşaq bağçası", "49 saylı körpələr evi-uşaq bağçası", "88 saylı körpələr evi-uşaq bağçası", "91 saylı körpələr evi-uşaq bağçası", "189 saylı körpələr evi-uşaq bağçası" ], "Qaradağ": [ "14 saylı körpələr evi-uşaq bağçası", "29 saylı körpələr evi-uşaq bağçası", "59 saylı körpələr evi-uşaq bağçası", "67 saylı körpələr evi-uşaq bağçası", "83 saylı körpələr evi-uşaq bağçası", "116 saylı körpələr evi-uşaq bağçası", "151 saylı körpələr evi-uşaq bağçası", "154 saylı körpələr evi-uşaq bağçası", "160 saylı körpələr evi-uşaq bağçası", "191 saylı körpələr evi-uşaq bağçası", "216 saylı körpələr evi-uşaq bağçası", "221 saylı körpələr evi-uşaq bağçası", "271 saylı körpələr evi-uşaq bağçası", "289 saylı körpələr evi-uşaq bağçası", "305 saylı körpələr evi-uşaq bağçası", "317 saylı körpələr evi-uşaq bağçası", "320 saylı körpələr evi-uşaq bağçası", "323 saylı körpələr evi-uşaq bağçası" ], "Suraxanı": [ "4 saylı körpələr evi-uşaq bağçası", "33 saylı körpələr evi-uşaq bağçası", "68 saylı körpələr evi-uşaq bağçası", "87 saylı körpələr evi-uşaq bağçası", "92 saylı körpələr evi-uşaq bağçası", "103 saylı körpələr evi-uşaq bağçası", "108 saylı körpələr evi-uşaq bağçası", "141 saylı körpələr evi-uşaq bağçası", "208 saylı körpələr evi-uşaq bağçası", "232 saylı körpələr evi-uşaq bağçası", "278 saylı körpələr evi-uşaq bağçası", "281 saylı körpələr evi-uşaq bağçası", "282 saylı körpələr evi-uşaq bağçası", "304 saylı körpələr evi-uşaq bağçası", "312 saylı körpələr evi-uşaq bağçası" ], "Nizami": [ "13 saylı körpələr evi-uşaq bağçası", "16 saylı körpələr evi-uşaq bağçası", "23 saylı körpələr evi-uşaq bağçası", "32 saylı körpələr evi-uşaq bağçası", "38 saylı körpələr evi-uşaq bağçası", "113 saylı körpələr evi-uşaq bağçası", "127 saylı körpələr evi-uşaq bağçası", "129 saylı körpələr evi-uşaq bağçası", "214 saylı körpələr evi-uşaq bağçası", "258 saylı körpələr evi-uşaq bağçası", "260 saylı körpələr evi-uşaq bağçası", "266 saylı körpələr evi-uşaq bağçası" ], "Binəqədi": [ "9 saylı körpələr evi-uşaq bağçası", "27 saylı körpələr evi-uşaq bağçası", "35 saylı körpələr evi-uşaq bağçası", "43 saylı körpələr evi-uşaq bağçası", "80 saylı körpələr evi-uşaq bağçası", "90 saylı körpələr evi-uşaq bağçası", "99 saylı körpələr evi-uşaq bağçası", "100 saylı körpələr evi-uşaq bağçası", "110 saylı körpələr evi-uşaq bağçası", "136 saylı körpələr evi-uşaq bağçası", "143 saylı körpələr evi-uşaq bağçası", "144 saylı körpələr evi-uşaq bağçası", "179 saylı körpələr evi-uşaq bağçası", "205 saylı körpələr evi-uşaq bağçası", "248 saylı körpələr evi-uşaq bağçası", "276 saylı körpələr evi-uşaq bağçası", "297 saylı körpələr evi-uşaq bağçası", "300 saylı körpələr evi-uşaq bağçası", "301 saylı körpələr evi-uşaq bağçası", "303 saylı körpələr evi-uşaq bağçası", "314 saylı körpələr evi-uşaq bağçası" ], "Xəzər": [ "15 saylı körpələr evi-uşaq bağçası", "36 saylı körpələr evi-uşaq bağçası", "41 saylı körpələr evi-uşaq bağçası", "56 saylı körpələr evi-uşaq bağçası", "120 saylı körpələr evi-uşaq bağçası", "121 saylı körpələr evi-uşaq bağçası", "123 saylı körpələr evi-uşaq bağçası", "134 saylı körpələr evi-uşaq bağçası", "149 saylı körpələr evi-uşaq bağçası", "196 saylı körpələr evi-uşaq bağçası", "218 saylı körpələr evi-uşaq bağçası", "225 saylı körpələr evi-uşaq bağçası", "227 saylı körpələr evi-uşaq bağçası", "231 saylı körpələr evi-uşaq bağçası", "234 saylı körpələr evi-uşaq bağçası", "235 saylı körpələr evi-uşaq bağçası", "252 saylı körpələr evi-uşaq bağçası", "262 saylı körpələr evi-uşaq bağçası", "311 saylı körpələr evi-uşaq bağçası", "325 saylı körpələr evi-uşaq bağçası" ], "Sabunçu": [ "7 saylı körpələr evi-uşaq bağçası", "28 saylı körpələr evi-uşaq bağçası", "48 saylı körpələr evi-uşaq bağçası", "51 saylı körpələr evi-uşaq bağçası", "69 saylı körpələr evi-uşaq bağçası", "71 saylı körpələr evi-uşaq bağçası", "72 saylı körpələr evi-uşaq bağçası", "94 saylı körpələr evi-uşaq bağçası", "109 saylı körpələr evi-uşaq bağçası", "112 saylı körpələr evi-uşaq bağçası", "131 saylı körpələr evi-uşaq bağçası", "137 saylı körpələr evi-uşaq bağçası", "159 saylı körpələr evi-uşaq bağçası", "169 saylı körpələr evi-uşaq bağçası", "201 saylı körpələr evi-uşaq bağçası", "202 saylı körpələr evi-uşaq bağçası", "222 saylı körpələr evi-uşaq bağçası", "236 saylı körpələr evi-uşaq bağçası", "247 saylı körpələr evi-uşaq bağçası", "255 saylı körpələr evi-uşaq bağçası", "268 saylı körpələr evi-uşaq bağçası", "272 saylı körpələr evi-uşaq bağçası", "287 saylı körpələr evi-uşaq bağçası", "293 saylı körpələr evi-uşaq bağçası", "296 saylı körpələr evi-uşaq bağçası", "318 saylı körpələr evi-uşaq bağçası", "327 saylı körpələr evi-uşaq bağçası" ], "Pirallahı": [ "5 saylı körpələr evi-uşaq bağçası", "82 saylı körpələr evi-uşaq bağçası", "230 saylı körpələr evi-uşaq bağçası" ], "Nərimanov": [ "1 saylı körpələr evi-uşaq bağçası", "26 saylı körpələr evi-uşaq bağçası", "66 saylı körpələr evi-uşaq bağçası", "79 saylı körpələr evi-uşaq bağçası", "84 saylı körpələr evi-uşaq bağçası", "104 saylı körpələr evi-uşaq bağçası", "193 saylı körpələr evi-uşaq bağçası", "210 saylı körpələr evi-uşaq bağçası" ], "Nəsimi": [ "18 saylı körpələr evi-uşaq bağçası", "20 saylı körpələr evi-uşaq bağçası", "42 saylı körpələr evi-uşaq bağçası", "50 saylı körpələr evi-uşaq bağçası", "60 saylı körpələr evi-uşaq bağçası", "125 saylı körpələr evi-uşaq bağçası", "153 saylı körpələr evi-uşaq bağçası" ] };
const rayonlar = Object.keys(muessiseData);
const emekdashlar = ["Ziya Əliyev", "Mürvət Əliyev", "Səbinə Nağıyeva", "Rüzgar Bağırov"];
const monitoringQuestions = [ "Giriş-çıxış nəzarəti mövcuddurmu?", "Həyətyanı sahənin təmizliyinə riayət olunurmu?", "Dəhliz və otaqlarda təmizliyə riayət olunurmu?", "Sanitar qovşaqlarda təmizliyə riayət olunurmu?", "Gigiyenik vasitələrlə təmin edilib və təyinatı üzrə istifadə olunurmu?", "Mətbəxdə sanitar-gigiyenik qaydalara riayət olunurmu?", "Yemək menyusu ilə uyğundurmu?", "Vaxtı keçmiş qida məhsulları aşkar edilməmişdir (məhsulun üzərində qeyd olunan tarixə baxılmalıdır)?", "İnventar kitablanmada qeydiyyatı aparılırmı?", "Təsərrüfat mallarının/vasitələrinin uçotu jurnalı var və işləkdirmi?", "Texniki işçilərin iş bölgüsü var və riayət olunurmu?", "Texniki işçilərlə işə davamiyyət jurnalında qeydiyyat aparılırmı?" ];

const MonitoringForm = () => {
    const getInitialState = () => ({ startTime: Date.now(), rayon: '', muessise: '', secilmisEmekdashlar: {}, gps: { lat: '', lon: '', accuracy: '', altitude: '' }, usaqTutumu: '', mtisUsaqSayi: '', sifarisEdilenQida: '', faktikiUsaqSayi: '', signatures: Array(6).fill({ adSoyad: '', vezife: '', imzaData: null }), });
    
    const [formData, setFormData] = useState(() => {
        const savedData = localStorage.getItem('monitoringFormData');
        const initialData = getInitialState();
        if (savedData) {
            try {
                const parsedData = JSON.parse(savedData);
                return { ...initialData, ...parsedData };
            } catch (error) {
                console.error("localStorage-dan data oxunarkən xəta:", error);
                localStorage.removeItem('monitoringFormData');
                return initialData;
            }
        }
        return initialData;
    });

    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [submittedData, setSubmittedData] = useState(null);
    const [elapsedTime, setElapsedTime] = useState(0);
    const pdfReportRef = useRef();
    
    // DÜZƏLİŞ BURADADIR: formRef yenidən əlavə edildi
    const formRef = useRef();

    useEffect(() => { localStorage.setItem('monitoringFormData', JSON.stringify(formData)); const timer = setInterval(() => { if (formData.startTime) { setElapsedTime(Math.floor((Date.now() - formData.startTime) / 1000)); } }, 1000); return () => clearInterval(timer); }, [formData]);
    useEffect(() => { if (formData.gps?.lat) return; if (navigator.geolocation) { navigator.geolocation.getCurrentPosition( (position) => setFormData(prev => ({ ...prev, gps: { lat: position.coords.latitude.toFixed(5), lon: position.coords.longitude.toFixed(5), accuracy: position.coords.accuracy.toFixed(1), altitude: position.coords.altitude ? position.coords.altitude.toFixed(1) : 'N/A' } })), (error) => console.error("GPS xətası:", error) ); } }, [formData.gps]);
    const formatTime = (seconds) => { const h = Math.floor(seconds / 3600).toString().padStart(2, '0'); const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0'); const s = (seconds % 60).toString().padStart(2, '0'); return `${h}:${m}:${s}`; };
    const handleInputChange = (field, subField, value) => { setFormData(prev => subField ? { ...prev, [field]: { ...prev[field], [subField]: value } } : { ...prev, [field]: value }); };
    const handleCheckboxChange = (e) => { const { name, checked } = e.target; setFormData(prev => ({ ...prev, secilmisEmekdashlar: { ...prev.secilmisEmekdashlar, [name]: checked } })); };
    const handleSignatureChange = (index, field, value) => { const newSignatures = [...formData.signatures]; newSignatures[index] = { ...newSignatures[index], [field]: value }; setFormData(prev => ({ ...prev, signatures: newSignatures })); };

    const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const auth = getAuth();
    const currentUser = auth.currentUser;

    if (!currentUser) {
        alert("Sessiyanız bitib. Zəhmət olmasa, yenidən daxil olun.");
        setIsLoading(false);
        return;
    }

    const finalData = {
        ...formData,
        monitorinqVaxtı: formatTime(elapsedTime),
        gonderilmeTarixi: new Date().toISOString(),
        authorId: currentUser.uid, // GÖNDƏRƏNİN ID-Sİ ƏLAVƏ EDİLDİ
        authorEmail: currentUser.email // Göndərənin emailini də əlavə edək
    };

    try {
        const docRef = await addDoc(collection(db, "monitorinqHesabatlari"), finalData);
        console.log("Sənəd uğurla yazıldı, ID: ", docRef.id);
        setSubmittedData(finalData);
        setIsSubmitted(true);
        localStorage.removeItem('monitoringFormData');
    } catch (error) {
        console.error("Sənəd yazılarkən xəta baş verdi: ", error);
        alert("Məlumatlar göndərilərkən xəta baş verdi.");
    } finally {
        setIsLoading(false);
    }
};

    const handleNewForm = () => {
        setIsSubmitted(false);
        setSubmittedData(null);
        setFormData(getInitialState());
    };

    const handlePdfDownload = async () => {
        const reportElement = pdfReportRef.current;
        if (!reportElement) return;
        const canvas = await html2canvas(reportElement, { scale: 2, useCORS: true, });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = imgWidth / imgHeight;
        const imgHeightOnPdf = pdfWidth / ratio;
        let heightLeft = imgHeightOnPdf;
        let position = 0;
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeightOnPdf);
        heightLeft -= pdfHeight;
        while (heightLeft > 0) {
            position = heightLeft - imgHeightOnPdf;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeightOnPdf);
            heightLeft -= pdfHeight;
        }
        pdf.save(`monitorinq-hesabati-${Date.now()}.pdf`);
    };

    if (isSubmitted) {
        return (
            <>
                <div className="form-container submission-success">
                    <h2>Monitorinq arayışı qeydə alındı!</h2>
                    <p>Məlumatlarınız mərkəzi bazaya uğurla göndərildi.</p>
                    <div className='button-group'>
                        <button onClick={handleNewForm} className="action-button new-form-button">Yeni form doldur</button>
                        <button onClick={handlePdfDownload} className="action-button">PDF olaraq yüklə</button>
                    </div>
                </div>
                <ReportPDF ref={pdfReportRef} data={submittedData} />
            </>
        );
    }

    return (
        <form ref={formRef} onSubmit={handleSubmit} className="form-container">
            <div className="form-header"> <h1>Məktəbəqədər Təhsil Müəssisələri üzrə Monitorinq</h1> <div className="sticky-header"> <div className="timer">Keçən vaxt: {formatTime(elapsedTime)}</div> <div className="location-info"><strong>Məkan məlumatı:</strong>{formData.gps.lat ? <span> Lat: {formData.gps.lat}, Lon: {formData.gps.lon} (Dəqiqlik: {formData.gps.accuracy}m)</span> : <span>GPS məlumatı alınır...</span>}</div> </div> </div>
            <fieldset><legend>Ümumi məlumatlar</legend> <label>Rayon: *</label> <select value={formData.rayon} onChange={(e) => { handleInputChange('muessise', null, ''); handleInputChange('rayon', null, e.target.value); }} required><option value="">Rayon seçin...</option>{rayonlar.map(r => <option key={r} value={r}>{r}</option>)}</select> <label>Müəssisə: *</label> <select value={formData.muessise} onChange={(e) => handleInputChange('muessise', null, e.target.value)} required disabled={!formData.rayon}><option value="">Müəssisə seçin...</option>{formData.rayon && muessiseData[formData.rayon]?.map(m => <option key={m} value={m}>{m}</option>)}</select> <label>Monitorinqi həyata keçirən əməkdaşlar: *</label> <div className="checkbox-group">{emekdashlar.map(name => (<label key={name}><input type="checkbox" name={name} checked={!!formData.secilmisEmekdashlar[name]} onChange={handleCheckboxChange} /> {name}</label>))}</div> </fieldset>
            <fieldset><legend>Müəssisədə aparılan monitorinqin nəticələri barədə arayış</legend> <div className="numeric-inputs-container"> <div className="numeric-input-item"><label htmlFor="usaqTutumu">Uşaq tutumu:</label><input id="usaqTutumu" type="number" value={formData.usaqTutumu} onChange={e => handleInputChange('usaqTutumu', null, e.target.value)} /></div> <div className="numeric-input-item"><label htmlFor="mtisUsaqSayi">MTİS üzrə uşaq sayı:</label><input id="mtisUsaqSayi" type="number" value={formData.mtisUsaqSayi} onChange={e => handleInputChange('mtisUsaqSayi', null, e.target.value)} /></div> <div className="numeric-input-item"><label htmlFor="sifarisEdilenQida">Sifariş edilən qida sayı:</label><input id="sifarisEdilenQida" type="number" value={formData.sifarisEdilenQida} onChange={e => handleInputChange('sifarisEdilenQida', null, e.target.value)} /></div> <div className="numeric-input-item"><label htmlFor="faktikiUsaqSayi">Faktiki uşaq sayı:</label><input id="faktikiUsaqSayi" type="number" value={formData.faktikiUsaqSayi} onChange={e => handleInputChange('faktikiUsaqSayi', null, e.target.value)} /></div> </div> </fieldset>
            <fieldset><legend>Monitorinq sualları</legend> {monitoringQuestions.map((q, index) => (<QuestionBlock key={index} question={q} index={index} formData={formData} handleInputChange={handleInputChange} />))} </fieldset>
            <fieldset><legend>İmza</legend> {formData.signatures.map((sig, index) => ( <div className="signature-block" key={index}> <div className="signature-inputs"> <input type="text" placeholder="Ad, soyad" value={sig.adSoyad} onChange={(e) => handleSignatureChange(index, 'adSoyad', e.target.value)} /> <input type="text" placeholder="Vəzifə" value={sig.vezife} onChange={(e) => handleSignatureChange(index, 'vezife', e.target.value)} /> </div> <label>İmza:</label> <SignaturePad onSignatureEnd={(data) => handleSignatureChange(index, 'imzaData', data)} /> </div> ))} </fieldset>
            <button type="submit" className="action-button submit-button" disabled={isLoading}> {isLoading ? 'Göndərilir...' : 'Göndər'} </button>
        </form>
    );
};

export default MonitoringForm;
