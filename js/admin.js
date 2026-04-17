/* ============================================================
   admin.js — Logika halaman admin (hewan, adopsi, pengguna)
   ============================================================ */

'use strict';

// ---- Proteksi halaman: hanya untuk role 'admin' ----
const session = getSession();
if (!session || session.role !== 'admin') {
  window.location.href = 'index.html';
}

// ---- State ----
let currentReviewId = null;

// ==============================================================
// UTILITAS UMUM
// ==============================================================

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

function statusPill(status) {
  const map = {
    available: { cls: 'pill-available', label: 'Tersedia'  },
    pending:   { cls: 'pill-pending',   label: 'Proses'    },
    adopted:   { cls: 'pill-adopted',   label: 'Diadopsi'  },
    menunggu:  { cls: 'pill-menunggu',  label: 'Menunggu'  },
    disetujui: { cls: 'pill-disetujui', label: 'Disetujui' },
    ditolak:   { cls: 'pill-ditolak',   label: 'Ditolak'   },
  };
  const s = map[status] || { cls: '', label: status };
  return `<span class="status-pill ${s.cls}">${s.label}</span>`;
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
    overview:   renderOverview,
    animals:    renderAnimalsTable,
    adoptions:  renderAdoptionsTable,
    users:      renderUsersTable,
    reports:    renderReportsSection,
    boardings:  renderBoardingsSection,
    complaints: renderComplaintsSection,
    donations:  renderDonationsSection,
  };
  if (renderers[name]) renderers[name]();
}

// ==============================================================
// RINGKASAN (OVERVIEW)
// ==============================================================

function renderOverview() {
  const animals   = getAnimals();
  const adoptions = getAdoptions();
  const users     = getUsers();
  const pending   = adoptions.filter(a => a.status === 'menunggu').length;

  document.getElementById('statGrid').innerHTML = `
    <div class="stat-card" data-icon="🐾">
      <div class="stat-label">Total Hewan</div>
      <div class="stat-value">${animals.length}</div>
      <div class="stat-sub">
        <span class="stat-dot" style="background:var(--green)"></span>
        ${animals.filter(a => a.status === 'available').length} tersedia
      </div>
    </div>
    <div class="stat-card" data-icon="📋">
      <div class="stat-label">Total Pengajuan</div>
      <div class="stat-value">${adoptions.length}</div>
      <div class="stat-sub">
        <span class="stat-dot" style="background:var(--orange)"></span>
        ${pending} menunggu tinjauan
      </div>
    </div>
    <div class="stat-card" data-icon="✅">
      <div class="stat-label">Adopsi Berhasil</div>
      <div class="stat-value">${adoptions.filter(a => a.status === 'disetujui').length}</div>
      <div class="stat-sub">
        <span class="stat-dot" style="background:#6D28D9"></span>
        ${animals.filter(a => a.status === 'adopted').length} hewan diadopsi
      </div>
    </div>
    <div class="stat-card" data-icon="👥">
      <div class="stat-label">Pengguna</div>
      <div class="stat-value">${users.length}</div>
      <div class="stat-sub">
        <span class="stat-dot" style="background:var(--admin-accent)"></span>
        Terdaftar
      </div>
    </div>`;

  const recent = [...adoptions].reverse().slice(0, 5);
  document.getElementById('recentAdoptions').innerHTML = recent.map(a => `
    <tr>
      <td>${a.animalImage} ${a.animalName}</td>
      <td>${a.userName}</td>
      <td>${new Date(a.date).toLocaleDateString('id-ID')}</td>
      <td>${statusPill(a.status)}</td>
    </tr>`
  ).join('') || `<tr><td colspan="4" style="text-align:center;color:var(--text-light);padding:2rem">Belum ada pengajuan</td></tr>`;

  updatePendingBadge();
  updateNewReportBadge();
  updateNewBoardingBadge();
  updateNewComplaintBadge();
  updateNewDonationBadge();
}

function updatePendingBadge() {
  const count = getAdoptions().filter(a => a.status === 'menunggu').length;
  const badge = document.getElementById('pendingBadge');
  badge.style.display = count > 0 ? 'inline-block' : 'none';
  badge.textContent   = count;
}

// ==============================================================
// TABEL HEWAN
// ==============================================================

function renderAnimalsTable() {
  const q = (document.getElementById('animalSearch')?.value || '').toLowerCase();
  const animals = getAnimals().filter(a =>
    !q || a.name.toLowerCase().includes(q) || a.breed.toLowerCase().includes(q)
  );

  document.getElementById('animalsTableBody').innerHTML = animals.map(a => `
    <tr>
      <td><span style="font-size:1.25rem">${a.image}</span> <strong>${a.name}</strong></td>
      <td>${a.species}</td>
      <td>${a.breed}</td>
      <td>${a.age} thn</td>
      <td>📍 ${a.location}</td>
      <td>${statusPill(a.status)}</td>
      <td>
        <div class="action-btns">
          <button class="btn-icon btn-edit"   onclick="editAnimal(${a.id})">✏️ Edit</button>
          <button class="btn-icon btn-delete" onclick="deleteAnimal(${a.id})">🗑️ Hapus</button>
        </div>
      </td>
    </tr>`
  ).join('') || `<tr><td colspan="7" style="text-align:center;color:var(--text-light);padding:2rem">Belum ada data hewan</td></tr>`;
}

// ==============================================================
// MODAL TAMBAH / EDIT HEWAN
// ==============================================================

/* Peta emoji otomatis berdasarkan jenis hewan */
const SPECIES_EMOJI = {
  Kucing:  '🐱',
  Anjing:  '🐕',
  Kelinci: '🐇',
  Burung:  '🦜',
  Hamster: '🐹',
  Lainnya: '🐾',
};

function getEmojiBySpecies(species) {
  return SPECIES_EMOJI[species] || '🐾';
}

/* Dipanggil saat dropdown jenis hewan berubah — tidak perlu render apapun,
   emoji akan diambil otomatis dari species saat simpan */
function previewSpeciesEmoji() { /* placeholder untuk onchange di HTML */ }

function openAnimalModal() {
  document.getElementById('aEditId').value    = '';
  document.getElementById('animalModalTitle').textContent = 'Tambah Hewan';
  document.getElementById('aName').value      = '';
  document.getElementById('aBreed').value     = '';
  document.getElementById('aAge').value       = '';
  document.getElementById('aLocation').value  = '';
  document.getElementById('aDesc').value      = '';
  document.getElementById('aSpecies').value   = 'Kucing';
  document.getElementById('aGender').value    = 'Betina';
  document.getElementById('aStatus').value    = 'available';
  document.getElementById('animalModal').classList.add('open');
}

