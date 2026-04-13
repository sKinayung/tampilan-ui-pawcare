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
    'gallery':       renderGallery,
    'my-adoptions':  renderMyAdoptions,
    'notifications': renderNotifications,
    'reports':       renderReportsSection,
    'boardings':     renderBoardingsSection,
    'complaints':    renderComplaintsSection,
    'donations':     renderDonationsSection,
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
    a.status !== 'adopted' &&
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
// PENITIPAN HEWAN
// ==============================================================

/* ---- Konstanta tarif ---- */
const BOARDING_RATE_PER_DAY = 50000; // Rp 50.000/hari

/* ---- Hitung selisih hari antara dua tanggal ---- */
function calcDays(checkIn, checkOut) {
  const d1 = new Date(checkIn);
  const d2 = new Date(checkOut);
  return Math.max(0, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)));
}

function formatRupiah(n) {
  return 'Rp ' + n.toLocaleString('id-ID');
}

/* ---- Render daftar pengajuan penitipan pengguna ini ---- */
function renderBoardingsSection() {
  const boardings = getBoardings()
    .filter(b => b.userId === session.id)
    .reverse();

  const el = document.getElementById('boardingList');

  if (!boardings.length) {
    el.innerHTML = `
      <div class="empty-state">
        <span class="emoji">🏡</span>
        <h3>Belum ada pengajuan penitipan</h3>
        <p>Klik "Ajukan Penitipan Baru" untuk memulai</p>
      </div>`;
    return;
  }

  const statusMap = {
    menunggu:    { cls: 'bpill-menunggu',    label: '⏳ Menunggu'    },
    disetujui:   { cls: 'bpill-disetujui',   label: '✅ Disetujui'   },
    ditolak:     { cls: 'bpill-ditolak',     label: '❌ Ditolak'     },
    berlangsung: { cls: 'bpill-berlangsung', label: '🔵 Berlangsung' },
    selesai:     { cls: 'bpill-selesai',     label: '🎉 Selesai'     },
  };

  const speciesEmoji = { Kucing:'🐱', Anjing:'🐕', Kelinci:'🐇', Burung:'🦜', Hamster:'🐹', Lainnya:'🐾' };

  el.innerHTML = boardings.map(b => {
    const st       = statusMap[b.status] || { cls:'', label: b.status };
    const emoji    = speciesEmoji[b.petSpecies] || '🐾';
    const days     = calcDays(b.checkIn, b.checkOut);
    const services = (b.services || []).map(s => `<span style="font-size:0.78rem;color:var(--green);background:#EDF7F1;padding:2px 8px;border-radius:99px;border:1px solid #B5D9C2;">${s}</span>`).join('');

    return `
      <div class="boarding-item status-${b.status}">
        <div class="boarding-item-header">
          <div class="bi-left">
            <span class="bi-emoji">${emoji}</span>
            <div>
              <div class="bi-animal-name">${b.petName}</div>
              <div class="bi-pet-name">${b.petBreed} · ${b.petSpecies} · ${b.petAge}</div>
            </div>
          </div>
          <span class="boarding-status-pill ${st.cls}">${st.label}</span>
        </div>

        <div class="boarding-dates">
          <span class="boarding-date-tag">📥 Masuk: <strong>${new Date(b.checkIn).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'})}</strong></span>
          <span class="boarding-date-tag">📤 Keluar: <strong>${new Date(b.checkOut).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'})}</strong></span>
          <span class="boarding-date-tag">💰 <strong>${formatRupiah(days * BOARDING_RATE_PER_DAY)}</strong></span>
        </div>

        ${days > 0 ? `<div class="boarding-duration">🗓 ${days} hari penitipan</div>` : ''}
        ${services ? `<div style="display:flex;flex-wrap:wrap;gap:0.4rem;margin-bottom:0.6rem">${services}</div>` : ''}
        ${b.notes    ? `<div class="boarding-note">📝 <em>${b.notes}</em></div>` : ''}
        ${b.adminNote ? `<div class="boarding-admin-note"><strong>💬 Catatan Admin:</strong> ${b.adminNote}</div>` : ''}
        <div style="font-size:0.75rem;color:var(--text-light);margin-top:0.5rem">Diajukan: ${new Date(b.date).toLocaleString('id-ID')}</div>
      </div>`;
  }).join('');
}

