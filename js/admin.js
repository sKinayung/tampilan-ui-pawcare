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
    overview:  renderOverview,
    animals:   renderAnimalsTable,
    adoptions: renderAdoptionsTable,
    users:     renderUsersTable,
    reports:   renderReportsSection,
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

function openAnimalModal() {
  // Reset semua field
  document.getElementById('aEditId').value    = '';
  document.getElementById('animalModalTitle').textContent = 'Tambah Hewan';
  document.getElementById('aName').value      = '';
  document.getElementById('aImage').value     = '🐾';
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
  document.getElementById('aImage').value     = a.image;
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
  const image    = document.getElementById('aImage').value.trim() || '🐾';
  const breed    = document.getElementById('aBreed').value.trim();
  const age      = parseInt(document.getElementById('aAge').value) || 1;
  const location = document.getElementById('aLocation').value.trim();
  const desc     = document.getElementById('aDesc').value.trim();
  const species  = document.getElementById('aSpecies').value;
  const gender   = document.getElementById('aGender').value;
  const status   = document.getElementById('aStatus').value;
  const editId   = document.getElementById('aEditId').value;

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
// KELUAR
// ==============================================================

function logout() {
  clearSession();
  window.location.href = 'index.html';
}

// ==============================================================
// INISIALISASI
// ==============================================================
renderOverview();
updateNewReportBadge();