function editAnimal(id) {
  const a = getAnimals().find(a => a.id === id);
  document.getElementById('aEditId').value    = id;
  document.getElementById('animalModalTitle').textContent = 'Edit Hewan';
  document.getElementById('aName').value      = a.name;
  document.getElementById('aBreed').value     = a.breed;
  document.getElementById('aAge').value       = a.age;
  document.getElementById('aLocation').value  = a.location;
  document.getElementById('aDesc').value      = a.desc;
  document.getElementById('aSpecies').value   = a.species;
  document.getElementById('aGender').value    = a.gender;
  document.getElementById('aStatus').value    = a.status;
  document.getElementById('animalModal').classList.add('open');
}

function closeAnimalModal() {
  document.getElementById('animalModal').classList.remove('open');
}

function saveAnimal() {
  const name     = document.getElementById('aName').value.trim();
  const breed    = document.getElementById('aBreed').value.trim();
  const age      = parseInt(document.getElementById('aAge').value) || 1;
  const location = document.getElementById('aLocation').value.trim();
  const desc     = document.getElementById('aDesc').value.trim();
  const species  = document.getElementById('aSpecies').value;
  const gender   = document.getElementById('aGender').value;
  const status   = document.getElementById('aStatus').value;
  const editId   = document.getElementById('aEditId').value;

  /* Emoji ditentukan otomatis dari jenis hewan */
  const image = getEmojiBySpecies(species);

  if (!name || !breed || !location) {
    showToast('⚠️ Nama, ras, dan lokasi wajib diisi!');
    return;
  }

  let animals = getAnimals();

  if (editId) {
    const idx = animals.findIndex(a => a.id == editId);
    animals[idx] = { ...animals[idx], name, image, breed, age, location, desc, species, gender, status };
    showToast('✅ Data hewan berhasil diperbarui!');
  } else {
    animals.push({
      id: Date.now(),
      name, image, breed, age, location, desc, species, gender, status,
      addedDate: new Date().toISOString(),
    });
    showToast('🎉 Hewan baru berhasil ditambahkan!');
  }

  saveAnimals(animals);
  closeAnimalModal();
  renderAnimalsTable();
  renderOverview();
}

function deleteAnimal(id) {
  if (!confirm('Yakin ingin menghapus hewan ini?')) return;
  saveAnimals(getAnimals().filter(a => a.id !== id));
  showToast('🗑️ Hewan berhasil dihapus.');
  renderAnimalsTable();
  renderOverview();
}

// ==============================================================
// TABEL PENGAJUAN ADOPSI
// ==============================================================

const expMap = {
  none:         'Belum pernah',
  beginner:     'Pemula (1-2 thn)',
  intermediate: 'Menengah (3-5 thn)',
  expert:       'Berpengalaman (5+ thn)',
};

function renderAdoptionsTable() {
  const filter    = document.getElementById('adoptionFilter')?.value || '';
  const adoptions = getAdoptions()
    .filter(a => !filter || a.status === filter)
    .reverse();

  document.getElementById('adoptionsTableBody').innerHTML = adoptions.map(a => `
    <tr>
      <td>${a.animalImage} <strong>${a.animalName}</strong></td>
      <td>
        ${a.userName}
        <br><span style="font-size:0.78rem;color:var(--text-light)">${a.userEmail}</span>
      </td>
      <td>${expMap[a.experience] || a.experience}</td>
      <td>${new Date(a.date).toLocaleDateString('id-ID')}</td>
      <td>${statusPill(a.status)}</td>
      <td>
        ${a.status === 'menunggu'
          ? `<button class="btn-icon btn-approve" onclick="openReview(${a.id})">📋 Tinjau</button>`
          : `<button class="btn-icon btn-edit"    onclick="openReview(${a.id})">👁️ Lihat</button>`}
      </td>
    </tr>`
  ).join('') || `<tr><td colspan="6" style="text-align:center;color:var(--text-light);padding:2rem">Tidak ada pengajuan</td></tr>`;

  updatePendingBadge();
}

// ==============================================================
// MODAL TINJAU ADOPSI
// ==============================================================

function openReview(id) {
  currentReviewId = id;
  const a = getAdoptions().find(a => a.id === id);

  document.getElementById('reviewDetails').innerHTML = `
    <div class="detail-box">
      <strong>Hewan:</strong>   ${a.animalImage} ${a.animalName} (${a.animalBreed})<br>
      <strong>Pengaju:</strong>  ${a.userName} — ${a.userEmail}<br>
      <strong>Alamat:</strong>   ${a.address}<br>
      <strong>Pengalaman:</strong> ${expMap[a.experience] || a.experience}<br>
      <strong>Alasan:</strong>   ${a.reason}<br>
      <strong>Tanggal:</strong>  ${new Date(a.date).toLocaleString('id-ID')}<br>
      <strong>Status:</strong>   ${statusPill(a.status)}
      ${a.adminNote ? `<br><strong>Catatan Admin:</strong> ${a.adminNote}` : ''}
    </div>`;

  document.getElementById('adminNote').value = a.adminNote || '';
  document.getElementById('reviewModal').classList.add('open');
}

function closeReviewModal() {
  document.getElementById('reviewModal').classList.remove('open');
  currentReviewId = null;
}

function processAdoption(decision) {
  if (!currentReviewId) return;

  const note      = document.getElementById('adminNote').value.trim();
  let adoptions   = getAdoptions();
  const idx       = adoptions.findIndex(a => a.id === currentReviewId);
  const adoption  = adoptions[idx];

  adoptions[idx] = {
    ...adoption,
    status: decision,
    adminNote: note,
    processedDate: new Date().toISOString(),
  };
  saveAdoptions(adoptions);

  // Perbarui status hewan
  const animals = getAnimals();
  const ai = animals.findIndex(a => a.id === adoption.animalId);
  if (ai !== -1) {
    animals[ai].status = decision === 'disetujui' ? 'adopted' : 'available';
    saveAnimals(animals);
  }

  // Kirim notifikasi ke pengguna
  const notifs = getNotifs();
  const isApproved = decision === 'disetujui';
  notifs.push({
    id:      Date.now(),
    userId:  adoption.userId,
    title:   isApproved ? '🎉 Pengajuan Disetujui!' : '❌ Pengajuan Ditolak',
    message: isApproved
      ? `Selamat! Pengajuan adopsi ${adoption.animalName} Anda telah disetujui.${note ? ' Catatan: ' + note : ''}`
      : `Maaf, pengajuan adopsi ${adoption.animalName} Anda tidak dapat diproses.${note ? ' Alasan: ' + note : ''}`,
    type:  isApproved ? 'approved' : 'rejected',
    read:  false,
    time:  new Date().toISOString(),
  });
  saveNotifs(notifs);

  closeReviewModal();
  showToast(isApproved ? '✅ Pengajuan disetujui!' : '❌ Pengajuan ditolak.');
  renderAdoptionsTable();
  renderOverview();
}