/* ---- Buka modal penitipan ---- */
function openBoardingModal() {
  // Set default tanggal: hari ini dan besok
  const today    = new Date();
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const fmt      = d => d.toISOString().split('T')[0];

  document.getElementById('bPetName').value      = '';
  document.getElementById('bPetBreed').value     = '';
  document.getElementById('bPetAge').value       = '';
  document.getElementById('bPetSpecies').value   = 'Kucing';
  document.getElementById('bCheckIn').value      = fmt(today);
  document.getElementById('bCheckOut').value     = fmt(tomorrow);
  document.getElementById('bNotes').value        = '';
  document.getElementById('bContactPhone').value = '';
  document.querySelectorAll('#boardingModal .service-option input')
    .forEach(cb => cb.checked = false);

  updatePriceEstimate();
  document.getElementById('boardingModal').classList.add('open');
}

function closeBoardingModal() {
  document.getElementById('boardingModal').classList.remove('open');
}

/* ---- Perbarui estimasi harga secara real-time ---- */
function updatePriceEstimate() {
  const ci  = document.getElementById('bCheckIn').value;
  const co  = document.getElementById('bCheckOut').value;
  const box = document.getElementById('priceEstimate');

  if (!ci || !co) { box.style.display = 'none'; return; }

  const days = calcDays(ci, co);
  if (days <= 0) { box.style.display = 'none'; return; }

  box.style.display = 'flex';
  document.getElementById('priceDurationLabel').textContent = `${days} hari × ${formatRupiah(BOARDING_RATE_PER_DAY)}`;
  document.getElementById('priceValue').textContent         = formatRupiah(days * BOARDING_RATE_PER_DAY);
}

/* ---- Submit pengajuan penitipan ---- */
function submitBoarding() {
  const petName      = document.getElementById('bPetName').value.trim();
  const petSpecies   = document.getElementById('bPetSpecies').value;
  const petBreed     = document.getElementById('bPetBreed').value.trim();
  const petAge       = document.getElementById('bPetAge').value.trim();
  const checkIn      = document.getElementById('bCheckIn').value;
  const checkOut     = document.getElementById('bCheckOut').value;
  const notes        = document.getElementById('bNotes').value.trim();
  const contactPhone = document.getElementById('bContactPhone').value.trim();
  const services     = [...document.querySelectorAll('#boardingModal .service-option input:checked')]
                         .map(cb => cb.value);

  if (!petName)      { showToast('⚠️ Nama hewan harus diisi!');           return; }
  if (!petBreed)     { showToast('⚠️ Ras/jenis hewan harus diisi!');      return; }
  if (!checkIn || !checkOut) { showToast('⚠️ Tanggal masuk dan keluar harus diisi!'); return; }

  const days = calcDays(checkIn, checkOut);
  if (days <= 0)     { showToast('⚠️ Tanggal keluar harus setelah tanggal masuk!'); return; }
  if (!contactPhone) { showToast('⚠️ Nomor HP harus diisi!');              return; }

  const boardings = getBoardings();
  const newBoarding = {
    id:           Date.now(),
    userId:       session.id,
    userName:     session.name,
    userEmail:    session.email,
    petName, petSpecies, petBreed, petAge,
    checkIn, checkOut,
    days,
    totalCost:    days * BOARDING_RATE_PER_DAY,
    services,
    notes,
    contactPhone,
    status:       'menunggu',
    adminNote:    '',
    date:         new Date().toISOString(),
  };

  boardings.push(newBoarding);
  saveBoardings(boardings);

  // Notifikasi ke pengguna
  addNotification(
    session.id,
    '🏡 Pengajuan Penitipan Dikirim',
    `Pengajuan penitipan untuk ${petName} (${days} hari) berhasil dikirim. Tunggu konfirmasi dari admin.`,
    'pending'
  );

  closeBoardingModal();
  showToast('🎉 Pengajuan penitipan berhasil dikirim!');
  renderBoardingsSection();
}

