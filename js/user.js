/* ============================================================
   user.js — Logika halaman pengguna (galeri, adopsi, notifikasi)
   ============================================================ */

'use strict';

// ---- Proteksi halaman: hanya untuk role 'user' ----
const session = getSession();
if (!session || session.role !== 'user') {
  window.location.href = 'index.html';
}

// ---- Isi info sidebar ----
document.getElementById('userName').textContent   = session.name;
document.getElementById('userAvatar').textContent = session.name.charAt(0).toUpperCase();

// ---- State ----
let selectedAnimalId = null;

// ==============================================================
// UTILITAS UMUM
// ==============================================================

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

function statusBadgeHTML(status) {
  const map = {
    available: { cls: 'status-available', label: 'Tersedia' },
    pending:   { cls: 'status-pending',   label: 'Proses Adopsi' },
    adopted:   { cls: 'status-adopted',   label: 'Diadopsi' },
  };
  const s = map[status] || { cls: '', label: status };
  return `<span class="status-badge ${s.cls}">${s.label}</span>`;
}

// ==============================================================
// NAVIGASI
// ==============================================================

function showSection(name) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  document.getElementById('section-' + name).classList.add('active');
  document.getElementById('nav-' + name).classList.add('active');

  const renderers = {
    'gallery':      renderGallery,
    'my-adoptions': renderMyAdoptions,
    'notifications': renderNotifications,
    'reports':      renderReportsSection,
  };
  if (renderers[name]) renderers[name]();
}

// ==============================================================
// GALERI HEWAN
// ==============================================================