// ==============================================================
// TABEL PENGGUNA
// ==============================================================

function renderUsersTable() {
  const q         = (document.getElementById('userSearch')?.value || '').toLowerCase();
  const users     = getUsers().filter(u =>
    !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
  );
  const adoptions = getAdoptions();

  document.getElementById('usersTableBody').innerHTML = users.map(u => `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:0.6rem">
          <div style="width:32px;height:32px;border-radius:50%;background:var(--green);
                      display:flex;align-items:center;justify-content:center;
                      color:white;font-weight:700;font-size:0.82rem;flex-shrink:0">
            ${u.name.charAt(0).toUpperCase()}
          </div>
          <strong>${u.name}</strong>
        </div>
      </td>
      <td>${u.email}</td>
      <td>${u.phone}</td>
      <td>${u.joinDate ? new Date(u.joinDate).toLocaleDateString('id-ID') : 'N/A'}</td>
      <td style="text-align:center">${adoptions.filter(a => a.userId === u.id).length}</td>
    </tr>`
  ).join('') || `<tr><td colspan="5" style="text-align:center;color:var(--text-light);padding:2rem">Tidak ada pengguna</td></tr>`;
}

// ==============================================================
// LAPORAN PERKEMBANGAN HEWAN
// ==============================================================

let activeReportFilter = '';

const kondisiConfig = {
  'sangat-baik':     { cls: 'kondisi-sangat-baik',    label: '⭐ Sangat Baik' },
  'baik':            { cls: 'kondisi-baik',            label: '✅ Baik' },
  'cukup':           { cls: 'kondisi-cukup',           label: '⚠️ Cukup' },
  'perlu-perhatian': { cls: 'kondisi-perlu-perhatian', label: '🚨 Perlu Perhatian' },
};

const rstatConfig = {
  baru:    { cls: 'rstat-badge rstat-baru',    label: 'Baru' },
  dibaca:  { cls: 'rstat-badge rstat-dibaca',  label: 'Dibaca' },
  dibalas: { cls: 'rstat-badge rstat-dibalas', label: 'Dibalas' },
};

function updateNewReportBadge() {
  const count = getReports().filter(r => r.status === 'baru').length;
  const badge = document.getElementById('newReportBadge');
  badge.style.display = count > 0 ? 'inline-block' : 'none';
  badge.textContent   = count;
}

function filterReports(filter) {
  activeReportFilter = filter;
  // Update chip aktif
  document.querySelectorAll('#reportFilterChips .chip').forEach(c => {
    c.classList.toggle('active', c.dataset.filter === filter);
  });
  renderReportsSection();
}

function renderReportsSection() {
  let reports = getReports().reverse();

  // Terapkan filter
  if (activeReportFilter === 'baru' || activeReportFilter === 'dibaca' || activeReportFilter === 'dibalas') {
    reports = reports.filter(r => r.status === activeReportFilter);
  } else if (activeReportFilter) {
    // filter berdasarkan kondisi
    reports = reports.filter(r => r.kondisi === activeReportFilter);
  }

  // Tandai laporan "baru" sebagai "dibaca" saat admin membuka halaman
  const all = getReports();
  let changed = false;
  all.forEach(r => {
    if (r.status === 'baru') { r.status = 'dibaca'; changed = true; }
  });
  if (changed) { saveReports(all); updateNewReportBadge(); }

  const el = document.getElementById('reportCards');

  if (!reports.length) {
    el.innerHTML = `
      <div style="text-align:center;padding:4rem 2rem;color:var(--text-light)">
        <div style="font-size:3rem;margin-bottom:1rem">📋</div>
        <h3 style="font-family:'Playfair Display',serif;color:var(--brown)">Tidak ada laporan</h3>
        <p>Belum ada laporan yang sesuai dengan filter ini</p>
      </div>`;
    return;
  }

  el.innerHTML = reports.map(r => {
    const k    = kondisiConfig[r.kondisi] || { cls: '', label: r.kondisi };
    const stat = rstatConfig[r.status]   || { cls: '', label: r.status };
    const tags = (r.aspects || []).map(t => `<span class="rc-tag">${t}</span>`).join('');
    const existingReply = r.adminReply
      ? `<div class="rc-existing-reply"><strong>💬 Balasan Anda:</strong> ${r.adminReply}</div>`
      : '';

    return `
      <div class="report-card" id="rc-${r.id}">
        <div class="rc-header">
          <div class="rc-left">
            <span class="rc-emoji">${r.animalImage}</span>
            <div>
              <div class="rc-animal-name">${r.animalName}</div>
              <div class="rc-user-name">👤 ${r.userName} &mdash; ${r.userEmail}</div>
            </div>
          </div>
          <div style="text-align:right">
            <span class="${stat.cls}">${stat.label}</span>
            <div class="rc-date">${new Date(r.date).toLocaleString('id-ID', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</div>
          </div>
        </div>

        <span class="rc-kondisi ${k.cls}">${k.label}</span>
        <div class="rc-body">${r.desc}</div>
        ${r.weight ? `<div style="font-size:0.8rem;color:var(--text-light);margin-bottom:0.6rem">⚖️ Berat badan: <strong>${r.weight}</strong></div>` : ''}
        ${tags ? `<div class="rc-tags">${tags}</div>` : ''}
        ${existingReply}

        <div class="rc-actions">
          <button class="btn-icon btn-edit" onclick="toggleReplyArea(${r.id})">
            ${r.adminReply ? '✏️ Edit Balasan' : '💬 Balas'}
          </button>
        </div>

        <div class="rc-reply-area" id="rra-${r.id}">
          <textarea class="rc-reply-input" id="rri-${r.id}"
            placeholder="Tulis balasan / saran untuk ${r.userName}...">${r.adminReply || ''}</textarea>
          <div style="display:flex;gap:0.5rem">
            <button class="btn-icon btn-approve" onclick="sendReply(${r.id})">📤 Kirim Balasan</button>
            <button class="btn-icon btn-delete"  onclick="toggleReplyArea(${r.id})">Batal</button>
          </div>
        </div>
      </div>`;
  }).join('');
}