// ==============================================================
// PENGADUAN / KOMPLAIN
// ==============================================================

/* ---- Konfigurasi tampilan ---- */
const complaintStatusMap = {
  baru:     { pillCls: 'cspill-baru',     label: '⏳ Baru',      stepIdx: 0 },
  diproses: { pillCls: 'cspill-diproses', label: '🔵 Diproses',  stepIdx: 1 },
  selesai:  { pillCls: 'cspill-selesai',  label: '✅ Selesai',   stepIdx: 2 },
  ditutup:  { pillCls: 'cspill-ditutup',  label: '⚫ Ditutup',   stepIdx: 2 },
};

const urgencyMap = {
  rendah:  { cls: 'urgency-rendah', label: '🟢 Rendah'  },
  sedang:  { cls: 'urgency-sedang', label: '🟡 Sedang'  },
  tinggi:  { cls: 'urgency-tinggi', label: '🔴 Tinggi'  },
  kritis:  { cls: 'urgency-kritis', label: '🚨 Kritis'  },
};

const STEP_LABELS = ['Dikirim', 'Diproses', 'Selesai'];

/* ---- Badge di sidebar ---- */
function updateComplaintBadge() {
  const count = getComplaints().filter(
    c => c.userId === session.id && c.replies && c.replies.length > 0 && !c.userRead
  ).length;
  const badge = document.getElementById('complaintBadge');
  badge.style.display = count > 0 ? 'inline-block' : 'none';
}

/* ---- Render daftar pengaduan pengguna ---- */
function renderComplaintsSection() {
  // Tandai balasan yang belum dibaca sebagai sudah dibaca
  const allC = getComplaints();
  let changed = false;
  allC.forEach(c => {
    if (c.userId === session.id && !c.userRead && c.replies && c.replies.length > 0) {
      c.userRead = true;
      changed = true;
    }
  });
  if (changed) { saveComplaints(allC); updateComplaintBadge(); }

  const complaints = getComplaints()
    .filter(c => c.userId === session.id)
    .reverse();

  const el = document.getElementById('complaintList');

  if (!complaints.length) {
    el.innerHTML = `
      <div class="empty-state">
        <span class="emoji">💬</span>
        <h3>Belum ada pengaduan</h3>
        <p>Klik "Buat Pengaduan Baru" jika Anda memiliki masalah yang perlu diselesaikan</p>
      </div>`;
    return;
  }

  el.innerHTML = complaints.map(c => _buildComplaintItemHTML(c)).join('');
}