function renderGallery() {
  // Ambil nilai filter saat ini
  const query   = (document.getElementById('searchInput').value  || '').toLowerCase();
  const species = document.getElementById('filterSpecies').value || '';
  const status  = document.getElementById('filterStatus').value  || '';

  const animals = getAnimals().filter(a =>
    (!query   || a.name.toLowerCase().includes(query) || a.breed.toLowerCase().includes(query)) &&
    (!species || a.species === species) &&
    (!status  || a.status  === status)
  );

  const grid = document.getElementById('animalGrid');

  if (!animals.length) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <span class="emoji">🔍</span>
        <h3>Tidak ada hasil</h3>
        <p>Coba ubah filter atau kata kunci pencarian</p>
      </div>`;
    return;
  }

  grid.innerHTML = animals.map(a => {
    const isAvailable = a.status === 'available';
    const btnLabel    = isAvailable ? '❤️ Adopsi' : (a.status === 'pending' ? '⏳ Proses' : '✅ Diadopsi');

    return `
      <div class="animal-card">
        <div class="animal-img">
          ${a.image}
          ${statusBadgeHTML(a.status)}
        </div>
        <div class="animal-info">
          <div class="animal-name">${a.name}</div>
          <div class="animal-meta">${a.breed} · ${a.age} tahun · ${a.gender} · 📍 ${a.location}</div>
          <div class="animal-desc">${a.desc}</div>
          <button class="btn-adopt"
            onclick="openAdoptModal(${a.id})"
            ${isAvailable ? '' : 'disabled'}>
            ${btnLabel}
          </button>
        </div>
      </div>`;
  }).join('');
}

// Filter dipanggil saat input berubah
function filterAnimals() { renderGallery(); }

// ==============================================================
// MODAL ADOPSI
// ==============================================================

function openAdoptModal(animalId) {
  selectedAnimalId = animalId;

  const animal = getAnimals().find(a => a.id === animalId);
  const user   = getUsers().find(u => u.id === session.id);

  // Isi data yang sudah diketahui
  document.getElementById('adoptName').value  = session.name;
  document.getElementById('adoptPhone').value = user ? user.phone : '';

  // Reset field yang harus diisi
  document.getElementById('adoptAddress').value    = '';
  document.getElementById('adoptReason').value     = '';
  document.getElementById('adoptExperience').value = 'none';

  document.getElementById('modalAnimalPreview').innerHTML = `
    <span class="emoji">${animal.image}</span>
    <div>
      <strong style="font-family:'Playfair Display',serif;font-size:1.1rem">${animal.name}</strong>
      <div style="font-size:0.82rem;color:var(--text-light)">${animal.breed} · ${animal.age} tahun · ${animal.gender}</div>
    </div>`;

  document.getElementById('adoptModal').classList.add('open');
}

function closeModal() {
  document.getElementById('adoptModal').classList.remove('open');
  selectedAnimalId = null;
}

function submitAdoption() {
  const address = document.getElementById('adoptAddress').value.trim();
  const reason  = document.getElementById('adoptReason').value.trim();
  const exp     = document.getElementById('adoptExperience').value;

  if (!address || !reason) {
    showToast('⚠️ Alamat dan alasan adopsi harus diisi!');
    return;
  }

  const adoptions = getAdoptions();

  // Cegah duplikasi pengajuan yang masih menunggu
  const alreadyPending = adoptions.find(ad =>
    ad.animalId === selectedAnimalId &&
    ad.userId   === session.id &&
    ad.status   === 'menunggu'
  );
  if (alreadyPending) {
    showToast('❗ Anda sudah mengajukan adopsi untuk hewan ini.');
    return;
  }

  const animal = getAnimals().find(a => a.id === selectedAnimalId);

  const newAdoption = {
    id:          Date.now(),
    animalId:    selectedAnimalId,
    animalName:  animal.name,
    animalImage: animal.image,
    animalBreed: animal.breed,
    userId:      session.id,
    userName:    session.name,
    userEmail:   session.email,
    address, reason,
    experience: exp,
    status: 'menunggu',
    date: new Date().toISOString(),
  };

  adoptions.push(newAdoption);
  saveAdoptions(adoptions);

  // Update status hewan menjadi pending
  const animals = getAnimals();
  const idx = animals.findIndex(a => a.id === selectedAnimalId);
  if (idx !== -1) { animals[idx].status = 'pending'; saveAnimals(animals); }

  // Tambah notifikasi untuk pengguna ini
  addNotification(
    session.id,
    '📬 Pengajuan Dikirim',
    `Pengajuan adopsi untuk ${animal.name} berhasil dikirim. Tunggu konfirmasi dari admin.`,
    'pending'
  );

  closeModal();
  showToast('🎉 Pengajuan adopsi berhasil dikirim!');
  renderGallery();
}

// ==============================================================
// PENGAJUAN SAYA
// ==============================================================

function renderMyAdoptions() {
  const adoptions = getAdoptions()
    .filter(a => a.userId === session.id)
    .reverse();

  const el = document.getElementById('adoptionList');

  if (!adoptions.length) {
    el.innerHTML = `
      <div class="empty-state">
        <span class="emoji">📋</span>
        <h3>Belum ada pengajuan</h3>
        <p>Kunjungi galeri hewan dan mulai proses adopsi Anda</p>
      </div>`;
    return;
  }

  el.innerHTML = adoptions.map(a => `
    <div class="adoption-item">
      <span class="adoption-emoji">${a.animalImage}</span>
      <div class="adoption-details">
        <div class="adoption-animal-name">${a.animalName}</div>
        <div class="adoption-sub">
          ${a.animalBreed} · Diajukan: ${new Date(a.date).toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' })}
        </div>
        ${a.adminNote ? `<div class="adoption-admin-note">📝 ${a.adminNote}</div>` : ''}
      </div>
      <span class="adoption-status status-${a.status}">${a.status}</span>
    </div>`
  ).join('');
}

// ==============================================================
// NOTIFIKASI
// ==============================================================

function addNotification(userId, title, message, type) {
  const notifs = getNotifs();
  notifs.push({
    id: Date.now(),
    userId, title, message, type,
    read: false,
    time: new Date().toISOString(),
  });
  saveNotifs(notifs);
  updateNotifBadge();
}

function updateNotifBadge() {
  const count = getNotifs().filter(n => n.userId === session.id && !n.read).length;
  const badge = document.getElementById('notifBadge');
  badge.style.display = count > 0 ? 'inline-block' : 'none';
  badge.textContent   = count;
}

function renderNotifications() {
  const notifs = getNotifs()
    .filter(n => n.userId === session.id)
    .reverse();

  const el = document.getElementById('notifList');

  if (!notifs.length) {
    el.innerHTML = `
      <div class="empty-state">
        <span class="emoji">🔔</span>
        <h3>Belum ada notifikasi</h3>
        <p>Notifikasi tentang pengajuan adopsi Anda akan muncul di sini</p>
      </div>`;
  } else {
    const iconMap = { pending: '📬', approved: '✅', rejected: '❌' };
    el.innerHTML = notifs.map(n => `
      <div class="notif-item ${n.read ? '' : 'unread'} type-${n.type}" onclick="markRead(${n.id}, this)">
        <span class="notif-icon">${iconMap[n.type] || '🔔'}</span>
        <div class="notif-body">
          <h4>${n.title}</h4>
          <p>${n.message}</p>
          <div class="notif-time">${new Date(n.time).toLocaleString('id-ID')}</div>
        </div>
      </div>`
    ).join('');
  }

  // Tandai semua sebagai telah dibaca
  const all = getNotifs().map(n =>
    n.userId === session.id ? { ...n, read: true } : n
  );
  saveNotifs(all);
  updateNotifBadge();
}

function markRead(id, el) {
  el.classList.remove('unread');
}

// ==============================================================
// LAPORAN PERKEMBANGAN HEWAN
// ==============================================================

let activeReportAdoptionId = null; // ID adopsi yang sedang dipilih

/* ---- Render daftar hewan yang sudah diadopsi oleh user ini ---- */
function renderReportsSection() {
  const adoptions = getAdoptions().filter(
    a => a.userId === session.id && a.status === 'disetujui'
  );

  // Kembali ke tampilan daftar, sembunyikan riwayat
  document.getElementById('reportsView').style.display       = 'block';
  document.getElementById('reportHistoryView').style.display = 'none';
  activeReportAdoptionId = null;

  const grid = document.getElementById('adoptedAnimalGrid');

  if (!adoptions.length) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <span class="emoji">🐾</span>
        <h3>Belum ada hewan yang diadopsi</h3>
        <p>Fitur laporan tersedia setelah pengajuan adopsi Anda disetujui</p>
      </div>`;
    return;
  }

  grid.innerHTML = adoptions.map(a => {
    const reportCount = getReports().filter(r => r.adoptionId === a.id).length;
    return `
      <div class="adopted-card">
        <span class="ac-emoji">${a.animalImage}</span>
        <div class="ac-info">
          <div class="ac-name">${a.animalName}</div>
          <div class="ac-meta">${a.animalBreed} · Diadopsi ${new Date(a.processedDate || a.date).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' })}</div>
          <div class="ac-count">📝 ${reportCount} laporan terkirim</div>
        </div>
        <button class="btn-report" onclick="openReportHistory(${a.id})">Lihat & Kirim</button>
      </div>`;
  }).join('');
}