function toggleReplyArea(reportId) {
  const area = document.getElementById('rra-' + reportId);
  area.classList.toggle('open');
}

function sendReply(reportId) {
  const replyText = document.getElementById('rri-' + reportId).value.trim();
  if (!replyText) { showToast('⚠️ Balasan tidak boleh kosong!'); return; }

  const reports = getReports();
  const idx     = reports.findIndex(r => r.id === reportId);
  if (idx === -1) return;

  reports[idx].adminReply = replyText;
  reports[idx].status     = 'dibalas';
  reports[idx].repliedAt  = new Date().toISOString();
  saveReports(reports);

  // Kirim notifikasi ke pengguna
  const r      = reports[idx];
  const notifs = getNotifs();
  notifs.push({
    id:      Date.now(),
    userId:  r.userId,
    title:   `💬 Admin membalas laporan Anda`,
    message: `Laporan perkembangan ${r.animalName} mendapat balasan dari admin: "${replyText}"`,
    type:    'approved',
    read:    false,
    time:    new Date().toISOString(),
  });
  saveNotifs(notifs);

  showToast('✅ Balasan berhasil dikirim ke pengguna!');
  updateNewReportBadge();
  renderReportsSection();
}

// ==============================================================
// PENITIPAN HEWAN — ADMIN
// ==============================================================

const BOARDING_RATE = 50000;

function formatRupiah(n) {
  return 'Rp ' + n.toLocaleString('id-ID');
}

function calcDays(ci, co) {
  return Math.max(0, Math.round((new Date(co) - new Date(ci)) / 86400000));
}

let activeBoardingFilter = '';

const boardingStatusMap = {
  menunggu:    { cls: 'bpill bpill-menunggu',    label: '⏳ Menunggu'    },
  disetujui:   { cls: 'bpill bpill-disetujui',   label: '✅ Disetujui'   },
  ditolak:     { cls: 'bpill bpill-ditolak',     label: '❌ Ditolak'     },
  berlangsung: { cls: 'bpill bpill-berlangsung', label: '🔵 Berlangsung' },
  selesai:     { cls: 'bpill bpill-selesai',     label: '🎉 Selesai'     },
};

const speciesEmoji = { Kucing:'🐱', Anjing:'🐕', Kelinci:'🐇', Burung:'🦜', Hamster:'🐹', Lainnya:'🐾' };

function updateNewBoardingBadge() {
  const count = getBoardings().filter(b => b.status === 'menunggu').length;
  const badge = document.getElementById('newBoardingBadge');
  badge.style.display = count > 0 ? 'inline-block' : 'none';
  badge.textContent   = count;
}

function filterBoardings(filter) {
  activeBoardingFilter = filter;
  document.querySelectorAll('#boardingFilterChips .chip').forEach(c => {
    c.classList.toggle('active', c.dataset.filter === filter);
  });
  renderBoardingsSection();
}

function renderBoardingStats() {
  const all = getBoardings();
  const stats = [
    { icon:'⏳', label:'Menunggu',    val: all.filter(b=>b.status==='menunggu').length,    color:'var(--orange)' },
    { icon:'🔵', label:'Berlangsung', val: all.filter(b=>b.status==='berlangsung').length, color:'#0891B2' },
    { icon:'🎉', label:'Selesai',     val: all.filter(b=>b.status==='selesai').length,     color:'#6D28D9' },
    { icon:'💰', label:'Total Pendapatan', val: formatRupiah(all.filter(b=>b.status==='selesai').reduce((s,b)=>s+b.totalCost,0)), color:'var(--green)', isText:true },
  ];
  document.getElementById('boardingStatRow').innerHTML = stats.map(s => `
    <div class="stat-card" data-icon="${s.icon}">
      <div class="stat-label">${s.label}</div>
      <div class="stat-value" style="font-size:${s.isText?'1.2rem':'2rem'};color:${s.color}">${s.val}</div>
    </div>`
  ).join('');
}

function renderBoardingsSection() {
  renderBoardingStats();

  let boardings = getBoardings().reverse();
  if (activeBoardingFilter) {
    boardings = boardings.filter(b => b.status === activeBoardingFilter);
  }

  const el = document.getElementById('boardingCards');

  if (!boardings.length) {
    el.innerHTML = `
      <div style="text-align:center;padding:4rem 2rem;color:var(--text-light)">
        <div style="font-size:3rem;margin-bottom:1rem">🏡</div>
        <h3 style="font-family:'Playfair Display',serif;color:var(--brown)">Tidak ada pengajuan</h3>
        <p>Belum ada pengajuan penitipan pada filter ini</p>
      </div>`;
    return;
  }

  el.innerHTML = boardings.map(b => {
    const st       = boardingStatusMap[b.status] || { cls:'bpill', label: b.status };
    const emoji    = speciesEmoji[b.petSpecies] || '🐾';
    const days     = calcDays(b.checkIn, b.checkOut);
    const services = (b.services||[]).map(s=>`<span class="bc-service-tag">${s}</span>`).join('');

    // Tombol aksi sesuai status
    let actionBtns = '';
    if (b.status === 'menunggu') {
      actionBtns = `
        <button class="btn-icon btn-approve"  onclick="openBoardingProcess(${b.id})">📋 Proses</button>`;
    } else if (b.status === 'disetujui') {
      actionBtns = `
        <button class="btn-icon btn-edit"    onclick="updateBoardingStatus(${b.id},'berlangsung')">▶️ Mulai</button>
        <button class="btn-icon btn-delete"  onclick="updateBoardingStatus(${b.id},'ditolak')">❌ Batalkan</button>`;
    } else if (b.status === 'berlangsung') {
      actionBtns = `
        <button class="btn-icon btn-approve" onclick="updateBoardingStatus(${b.id},'selesai')">🎉 Tandai Selesai</button>`;
    } else {
      actionBtns = `<button class="btn-icon btn-edit" onclick="openBoardingProcess(${b.id})">👁️ Detail</button>`;
    }

    return `
      <div class="boarding-card status-${b.status}" id="bc-${b.id}">
        <div class="bc-header">
          <div class="bc-left">
            <span class="bc-emoji">${emoji}</span>
            <div>
              <div class="bc-top">${b.petName} <span style="font-size:0.85rem;font-weight:400;color:var(--text-light)">(${b.petBreed} · ${b.petSpecies})</span></div>
              <div class="bc-user">👤 ${b.userName} · 📱 ${b.contactPhone}</div>
            </div>
          </div>
          <div>
            <span class="${st.cls}">${st.label}</span>
            <div class="bc-date">${new Date(b.date).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'})}</div>
          </div>
        </div>

        <div class="bc-meta">
          <span class="bc-tag">📥 Masuk: <strong>${new Date(b.checkIn).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'})}</strong></span>
          <span class="bc-tag">📤 Keluar: <strong>${new Date(b.checkOut).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'})}</strong></span>
          <span class="bc-tag">🗓 <strong>${days} hari</strong></span>
          <span class="bc-tag">💰 <strong>${formatRupiah(b.totalCost)}</strong></span>
          <span class="bc-tag">📧 ${b.userEmail}</span>
        </div>

        ${services ? `<div class="bc-services">${services}</div>` : ''}
        ${b.notes     ? `<div class="bc-note">📝 <em>${b.notes}</em></div>` : ''}
        ${b.adminNote ? `<div class="bc-note" style="background:#F0F7FF;border-left:3px solid #60A5FA;color:#1E40AF"><strong>💬 Catatan Admin:</strong> ${b.adminNote}</div>` : ''}

        <div class="bc-actions">${actionBtns}</div>

        <!-- Area proses (setuju/tolak) -->
        <div class="bc-process-area" id="bpa-${b.id}">
          <div style="font-size:0.82rem;font-weight:600;color:var(--text-light);margin-bottom:0.5rem;text-transform:uppercase;letter-spacing:0.05em">Catatan untuk Pengguna (opsional)</div>
          <textarea class="bc-note-input" id="bni-${b.id}" placeholder="cth: Hewan diterima, harap bawa sertifikat vaksin saat check-in...">${b.adminNote||''}</textarea>
          <div class="bc-process-actions">
            <button class="btn-icon btn-approve" onclick="processBoardingDecision(${b.id},'disetujui')">✅ Setujui</button>
            <button class="btn-icon btn-reject"  onclick="processBoardingDecision(${b.id},'ditolak')">❌ Tolak</button>
            <button class="btn-icon"             onclick="toggleBoardingProcess(${b.id})" style="background:var(--warm);color:var(--brown-dark)">Batal</button>
          </div>
        </div>
      </div>`;
  }).join('');

  updateNewBoardingBadge();
}