function _buildComplaintItemHTML(c) {
  const st  = complaintStatusMap[c.status] || complaintStatusMap.baru;
  const urg = urgencyMap[c.urgency]        || urgencyMap.sedang;
  const stepIdx = st.stepIdx;

  // Stepper HTML
  const steps = STEP_LABELS.map((lbl, i) => {
    const cls = i < stepIdx ? 'done' : i === stepIdx ? 'active' : '';
    return `<div class="cp-step ${cls}"><div class="cp-dot"></div><div class="cp-label">${lbl}</div></div>`;
  }).join('');

  // Balasan admin
  const repliesHTML = (c.replies || []).map(r => `
    <div style="background:#F0F7FF;border-left:3px solid #60A5FA;border-radius:0 0.5rem 0.5rem 0;
                padding:0.65rem 1rem;font-size:0.84rem;color:#1E40AF;line-height:1.55;margin-bottom:0.4rem">
      <div style="font-size:0.72rem;color:#93C5FD;margin-bottom:0.2rem">💬 Admin · ${new Date(r.time).toLocaleString('id-ID')}</div>
      ${r.text}
    </div>`
  ).join('');

  // Rating
  const ratingHTML = c.rating
    ? `<div style="font-size:0.78rem;color:var(--text-light);margin-top:0.4rem">
         Penilaian Anda: ${'⭐'.repeat(c.rating)} (${c.ratingComment || '—'})
       </div>`
    : (c.status === 'selesai'
        ? `<button style="margin-top:0.5rem;padding:5px 14px;background:var(--orange);color:white;border:none;border-radius:0.5rem;font-family:'DM Sans',sans-serif;font-size:0.82rem;font-weight:600;cursor:pointer"
             onclick="openRatingModal(${c.id})">⭐ Beri Penilaian</button>`
        : '');

  // Referensi
  const refHTML = c.reference
    ? `<div style="font-size:0.78rem;color:var(--text-light);margin-bottom:0.3rem">🔗 Ref: <strong>${c.reference}</strong></div>`
    : '';

  return `
    <div class="complaint-item cs-${c.status}">
      <div class="ci-header">
        <div class="ci-left">
          <div class="ci-title">${c.title}</div>
          <div class="ci-meta">
            <span class="ci-topic-tag">${c.topic}</span>
            <span class="urgency-pill ${urg.cls}">${urg.label}</span>
            <span>Harapan: ${c.expectation}</span>
          </div>
        </div>
        <span class="complaint-status-pill ${st.pillCls}">${st.label}</span>
      </div>

      <!-- Progress stepper -->
      <div class="complaint-progress">${steps}</div>

      ${refHTML}
      <div class="ci-desc">${c.desc}</div>
      ${repliesHTML}
      <div class="ci-footer">
        <span>📅 ${new Date(c.date).toLocaleString('id-ID')}</span>
        <span>📱 ${c.phone}</span>
      </div>
      ${ratingHTML}
    </div>`;
}

/* ---- Buka modal pengaduan ---- */
function openComplaintModal() {
  // Reset semua field
  document.getElementById('cTitle').value       = '';
  document.getElementById('cTopic').value       = 'Adopsi';
  document.getElementById('cUrgency').value     = 'sedang';
  document.getElementById('cDesc').value        = '';
  document.getElementById('cExpectation').value = 'Informasi / Klarifikasi';
  document.getElementById('cPhone').value       = '';

  // Isi dropdown referensi dari adopsi & penitipan milik user ini
  const refSelect  = document.getElementById('cReference');
  const adoptions  = getAdoptions().filter(a => a.userId === session.id);
  const boardings  = getBoardings().filter(b => b.userId === session.id);

  let opts = `<option value="">— Tidak terkait transaksi tertentu —</option>`;
  adoptions.forEach(a => {
    opts += `<option value="Adopsi #${String(a.id).slice(-5)} — ${a.animalName}">Adopsi: ${a.animalName} (${a.status})</option>`;
  });
  boardings.forEach(b => {
    opts += `<option value="Penitipan #${String(b.id).slice(-5)} — ${b.petName}">Penitipan: ${b.petName} (${b.status})</option>`;
  });
  refSelect.innerHTML = opts;

  document.getElementById('complaintModal').classList.add('open');
}

function closeComplaintModal() {
  document.getElementById('complaintModal').classList.remove('open');
}

