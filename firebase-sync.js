import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDOvSG7o1eoHONE1sK8kxBXYqkiFMiaheI",
  authDomain: "italian-dental-center-b6807.firebaseapp.com",
  projectId: "italian-dental-center-b6807",
  storageBucket: "italian-dental-center-b6807.firebasestorage.app",
  messagingSenderId: "383980456921",
  appId: "1:383980456921:web:291491d60c7a3f661b67c8",
  measurementId: "G-V9VPZ1CN6V"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const docRef = doc(db, "clinic_data", "main_dashboard");

async function migrateDataToFirebase() {
  try {
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      const localPatients = localStorage.getItem('patients') || '[]';
      const localAppointments = localStorage.getItem('appointments') || '[]';
      const localFinances = localStorage.getItem('finances') || '[]';
      const localLab = localStorage.getItem('labData') || '[]';
      await setDoc(docRef, {
        patients: JSON.parse(localPatients),
        appointments: JSON.parse(localAppointments),
        finances: JSON.parse(localFinances),
        labData: JSON.parse(localLab),
        lastUpdated: new Date().toISOString()
      });
    }
  } catch (error) {}
}

onSnapshot(docRef, (docSnap) => {
  if (docSnap.exists()) {
    const cloudData = docSnap.data();
    localStorage.setItem('patients', JSON.stringify(cloudData.patients || []));
    localStorage.setItem('appointments', JSON.stringify(cloudData.appointments || []));
    localStorage.setItem('finances', JSON.stringify(cloudData.finances || []));
    localStorage.setItem('labData', JSON.stringify(cloudData.labData || []));
    if (typeof updateDashboardUI === 'function') { updateDashboardUI(); }
    else if (typeof renderAll === 'function') { renderAll(); }
  }
});

async function saveToCloud(key, newData) {
  try {
    const docSnap = await getDoc(docRef);
    let currentData = docSnap.exists() ? docSnap.data() : { patients: [], appointments: [], finances: [], labData: [] };
    currentData[key] = newData;
    currentData.lastUpdated = new Date().toISOString();
    await setDoc(docRef, currentData);
  } catch (error) {}
}

window.originalSetItem = localStorage.setItem;
localStorage.setItem = function(key, value) {
  window.originalSetItem(key, value);
  if (['patients', 'appointments', 'finances', 'labData'].includes(key)) {
    try {
      saveToCloud(key, JSON.parse(value));
    } catch (e) {}
  }
};
migrateDataToFirebase();