function openBoardingProcess(id) {
  // Tutup semua area proses lain dulu
  document.querySelectorAll('.bc-process-area.open').forEach(el => el.classList.remove('open'));
  document.getElementById('bpa-' + id).classList.add('open');
  document.getElementById('bpa-' + id).scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function toggleBoardingProcess(id) {
  document.getElementById('bpa-' + id).classList.toggle('open');
}

function processBoardingDecision(id, decision) {
  const note      = document.getElementById('bni-' + id).value.trim();
  const boardings = getBoardings();
  const idx       = boardings.findIndex(b => b.id === id);
  if (idx === -1) return;

  const b = boardings[idx];
  boardings[idx] = { ...b, status: decision, adminNote: note, processedDate: new Date().toISOString() };
  saveBoardings(boardings);

  // Notifikasi ke pengguna
  const notifs   = getNotifs();
  const approved = decision === 'disetujui';
  notifs.push({
    id:      Date.now(),
    userId:  b.userId,
    title:   approved ? '✅ Penitipan Disetujui!' : '❌ Penitipan Ditolak',
    message: approved
      ? `Pengajuan penitipan ${b.petName} (${calcDays(b.checkIn,b.checkOut)} hari) telah disetujui.${note ? ' Catatan: '+note : ''}`
      : `Maaf, pengajuan penitipan ${b.petName} tidak dapat diproses.${note ? ' Alasan: '+note : ''}`,
    type:  approved ? 'approved' : 'rejected',
    read:  false,
    time:  new Date().toISOString(),
  });
  saveNotifs(notifs);

  showToast(approved ? '✅ Penitipan disetujui!' : '❌ Penitipan ditolak.');
  renderBoardingsSection();
}

function updateBoardingStatus(id, newStatus) {
  const statusLabel = { berlangsung:'dimulai', selesai:'diselesaikan', ditolak:'dibatalkan' };
  if (!confirm(`Yakin ingin menandai penitipan ini sebagai "${newStatus}"?`)) return;

  const boardings = getBoardings();
  const idx       = boardings.findIndex(b => b.id === id);
  if (idx === -1) return;

  const b = boardings[idx];
  boardings[idx] = { ...b, status: newStatus, updatedDate: new Date().toISOString() };
  saveBoardings(boardings);

  // Notifikasi ke pengguna
  const notifs  = getNotifs();
  const msgMap  = {
    berlangsung: `Penitipan ${b.petName} Anda kini sedang berlangsung. Hewan Anda dalam pengawasan kami! 🐾`,
    selesai:     `Penitipan ${b.petName} telah selesai. Silakan jemput hewan Anda. Terima kasih! 🎉`,
    ditolak:     `Penitipan ${b.petName} telah dibatalkan.`,
  };
  notifs.push({
    id:      Date.now(),
    userId:  b.userId,
    title:   newStatus === 'berlangsung' ? '🔵 Penitipan Dimulai' : newStatus === 'selesai' ? '🎉 Penitipan Selesai' : '❌ Penitipan Dibatalkan',
    message: msgMap[newStatus] || `Status penitipan ${b.petName} diperbarui.`,
    type:    newStatus === 'selesai' ? 'approved' : newStatus === 'ditolak' ? 'rejected' : 'pending',
    read:    false,
    time:    new Date().toISOString(),
  });
  saveNotifs(notifs);

  showToast(`✅ Status penitipan berhasil diperbarui ke "${newStatus}"`);
  renderBoardingsSection();
}

// ==============================================================
// PENGADUAN / KOMPLAIN — ADMIN
// ==============================================================

let activeComplaintFilter = '';

const complaintStatusCfg = {
  baru:     { pillCls: 'cspill-baru',     label: '⏳ Baru'     },
  diproses: { pillCls: 'cspill-diproses', label: '🔵 Diproses' },
  selesai:  { pillCls: 'cspill-selesai',  label: '✅ Selesai'  },
  ditutup:  { pillCls: 'cspill-ditutup',  label: '⚫ Ditutup'  },
};

const urgencyCfg = {
  rendah:  { cls: 'urgency-rendah', label: '🟢 Rendah'  },
  sedang:  { cls: 'urgency-sedang', label: '🟡 Sedang'  },
  tinggi:  { cls: 'urgency-tinggi', label: '🔴 Tinggi'  },
  kritis:  { cls: 'urgency-kritis', label: '🚨 Kritis'  },
};

function updateNewComplaintBadge() {
  const count = getComplaints().filter(c => c.status === 'baru').length;
  const badge = document.getElementById('newComplaintBadge');
  badge.style.display = count > 0 ? 'inline-block' : 'none';
  badge.textContent   = count;
}

function filterComplaints(filter) {
  activeComplaintFilter = filter;
  document.querySelectorAll('#complaintFilterChips .chip').forEach(c => {
    c.classList.toggle('active', c.dataset.filter === filter);
  });
  renderComplaintsSection();
}

function renderComplaintStats() {
  const all = getComplaints();
  const stats = [
    { icon:'🟠', label:'Baru',      val: all.filter(c => c.status === 'baru').length,     color:'var(--orange)'  },
    { icon:'🔵', label:'Diproses',  val: all.filter(c => c.status === 'diproses').length, color:'#0891B2'        },
    { icon:'✅', label:'Selesai',   val: all.filter(c => c.status === 'selesai').length,  color:'var(--green)'   },
    { icon:'⭐', label:'Rata-rata Rating',
      val: (() => {
        const rated = all.filter(c => c.rating);
        if (!rated.length) return '—';
        return (rated.reduce((s, c) => s + c.rating, 0) / rated.length).toFixed(1) + ' / 5';
      })(),
      color:'#B45309', isText: true },
  ];
  document.getElementById('complaintStatRow').innerHTML = stats.map(s => `
    <div class="stat-card" data-icon="${s.icon}">
      <div class="stat-label">${s.label}</div>
      <div class="stat-value" style="font-size:${s.isText ? '1.3rem' : '2rem'};color:${s.color}">${s.val}</div>
    </div>`
  ).join('');
}

function renderComplaintsSection() {
  renderComplaintStats();

  let complaints = getComplaints().reverse();

  if (activeComplaintFilter === 'kritis') {
    complaints = complaints.filter(c => c.urgency === 'kritis');
  } else if (activeComplaintFilter) {
    complaints = complaints.filter(c => c.status === activeComplaintFilter);
  }

  const el = document.getElementById('complaintCards');

  if (!complaints.length) {
    el.innerHTML = `
      <div style="text-align:center;padding:4rem 2rem;color:var(--text-light)">
        <div style="font-size:3rem;margin-bottom:1rem">📣</div>
        <h3 style="font-family:'Playfair Display',serif;color:var(--brown)">Tidak ada pengaduan</h3>
        <p>Belum ada pengaduan yang sesuai dengan filter ini</p>
      </div>`;
    updateNewComplaintBadge();
    return;
  }

  el.innerHTML = complaints.map(c => {
    const st  = complaintStatusCfg[c.status] || complaintStatusCfg.baru;
    const urg = urgencyCfg[c.urgency]        || urgencyCfg.sedang;

    // Riwayat balasan
    const repliesHTML = (c.replies || []).map(r => `
      <div class="cc-reply-bubble">
        <div class="rb-meta">💬 Admin · ${new Date(r.time).toLocaleString('id-ID')}</div>
        ${r.text}
      </div>`
    ).join('');

    // Rating dari user
    const ratingHTML = c.rating
      ? `<div class="cc-rating">
           <span class="cc-stars">${'⭐'.repeat(c.rating)}</span>
           <span>${c.rating}/5 — ${c.ratingComment || 'Tidak ada komentar'}</span>
         </div>`
      : '';

    // Referensi transaksi
    const refHTML = c.reference
      ? `<div class="cc-ref">🔗 <strong>Ref:</strong> ${c.reference}</div>`
      : '';

    return `
      <div class="complaint-card cs-${c.status}" id="ccard-${c.id}">

        <div class="cc-header">
          <div class="cc-left">
            <div class="cc-title">${c.title}</div>
            <div class="cc-user">👤 ${c.userName} · ${c.userEmail} · 📱 ${c.phone}</div>
          </div>
          <div class="cc-right">
            <span class="cc-status-pill ${st.pillCls}">${st.label}</span>
            <div class="cc-date">${new Date(c.date).toLocaleString('id-ID', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</div>
          </div>
        </div>

        <div class="cc-meta">
          <span class="cc-topic-tag">${c.topic}</span>
          <span class="cc-urgency ${urg.cls}">${urg.label}</span>
          <span style="font-size:0.78rem;color:var(--text-light)">Harapan: ${c.expectation}</span>
        </div>

        ${refHTML}
        <div class="cc-body">${c.desc}</div>

        ${repliesHTML ? `<div class="cc-replies">${repliesHTML}</div>` : ''}
        ${ratingHTML}

        <!-- Tombol aksi -->
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap;align-items:center;margin-top:0.75rem">
          <button class="btn-icon btn-edit"    onclick="toggleComplaintReply(${c.id})">💬 Balas</button>
          <select class="cc-status-select" onchange="updateComplaintStatus(${c.id}, this.value)">
            <option value="baru"     ${c.status==='baru'     ?'selected':''}>⏳ Baru</option>
            <option value="diproses" ${c.status==='diproses' ?'selected':''}>🔵 Diproses</option>
            <option value="selesai"  ${c.status==='selesai'  ?'selected':''}>✅ Selesai</option>
            <option value="ditutup"  ${c.status==='ditutup'  ?'selected':''}>⚫ Tutup</option>
          </select>
        </div>

        <!-- Area balas -->
        <div class="cc-reply-area" id="ccra-${c.id}">
          <div style="font-size:0.78rem;font-weight:600;color:var(--text-light);margin-bottom:0.5rem;text-transform:uppercase;letter-spacing:0.05em">Tulis Balasan</div>
          <textarea class="cc-reply-textarea" id="ccrt-${c.id}"
            placeholder="Sampaikan respons, solusi, atau informasi tambahan kepada ${c.userName}..."></textarea>
          <div class="cc-reply-actions">
            <button class="btn-icon btn-approve" onclick="sendComplaintReply(${c.id})">📤 Kirim Balasan</button>
            <button class="btn-icon"             onclick="toggleComplaintReply(${c.id})" style="background:var(--warm);color:var(--brown-dark)">Batal</button>
          </div>
        </div>

      </div>`;
  }).join('');

  updateNewComplaintBadge();
}

function toggleComplaintReply(id) {
  document.querySelectorAll('.cc-reply-area.open').forEach(el => el.classList.remove('open'));
  document.getElementById('ccra-' + id).classList.add('open');
}

function sendComplaintReply(id) {
  const text = document.getElementById('ccrt-' + id).value.trim();
  if (!text) { showToast('⚠️ Balasan tidak boleh kosong!'); return; }

  const complaints = getComplaints();
  const idx        = complaints.findIndex(c => c.id === id);
  if (idx === -1)  return;

  const c = complaints[idx];
  if (!c.replies) c.replies = [];
  c.replies.push({ text, time: new Date().toISOString() });
  // Auto-ubah status ke diproses jika masih baru
  if (c.status === 'baru') c.status = 'diproses';
  c.userRead = false; // tandai belum dibaca oleh user
  complaints[idx] = c;
  saveComplaints(complaints);

  // Notifikasi ke pengguna
  const notifs = getNotifs();
  notifs.push({
    id:      Date.now(),
    userId:  c.userId,
    title:   '💬 Admin membalas pengaduan Anda',
    message: `Pengaduan "${c.title}" mendapat balasan: "${text.substring(0, 80)}${text.length > 80 ? '...' : ''}"`,
    type:    'approved',
    read:    false,
    time:    new Date().toISOString(),
  });
  saveNotifs(notifs);

  showToast('✅ Balasan berhasil dikirim!');
  updateNewComplaintBadge();
  renderComplaintsSection();
}

function updateComplaintStatus(id, newStatus) {
  const complaints = getComplaints();
  const idx        = complaints.findIndex(c => c.id === id);
  if (idx === -1)  return;

  const c          = complaints[idx];
  const oldStatus  = c.status;
  if (oldStatus === newStatus) return;

  complaints[idx].status   = newStatus;
  complaints[idx].userRead = false;
  saveComplaints(complaints);

  // Notifikasi perubahan status ke pengguna
  const statusLabel = { baru:'Baru', diproses:'Sedang Diproses', selesai:'Selesai', ditutup:'Ditutup' };
  const notifs = getNotifs();
  notifs.push({
    id:      Date.now(),
    userId:  c.userId,
    title:   `📣 Status Pengaduan Diperbarui`,
    message: `Pengaduan "${c.title}" kini berstatus: ${statusLabel[newStatus] || newStatus}.`,
    type:    newStatus === 'selesai' ? 'approved' : 'pending',
    read:    false,
    time:    new Date().toISOString(),
  });
  saveNotifs(notifs);

  showToast(`✅ Status pengaduan diperbarui ke "${statusLabel[newStatus]}"`);
  updateNewComplaintBadge();
  renderComplaintsSection();
}

// ==============================================================
// DONASI HEWAN — ADMIN
// ==============================================================

let activeDonationFilter = '';

const donationSpeciesEmoji = {
  Kucing:'🐱', Anjing:'🐕', Kelinci:'🐇',
  Burung:'🦜', Hamster:'🐹', Lainnya:'🐾',
};

function updateNewDonationBadge() {
  const count = getDonations().filter(d => d.status === 'menunggu').length;
  const badge = document.getElementById('newDonationBadge');
  badge.style.display = count > 0 ? 'inline-block' : 'none';
  badge.textContent   = count;
}

function filterDonations(filter) {
  activeDonationFilter = filter;
  document.querySelectorAll('#donationFilterChips .chip').forEach(c => {
    c.classList.toggle('active', c.dataset.filter === filter);
  });
  renderDonationsSection();
}

function renderDonationStats() {
  const all = getDonations();
  const stats = [
    { icon:'⏳', label:'Menunggu',   val: all.filter(d => d.status === 'menunggu').length,   color:'var(--orange)'  },
    { icon:'✅', label:'Disetujui',  val: all.filter(d => d.status === 'disetujui').length,  color:'var(--green)'   },
    { icon:'❌', label:'Ditolak',    val: all.filter(d => d.status === 'ditolak').length,    color:'var(--red)'     },
    { icon:'🎁', label:'Total Masuk',val: all.length,                                         color:'#7C3AED'        },
  ];
  document.getElementById('donationStatRow').innerHTML = stats.map(s => `
    <div class="stat-card" data-icon="${s.icon}">
      <div class="stat-label">${s.label}</div>
      <div class="stat-value" style="color:${s.color}">${s.val}</div>
    </div>`
  ).join('');
}

function renderDonationsSection() {
  renderDonationStats();

  let donations = getDonations().reverse();
  if (activeDonationFilter) {
    donations = donations.filter(d => d.status === activeDonationFilter);
  }

  const el = document.getElementById('donationCards');

  if (!donations.length) {
    el.innerHTML = `
      <div style="text-align:center;padding:4rem 2rem;color:var(--text-light)">
        <div style="font-size:3rem;margin-bottom:1rem">🎁</div>
        <h3 style="font-family:'Playfair Display',serif;color:var(--brown)">Tidak ada donasi</h3>
        <p>Belum ada donasi hewan yang sesuai filter ini</p>
      </div>`;
    updateNewDonationBadge();
    return;
  }

  el.innerHTML = donations.map(d => {
    const emoji  = d.image || donationSpeciesEmoji[d.species] || '🐾';
    const kondisiTags = (d.kondisi || []).map(k =>
      `<span class="dc-kondisi-tag">${k}</span>`).join('');

    const statusBadge = {
      menunggu:  `<span class="dpill dpill-menunggu">⏳ Menunggu</span>`,
      disetujui: `<span class="dpill dpill-disetujui">✅ Disetujui</span>`,
      ditolak:   `<span class="dpill dpill-ditolak">❌ Ditolak</span>`,
    }[d.status] || '';

    // Form kustomisasi hewan (hanya tampil saat proses approve)
    const customizeForm = `
      <div class="dc-customize-form">
        <div class="dc-field">
          <label>Nama di Galeri</label>
          <input type="text" id="dcName-${d.id}" value="${d.name}">
        </div>
        <div class="dc-field">
          <label>Status Galeri</label>
          <select id="dcStatus-${d.id}">
            <option value="available">Tersedia</option>
          </select>
        </div>
        <div class="dc-field">
          <label>Lokasi</label>
          <input type="text" id="dcLocation-${d.id}" value="${d.location}">
        </div>
        <div class="dc-field" style="grid-column:1/-1">
          <label>Deskripsi untuk Galeri</label>
          <textarea id="dcDesc-${d.id}" rows="2">${d.desc}</textarea>
        </div>
      </div>`;

    return `
      <div class="donation-card ds-${d.status}" id="dcard-${d.id}">

        <div class="dc-header">
          <div class="dc-left">
            <span class="dc-emoji">${emoji}</span>
            <div>
              <div class="dc-name">${d.name}
                <span style="font-weight:400;font-size:0.85rem;color:var(--text-light)">
                  (${d.breed} · ${d.species})
                </span>
              </div>
              <div class="dc-user">👤 ${d.userName} · ${d.userEmail} · 📱 ${d.phone}</div>
            </div>
          </div>
          <div class="dc-right">
            ${statusBadge}
            <div class="dc-date">${new Date(d.date).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' })}</div>
          </div>
        </div>

        <div class="dc-specs">
          <span class="dc-spec-tag">🐾 <strong>${d.species}</strong></span>
          <span class="dc-spec-tag">🎂 <strong>${d.age} tahun</strong></span>
          <span class="dc-spec-tag">${d.gender === 'Jantan' ? '♂' : '♀'} <strong>${d.gender}</strong></span>
          <span class="dc-spec-tag">📍 <strong>${d.location}</strong></span>
        </div>

        ${kondisiTags ? `<div class="dc-kondisi-tags">${kondisiTags}</div>` : ''}
        <div class="dc-desc">${d.desc}</div>
        <div class="dc-alasan">💬 Alasan donasi: "${d.reason}"</div>

        ${d.adminNote ? `
          <div style="background:${d.status==='disetujui'?'#EDF7F1':'#FEF2F2'};
                      border-left:3px solid ${d.status==='disetujui'?'var(--green)':'var(--red)'};
                      border-radius:0 0.5rem 0.5rem 0;padding:0.65rem 1rem;
                      font-size:0.84rem;color:${d.status==='disetujui'?'#065F46':'#991B1B'};
                      margin-bottom:0.5rem">
            📝 Catatan Admin: ${d.adminNote}
          </div>` : ''}

        <!-- Tombol aksi (hanya untuk yang masih menunggu) -->
        ${d.status === 'menunggu' ? `
          <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:0.75rem">
            <button class="btn-icon btn-approve" onclick="openDonationProcess(${d.id})">
              ✅ Review & Setujui
            </button>
            <button class="btn-icon btn-reject" onclick="processDonation(${d.id},'ditolak','')">
              ❌ Tolak
            </button>
          </div>` : ''}

        <!-- Area proses approve -->
        <div class="dc-process-area" id="dpa-${d.id}">
          <div class="dc-process-label">✏️ Sesuaikan data sebelum masuk galeri</div>
          ${customizeForm}
          <div class="dc-process-label">📝 Catatan untuk Pengguna (opsional)</div>
          <textarea class="dc-note-input" id="dni-${d.id}"
            placeholder="cth: Hewan Anda sudah kami terima dan akan segera dirawat..."></textarea>
          <div class="dc-process-actions">
            <button class="btn-icon btn-approve" onclick="processDonation(${d.id},'disetujui','')">
              🎉 Setujui & Masukkan ke Galeri
            </button>
            <button class="btn-icon" onclick="toggleDonationProcess(${d.id})"
              style="background:var(--warm);color:var(--brown-dark)">Batal</button>
          </div>
        </div>

      </div>`;
  }).join('');

  updateNewDonationBadge();
}

function openDonationProcess(id) {
  document.querySelectorAll('.dc-process-area.open').forEach(el => el.classList.remove('open'));
  const area = document.getElementById('dpa-' + id);
  area.classList.add('open');
  area.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function toggleDonationProcess(id) {
  document.getElementById('dpa-' + id).classList.toggle('open');
}

function processDonation(id, decision, _unused) {
  const donations = getDonations();
  const idx       = donations.findIndex(d => d.id === id);
  if (idx === -1) return;

  const d    = donations[idx];
  const note = document.getElementById('dni-' + id)?.value.trim() || '';

  donations[idx] = {
    ...d,
    status:    decision,
    adminNote: note,
    processedDate: new Date().toISOString(),
  };

  // Jika disetujui → tambahkan ke galeri hewan secara otomatis
  if (decision === 'disetujui') {
    const galName     = document.getElementById(`dcName-${id}`)?.value.trim()     || d.name;
    const galImage    = getEmojiBySpecies(d.species);
    const galLocation = document.getElementById(`dcLocation-${id}`)?.value.trim() || d.location;
    const galDesc     = document.getElementById(`dcDesc-${id}`)?.value.trim()     || d.desc;

    donations[idx].adminName = galName; // simpan nama yang dipakai di galeri

    const animals = getAnimals();
    animals.push({
      id:          Date.now(),
      name:        galName,
      image:       galImage,
      species:     d.species,
      breed:       d.breed,
      age:         d.age,
      gender:      d.gender,
      location:    galLocation,
      desc:        galDesc,
      status:      'available',
      addedDate:   new Date().toISOString(),
      donatedBy:   d.userName,  // jejak siapa yang mendonasikan
    });
    saveAnimals(animals);
  }

  saveDonations(donations);

  // Kirim notifikasi ke pengguna
  const notifs   = getNotifs();
  const approved = decision === 'disetujui';
  notifs.push({
    id:      Date.now(),
    userId:  d.userId,
    title:   approved ? '🎉 Donasi Hewan Disetujui!' : '❌ Donasi Hewan Ditolak',
    message: approved
      ? `Donasi hewan ${d.name} Anda telah disetujui dan kini tersedia di galeri adopsi PawCare!${note ? ' Catatan: ' + note : ''}`
      : `Maaf, donasi hewan ${d.name} tidak dapat kami terima saat ini.${note ? ' Alasan: ' + note : ''}`,
    type:  approved ? 'approved' : 'rejected',
    read:  false,
    time:  new Date().toISOString(),
  });
  saveNotifs(notifs);

  showToast(approved
    ? `🎉 ${d.name} berhasil ditambahkan ke galeri adopsi!`
    : `❌ Donasi ${d.name} ditolak.`);

  renderDonationsSection();
  renderOverview();
}

// ==============================================================
// KELUAR
// ==============================================================

function logout() {
  clearSession();
  window.location.href = 'index.html';
}



function logout() {
  clearSession();
  window.location.href = 'index.html';
}

// ==============================================================
// INISIALISASI
// ==============================================================
renderOverview();
updateNewReportBadge();
updateNewBoardingBadge();
updateNewComplaintBadge();
updateNewDonationBadge();

// ---- Hamburger sidebar (mobile) ----
function toggleSidebar() {
  const sidebar = document.getElementById('mainSidebar');
  const overlay = document.getElementById('sidebarOverlay');
  const btn     = document.getElementById('hamburgerBtn');
  const isOpen  = sidebar.classList.toggle('open');
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

window.addEventListener('resize', () => {
  if (window.innerWidth > 768) closeSidebar();
});