/* ---- Submit pengaduan ---- */
function submitComplaint() {
  const title       = document.getElementById('cTitle').value.trim();
  const topic       = document.getElementById('cTopic').value;
  const urgency     = document.getElementById('cUrgency').value;
  const reference   = document.getElementById('cReference').value;
  const desc        = document.getElementById('cDesc').value.trim();
  const expectation = document.getElementById('cExpectation').value;
  const phone       = document.getElementById('cPhone').value.trim();

  if (!title)  { showToast('⚠️ Judul pengaduan harus diisi!');       return; }
  if (!desc)   { showToast('⚠️ Deskripsi masalah harus diisi!');     return; }
  if (!phone)  { showToast('⚠️ Nomor HP harus diisi!');              return; }

  const complaints = getComplaints();
  const newC = {
    id:          Date.now(),
    userId:      session.id,
    userName:    session.name,
    userEmail:   session.email,
    title, topic, urgency, reference, desc, expectation, phone,
    status:      'baru',
    replies:     [],
    rating:      null,
    ratingComment: null,
    userRead:    true,
    date:        new Date().toISOString(),
  };
  complaints.push(newC);
  saveComplaints(complaints);

  // Notifikasi konfirmasi ke pengguna
  addNotification(
    session.id,
    '📣 Pengaduan Dikirim',
    `Pengaduan "${title}" telah diterima. Tim kami akan merespons dalam 1×24 jam.`,
    'pending'
  );

  closeComplaintModal();
  showToast('📣 Pengaduan berhasil dikirim!');
  renderComplaintsSection();
}

/* ---- Rating kepuasan ---- */
let activeRatingComplaintId = null;
let selectedRating          = 0;

const ratingLabels = ['', 'Sangat Kecewa', 'Kecewa', 'Cukup', 'Puas', 'Sangat Puas'];

function openRatingModal(complaintId) {
  activeRatingComplaintId = complaintId;
  selectedRating          = 0;
  document.getElementById('ratingComment').value = '';
  document.getElementById('ratingLabel').textContent = '';
  document.querySelectorAll('.star-btn').forEach(b => b.classList.remove('selected'));
  document.getElementById('ratingModal').classList.add('open');
}

function closeRatingModal() {
  document.getElementById('ratingModal').classList.remove('open');
  activeRatingComplaintId = null;
}

function setRating(val) {
  selectedRating = val;
  document.querySelectorAll('.star-btn').forEach(b => {
    b.classList.toggle('selected', parseInt(b.dataset.val) <= val);
  });
  document.getElementById('ratingLabel').textContent = ratingLabels[val] || '';
}

function submitRating() {
  if (!selectedRating)               { showToast('⚠️ Pilih bintang terlebih dahulu!'); return; }
  if (!activeRatingComplaintId)      { return; }

  const comment    = document.getElementById('ratingComment').value.trim();
  const complaints = getComplaints();
  const idx        = complaints.findIndex(c => c.id === activeRatingComplaintId);
  if (idx === -1)  { return; }

  complaints[idx].rating        = selectedRating;
  complaints[idx].ratingComment = comment;
  saveComplaints(complaints);

  closeRatingModal();
  showToast('⭐ Terima kasih atas penilaian Anda!');
  renderComplaintsSection();
}

// ==============================================================
// SUMBANG HEWAN
// ==============================================================

const donationStatusMap = {
  menunggu:  { cls: 'dstp-menunggu',  label: '⏳ Menunggu Verifikasi' },
  disetujui: { cls: 'dstp-disetujui', label: '✅ Disetujui'           },
  ditolak:   { cls: 'dstp-ditolak',   label: '❌ Ditolak'             },
  diadopsi:  { cls: 'dstp-diadopsi',  label: '🎉 Sudah Diadopsi'      },
};

const speciesEmojiMap = {
  Kucing:'🐱', Anjing:'🐕', Kelinci:'🐇', Burung:'🦜', Hamster:'🐹', Lainnya:'🐾',
};