/* ---- Tampilkan riwayat laporan untuk satu adopsi ---- */
function openReportHistory(adoptionId) {
  activeReportAdoptionId = adoptionId;
  const adoption = getAdoptions().find(a => a.id === adoptionId);

  document.getElementById('reportHistoryTitle').textContent =
    `${adoption.animalImage} ${adoption.animalName}`;
  document.getElementById('reportHistoryMeta').textContent =
    `${adoption.animalBreed} · Diadopsi ${new Date(adoption.processedDate || adoption.date).toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' })}`;

  document.getElementById('reportsView').style.display       = 'none';
  document.getElementById('reportHistoryView').style.display = 'block';

  renderReportTimeline(adoptionId);
}

function backToReportList() {
  renderReportsSection();
}

/* ---- Render timeline laporan ---- */
const kondisiConfig = {
  'sangat-baik':     { cls: 'kondisi-sangat-baik',     label: '⭐ Sangat Baik' },
  'baik':            { cls: 'kondisi-baik',             label: '✅ Baik' },
  'cukup':           { cls: 'kondisi-cukup',            label: '⚠️ Cukup' },
  'perlu-perhatian': { cls: 'kondisi-perlu-perhatian',  label: '🚨 Perlu Perhatian' },
};

const rstatConfig = {
  baru:    { cls: 'rstat-baru',    label: 'Baru' },
  dibaca:  { cls: 'rstat-dibaca',  label: 'Dibaca' },
  dibalas: { cls: 'rstat-dibalas', label: 'Dibalas' },
};

