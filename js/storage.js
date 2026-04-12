/* ============================================================
   storage.js — Utilitas localStorage & inisialisasi data awal
   ============================================================ */

'use strict';

// ---- Getter ----
function getAnimals()   { return JSON.parse(localStorage.getItem('pawcare_animals')       || '[]'); }
function getAdoptions() { return JSON.parse(localStorage.getItem('pawcare_adoptions')     || '[]'); }
function getUsers()     { return JSON.parse(localStorage.getItem('pawcare_users')         || '[]'); }
function getNotifs()    { return JSON.parse(localStorage.getItem('pawcare_notifications') || '[]'); }
function getReports()   { return JSON.parse(localStorage.getItem('pawcare_reports')       || '[]'); }
function getBoardings()   { return JSON.parse(localStorage.getItem('pawcare_boardings')     || '[]'); }
function getComplaints()  { return JSON.parse(localStorage.getItem('pawcare_complaints')   || '[]'); }
function getDonations()   { return JSON.parse(localStorage.getItem('pawcare_donations')    || '[]'); }
function getSession()     { return JSON.parse(localStorage.getItem('pawcare_session')       || 'null'); }

// ---- Setter ----
function saveAnimals(data)   { localStorage.setItem('pawcare_animals',       JSON.stringify(data)); }
function saveAdoptions(data) { localStorage.setItem('pawcare_adoptions',     JSON.stringify(data)); }
function saveUsers(data)     { localStorage.setItem('pawcare_users',         JSON.stringify(data)); }
function saveNotifs(data)    { localStorage.setItem('pawcare_notifications', JSON.stringify(data)); }
function saveReports(data)   { localStorage.setItem('pawcare_reports',       JSON.stringify(data)); }
function saveBoardings(data)   { localStorage.setItem('pawcare_boardings',   JSON.stringify(data)); }
function saveComplaints(data)  { localStorage.setItem('pawcare_complaints', JSON.stringify(data)); }
function saveDonations(data)   { localStorage.setItem('pawcare_donations',  JSON.stringify(data)); }
function saveSession(data)     { localStorage.setItem('pawcare_session',     JSON.stringify(data)); }
function clearSession()      { localStorage.removeItem('pawcare_session'); }

// ---- Inisialisasi data demo ----
function initDemoData() {
  /* Pengguna demo */
  if (!localStorage.getItem('pawcare_users')) {
    saveUsers([{
      id: 1,
      name: 'Budi Santoso',
      email: 'budi@mail.com',
      phone: '08123456789',
      password: 'user123',
      role: 'user',
      joinDate: '2024-01-01T00:00:00.000Z'
    }]);
  }

  /* Data hewan demo */
  if (!localStorage.getItem('pawcare_animals')) {
    saveAnimals([
      { id: 1, name: 'Luna',  species: 'Kucing',  breed: 'Persia',          age: 2, gender: 'Betina', status: 'available', image: '🐱', desc: 'Luna adalah kucing Persia yang lembut dan suka bermain. Sudah divaksin lengkap.',    location: 'Jakarta',    addedDate: '2024-01-15' },
      { id: 2, name: 'Rocky', species: 'Anjing',  breed: 'Golden Retriever', age: 3, gender: 'Jantan', status: 'available', image: '🐕', desc: 'Rocky sangat ramah dengan anak-anak dan hewan lain. Sudah terlatih dasar.',         location: 'Bandung',    addedDate: '2024-02-01' },
      { id: 3, name: 'Coco',  species: 'Kelinci', breed: 'Holland Lop',      age: 1, gender: 'Betina', status: 'available', image: '🐇', desc: 'Coco adalah kelinci Holland Lop yang menggemaskan dan aktif bermain.',             location: 'Surabaya',   addedDate: '2024-02-10' },
      { id: 4, name: 'Max',   species: 'Anjing',  breed: 'Husky Siberia',    age: 4, gender: 'Jantan', status: 'available', image: '🐕‍🦺', desc: 'Max adalah Husky energetik yang butuh olahraga rutin. Sangat setia.',            location: 'Yogyakarta', addedDate: '2024-01-20' },
      { id: 5, name: 'Kiwi',  species: 'Burung',  breed: 'Lovebird',         age: 1, gender: 'Jantan', status: 'available', image: '🦜', desc: 'Kiwi sangat aktif dan suka berkomunikasi. Cocok untuk pemula.',                   location: 'Medan',      addedDate: '2024-03-05' },
      { id: 6, name: 'Mochi', species: 'Kucing',  breed: 'Scottish Fold',    age: 2, gender: 'Betina', status: 'adopted',   image: '😺', desc: 'Mochi sudah menemukan rumah barunya yang penuh kasih sayang.',                    location: 'Bali',       addedDate: '2024-01-05' },
    ]);
  }

  /* Adopsi, notifikasi & laporan (kosong jika belum ada) */
  if (!localStorage.getItem('pawcare_adoptions'))     saveAdoptions([]);
  if (!localStorage.getItem('pawcare_notifications')) saveNotifs([]);
  if (!localStorage.getItem('pawcare_reports'))       saveReports([]);
  if (!localStorage.getItem('pawcare_boardings'))     saveBoardings([]);
  if (!localStorage.getItem('pawcare_complaints'))   saveComplaints([]);
  if (!localStorage.getItem('pawcare_donations'))    saveDonations([]);
}

// Jalankan inisialisasi saat file ini dimuat
initDemoData();