/* ---- Render daftar sumbangan milik user ini ---- */
function renderDonationsSection() {
  const donations = getDonations()
    .filter(d => d.userId === session.id)
    .reverse();

  const el = document.getElementById('donationList');

  if (!donations.length) {
    el.innerHTML = `
      <div class="empty-state">
        <span class="emoji">🎁</span>
        <h3>Belum ada sumbangan</h3>
        <p>Klik "Ajukan Sumbang Hewan" untuk memulai</p>
      </div>`;
    return;
  }

  el.innerHTML = donations.map(d => {
    const st      = donationStatusMap[d.status] || donationStatusMap.menunggu;
    const emoji   = d.image || speciesEmojiMap[d.species] || '🐾';
    const health  = (d.healthConditions || [])
      .map(h => `<span class="di-tag">${h}</span>`).join('');

    const adminNoteHTML = d.adminNote
      ? `<div class="di-admin-note"><strong>💬 Catatan Admin:</strong> ${d.adminNote}</div>`
      : '';

    const publishedHTML = d.status === 'disetujui'
      ? `<div style="font-size:0.8rem;color:var(--green);margin-top:0.4rem;font-weight:600">
           🌐 Hewan Anda sudah tampil di galeri adopsi PawCare!
         </div>`
      : '';

    return `
      <div class="donation-item dst-${d.status}">
        <div class="di-header">
          <div class="di-left">
            <span class="di-emoji">${emoji}</span>
            <div>
              <div class="di-name">${d.name}</div>
              <div class="di-meta">${d.breed} · ${d.species} · ${d.age} thn · ${d.gender} · 📍 ${d.location}</div>
            </div>
          </div>
          <span class="dstp ${st.cls}">${st.label}</span>
        </div>

        ${health ? `<div class="di-tags">${health}</div>` : ''}
        <div class="di-desc">${d.desc}</div>
        ${d.reason ? `<div style="font-size:0.82rem;color:var(--text-light);margin-bottom:0.5rem">💭 <em>Alasan: ${d.reason}</em></div>` : ''}
        ${d.familyType ? `<div style="font-size:0.8rem;color:var(--text-light);margin-bottom:0.5rem">👨‍👩‍👧 Cocok untuk: <strong>${d.familyType}</strong></div>` : ''}
        ${adminNoteHTML}
        ${publishedHTML}
        <div style="font-size:0.75rem;color:var(--text-light);margin-top:0.5rem">
          Diajukan: ${new Date(d.date).toLocaleString('id-ID')}
        </div>
      </div>`;
  }).join('');
}

/* ---- Buka modal sumbang ---- */
function openDonationModal() {
  document.getElementById('dnName').value      = '';
  document.getElementById('dnImage').value     = '';
  document.getElementById('dnBreed').value     = '';
  document.getElementById('dnAge').value       = '';
  document.getElementById('dnLocation').value  = '';
  document.getElementById('dnDesc').value      = '';
  document.getElementById('dnReason').value    = '';
  document.getElementById('dnPhone').value     = '';
  document.getElementById('dnSpecies').value   = 'Kucing';
  document.getElementById('dnGender').value    = 'Jantan';
  document.getElementById('dnFamilyType').value = '';
  document.querySelectorAll('#donationModal .health-option input')
    .forEach(cb => cb.checked = false);
  document.getElementById('donationModal').classList.add('open');
}

function closeDonationModal() {
  document.getElementById('donationModal').classList.remove('open');
}