function renderReportTimeline(adoptionId) {
  const reports = getReports()
    .filter(r => r.adoptionId === adoptionId)
    .reverse();

  const el = document.getElementById('reportTimeline');

  if (!reports.length) {
    el.innerHTML = `
      <div class="empty-state">
        <span class="emoji">📋</span>
        <h3>Belum ada laporan</h3>
        <p>Klik "Kirim Laporan Baru" untuk membuat laporan pertama</p>
      </div>`;
    return;
  }

  el.innerHTML = reports.map(r => {
    const k    = kondisiConfig[r.kondisi] || { cls: '', label: r.kondisi };
    const stat = rstatConfig[r.status]    || { cls: '', label: r.status };
    const tags = (r.aspects || []).map(t => `<span class="report-tag">${t}</span>`).join('');
    const replyHTML = r.adminReply
      ? `<div class="report-admin-reply"><strong>💬 Balasan Admin:</strong> ${r.adminReply}</div>`
      : '';

    return `
      <div class="report-item">
        <span class="report-status-badge ${stat.cls}">${stat.label}</span>
        <div class="report-item-header">
          <div>
            <div class="report-item-title">Laporan #${r.id.toString().slice(-4)}</div>
            <div class="report-item-date">${new Date(r.date).toLocaleString('id-ID', { day:'numeric', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' })}</div>
          </div>
        </div>
        <span class="report-kondisi ${k.cls}">${k.label}</span>
        <div class="report-item-body">${r.desc}</div>
        ${r.weight ? `<div style="font-size:0.8rem;color:var(--text-light);margin-bottom:0.5rem">⚖️ Berat badan: <strong>${r.weight}</strong></div>` : ''}
        ${tags ? `<div class="report-item-tags">${tags}</div>` : ''}
        ${replyHTML}
      </div>`;
  }).join('');
}

/* ---- Buka modal kirim laporan ---- */
function openReportModal() {
  if (!activeReportAdoptionId) return;
  const adoption = getAdoptions().find(a => a.id === activeReportAdoptionId);

  document.getElementById('reportAnimalPreview').innerHTML = `
    <span class="emoji">${adoption.animalImage}</span>
    <div>
      <strong style="font-family:'Playfair Display',serif;font-size:1.1rem">${adoption.animalName}</strong>
      <div style="font-size:0.82rem;color:var(--text-light)">${adoption.animalBreed}</div>
    </div>`;

  // Reset form
  document.getElementById('reportKondisi').value = 'baik';
  document.getElementById('reportDesc').value    = '';
  document.getElementById('reportWeight').value  = '';
  document.querySelectorAll('#aspectCheckboxes input[type=checkbox]')
    .forEach(cb => cb.checked = false);

  document.getElementById('reportModal').classList.add('open');
}

function closeReportModal() {
  document.getElementById('reportModal').classList.remove('open');
}

/* ---- Submit laporan ---- */
function submitReport() {
  const kondisi = document.getElementById('reportKondisi').value;
  const desc    = document.getElementById('reportDesc').value.trim();
  const weight  = document.getElementById('reportWeight').value.trim();
  const aspects = [...document.querySelectorAll('#aspectCheckboxes input:checked')]
    .map(cb => cb.value);

  if (!desc) {
    showToast('⚠️ Deskripsi perkembangan harus diisi!');
    return;
  }

  const adoption = getAdoptions().find(a => a.id === activeReportAdoptionId);
  const reports  = getReports();

  const newReport = {
    id:           Date.now(),
    adoptionId:   activeReportAdoptionId,
    animalId:     adoption.animalId,
    animalName:   adoption.animalName,
    animalImage:  adoption.animalImage,
    animalBreed:  adoption.animalBreed,
    userId:       session.id,
    userName:     session.name,
    userEmail:    session.email,
    kondisi, desc, weight, aspects,
    status:       'baru',
    adminReply:   null,
    date:         new Date().toISOString(),
  };

  reports.push(newReport);
  saveReports(reports);

  closeReportModal();
  showToast('📤 Laporan berhasil dikirim!');
  renderReportTimeline(activeReportAdoptionId);
}

// ==============================================================
// KELUAR
// ==============================================================

function logout() {
  clearSession();
  window.location.href = 'index.html';
}

// ==============================================================
// INISIALISASI
// ==============================================================

// Render galeri saat pertama kali halaman dimuat
renderGallery();
updateNotifBadge();