/* ---- Submit sumbang hewan ---- */
function submitDonation() {
  const name    = document.getElementById('dnName').value.trim();
  const image   = document.getElementById('dnImage').value.trim();
  const species = document.getElementById('dnSpecies').value;
  const breed   = document.getElementById('dnBreed').value.trim();
  const age     = parseInt(document.getElementById('dnAge').value) || 0;
  const gender  = document.getElementById('dnGender').value;
  const location = document.getElementById('dnLocation').value.trim();
  const desc    = document.getElementById('dnDesc').value.trim();
  const reason  = document.getElementById('dnReason').value.trim();
  const phone   = document.getElementById('dnPhone').value.trim();
  const familyType = document.getElementById('dnFamilyType').value;
  const healthConditions = [...document.querySelectorAll('#donationModal .health-option input:checked')]
    .map(cb => cb.value);

  if (!name)     { showToast('⚠️ Nama hewan harus diisi!');           return; }
  if (!breed)    { showToast('⚠️ Ras / breed harus diisi!');          return; }
  if (!location) { showToast('⚠️ Kota / lokasi harus diisi!');        return; }
  if (!desc)     { showToast('⚠️ Deskripsi hewan harus diisi!');      return; }
  if (!reason)   { showToast('⚠️ Alasan menyumbang harus diisi!');    return; }
  if (!phone)    { showToast('⚠️ Nomor HP harus diisi!');             return; }

  const donations = getDonations();
  const newDonation = {
    id:               Date.now(),
    userId:           session.id,
    userName:         session.name,
    userEmail:        session.email,
    userPhone:        phone,
    name, image: image || (speciesEmojiMap[species] || '🐾'),
    species, breed, age, gender, location,
    desc, reason, familyType,
    healthConditions,
    status:           'menunggu',
    adminNote:        '',
    publishedAnimalId: null,
    date:             new Date().toISOString(),
  };

  donations.push(newDonation);
  saveDonations(donations);

  // Notifikasi ke pengguna
  addNotification(
    session.id,
    '🎁 Pengajuan Sumbang Dikirim',
    `Pengajuan sumbang hewan "${name}" telah diterima. Tim PawCare akan memverifikasi dalam 1–3 hari kerja.`,
    'pending'
  );

  closeDonationModal();
  showToast('🎁 Pengajuan sumbang hewan berhasil dikirim!');
  renderDonationsSection();
}

// ==============================================================
// DONASI HEWAN
// ==============================================================

/* ---- Render daftar donasi pengguna ini ---- */
function renderDonationsSection() {
  const donations = getDonations()
    .filter(d => d.userId === session.id)
    .reverse();

  const el = document.getElementById('donationList');

  if (!donations.length) {
    el.innerHTML = `
      <div class="empty-state">
        <span class="emoji">🎁</span>
        <h3>Belum ada donasi hewan</h3>
        <p>Klik "Donasikan Hewan Saya" untuk mulai proses donasi</p>
      </div>`;
    return;
  }

  el.innerHTML = donations.map(d => {
    const st   = donationStatusMap[d.status] || donationStatusMap.menunggu;
    const tags = (d.kondisi || []).map(k =>
      `<span class="di-tag">${k}</span>`).join('');

    const noteHTML = d.status === 'disetujui'
      ? `<div class="di-approved-note">
           🎉 <strong>Donasi disetujui!</strong> ${d.adminName} telah masuk ke galeri adopsi PawCare.
           ${d.adminNote ? `<br>📝 Catatan: ${d.adminNote}` : ''}
         </div>`
      : d.status === 'ditolak'
        ? `<div class="di-rejected-note">
             ❌ <strong>Donasi tidak disetujui.</strong>
             ${d.adminNote ? `Alasan: ${d.adminNote}` : 'Silakan hubungi admin untuk informasi lebih lanjut.'}
           </div>`
        : '';

    return `
      <div class="donation-item ds-${d.status}">
        <div class="di-header">
          <div class="di-left">
            <span class="di-emoji">${d.image || speciesEmojiMap[d.species] || '🐾'}</span>
            <div>
              <div class="di-animal-name">${d.name}</div>
              <div class="di-meta">${d.breed} · ${d.species} · ${d.age} tahun · ${d.gender} · 📍 ${d.location}</div>
            </div>
          </div>
          <span class="donation-status-pill ${st.pillCls}">${st.label}</span>
        </div>
        ${tags ? `<div class="di-tags">${tags}</div>` : ''}
        <div class="di-desc">"${d.desc}"</div>
        <div style="font-size:0.78rem;color:var(--text-light);margin-bottom:0.4rem">
          💬 Alasan: <em>${d.reason}</em>
        </div>
        ${noteHTML}
        <div style="font-size:0.75rem;color:var(--text-light);margin-top:0.5rem">
          📅 Diajukan: ${new Date(d.date).toLocaleString('id-ID')} · 📱 ${d.phone}
        </div>
      </div>`;
  }).join('');
}

/* ---- Buka modal donasi ---- */
function openDonationModal() {
  document.getElementById('dName').value     = '';
  document.getElementById('dSpecies').value  = 'Kucing';
  document.getElementById('dBreed').value    = '';
  document.getElementById('dAge').value      = '';
  document.getElementById('dGender').value   = 'Betina';
  document.getElementById('dLocation').value = '';
  document.getElementById('dDesc').value     = '';
  document.getElementById('dReason').value   = '';
  document.getElementById('dPhone').value    = '';
  document.querySelectorAll('#donationModal .kondisi-option input')
    .forEach(cb => cb.checked = false);
  document.getElementById('donationModal').classList.add('open');
}

function closeDonationModal() {
  document.getElementById('donationModal').classList.remove('open');
}

/* ---- Submit donasi ---- */
function submitDonation() {
  const name     = document.getElementById('dName').value.trim();
  const species  = document.getElementById('dSpecies').value;
  const breed    = document.getElementById('dBreed').value.trim();
  const age      = parseInt(document.getElementById('dAge').value) || 0;
  const gender   = document.getElementById('dGender').value;
  const location = document.getElementById('dLocation').value.trim();
  const desc     = document.getElementById('dDesc').value.trim();
  const reason   = document.getElementById('dReason').value.trim();
  const phone    = document.getElementById('dPhone').value.trim();
  const kondisi  = [...document.querySelectorAll('#donationModal .kondisi-option input:checked')]
                     .map(cb => cb.value);

  if (!name)     { showToast('⚠️ Nama hewan harus diisi!');                return; }
  if (!breed)    { showToast('⚠️ Ras / breed hewan harus diisi!');         return; }
  if (!location) { showToast('⚠️ Lokasi hewan harus diisi!');              return; }
  if (!desc)     { showToast('⚠️ Deskripsi hewan harus diisi!');           return; }
  if (!reason)   { showToast('⚠️ Alasan donasi harus diisi!');             return; }
  if (!phone)    { showToast('⚠️ Nomor HP harus diisi!');                  return; }

  const donations = getDonations();
  const newDonation = {
    id:        Date.now(),
    userId:    session.id,
    userName:  session.name,
    userEmail: session.email,
    name,
    image:     speciesEmojiMap[species] || '🐾',
    species, breed, age, gender, location,
    desc, reason, phone, kondisi,
    status:    'menunggu',
    adminNote: '',
    adminName: '',
    date:      new Date().toISOString(),
  };

  donations.push(newDonation);
  saveDonations(donations);

  // Notifikasi konfirmasi ke pengguna
  addNotification(
    session.id,
    '🎁 Permohonan Donasi Dikirim',
    `Permohonan donasi untuk ${name} telah diterima. Tim kami akan mereview dalam 3 hari kerja.`,
    'pending'
  );

  closeDonationModal();
  showToast('🎉 Permohonan donasi berhasil dikirim!');
  renderDonationsSection();
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
updateComplaintBadge();

// ---- Hamburger sidebar (mobile) ----
function toggleSidebar() {
  const sidebar  = document.getElementById('mainSidebar');
  const overlay  = document.getElementById('sidebarOverlay');
  const btn      = document.getElementById('hamburgerBtn');
  const isOpen   = sidebar.classList.toggle('open');
  overlay.classList.toggle('open', isOpen);
  btn.classList.toggle('open', isOpen);
  document.body.style.overflow = isOpen ? 'hidden' : '';
}

function closeSidebar() {
  const sidebar = document.getElementById('mainSidebar');
  const overlay = document.getElementById('sidebarOverlay');
  const btn     = document.getElementById('hamburgerBtn');
  sidebar.classList.remove('open');
  overlay.classList.remove('open');
  btn.classList.remove('open');
  document.body.style.overflow = '';
}

// Tutup sidebar saat layar diperbesar ke desktop
window.addEventListener('resize', () => {
  if (window.innerWidth > 768) closeSidebar();
});