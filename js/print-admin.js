/* ============================================================
   print.js — Logika cetak laporan admin PawCare
   Semua fungsi di sini bergantung pada getter dari storage.js
   ============================================================ */

'use strict';

// ---- CSS bersama untuk semua laporan A4 ----
const PRINT_CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'Times New Roman', Times, serif;
    font-size: 12pt;
    color: #000;
    background: #fff;
    line-height: 1.5;
  }

  .page {
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto;
    padding: 2.5cm 2.5cm 2cm 3cm;
    background: #fff;
  }

  /* ---- KOP SURAT ---- */
  .kop {
    display: flex;
    align-items: center;
    gap: 16px;
    border-bottom: 3px double #000;
    padding-bottom: 10px;
    margin-bottom: 6px;
  }
  .kop-logo { font-size: 28pt; line-height: 1; }
  .kop-text { flex: 1; }
  .kop-nama {
    font-size: 16pt;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  .kop-sub   { font-size: 10pt; color: #333; margin-top: 2px; }
  .kop-alamat{ font-size: 9pt;  color: #555; margin-top: 2px; }
  .kop-divider {
    border: none;
    border-top: 1px solid #000;
    margin-bottom: 16px;
  }

  /* ---- JUDUL DOKUMEN ---- */
  .doc-title {
    text-align: center;
    margin: 18px 0 4px;
    font-size: 13pt;
    font-weight: bold;
    text-transform: uppercase;
    text-decoration: underline;
    letter-spacing: 0.5px;
  }
  .doc-subtitle {
    text-align: center;
    font-size: 10pt;
    color: #333;
    margin-bottom: 16px;
  }

  /* ---- INFO DOKUMEN ---- */
  .doc-info {
    font-size: 10.5pt;
    margin-bottom: 14px;
    line-height: 1.8;
  }
  .doc-info table { border: none; }
  .doc-info td { padding: 0 8px 0 0; vertical-align: top; }
  .doc-info td:first-child { white-space: nowrap; min-width: 130px; }

  /* ---- RINGKASAN ---- */
  .summary-title {
    font-size: 11pt;
    font-weight: bold;
    margin: 14px 0 6px;
  }
  .summary-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 16px;
    font-size: 10.5pt;
  }
  .summary-table th, .summary-table td {
    border: 1px solid #888;
    padding: 5px 10px;
    text-align: center;
  }
  .summary-table th { background: #f0f0f0; font-weight: bold; }

  /* ---- TABEL DATA ---- */
  .data-title {
    font-size: 11pt;
    font-weight: bold;
    margin: 14px 0 6px;
  }
  .data-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 10pt;
    margin-bottom: 20px;
  }
  .data-table th {
    background: #e8e8e8;
    border: 1px solid #555;
    padding: 6px 8px;
    text-align: center;
    font-weight: bold;
  }
  .data-table td {
    border: 1px solid #888;
    padding: 5px 8px;
    vertical-align: top;
  }
  .data-table tr:nth-child(even) td { background: #fafafa; }
  .data-table td:first-child { text-align: center; }

  /* ---- TANDA TANGAN ---- */
  .ttd-section {
    margin-top: 32px;
    display: flex;
    justify-content: flex-end;
  }
  .ttd-box { text-align: center; font-size: 11pt; line-height: 1.6; }
  .ttd-space { height: 60px; }
  .ttd-name { font-weight: bold; text-decoration: underline; }

  /* ---- FOOTER HALAMAN ---- */
  .page-footer {
    margin-top: 24px;
    border-top: 1px solid #aaa;
    padding-top: 6px;
    font-size: 8.5pt;
    color: #666;
    display: flex;
    justify-content: space-between;
  }

  /* ---- TOMBOL CETAK (tidak ikut cetak) ---- */
  .print-btn-bar {
    width: 210mm;
    margin: 16px auto 0;
    display: flex;
    gap: 10px;
    justify-content: flex-end;
  }
  .print-btn-bar button {
    padding: 8px 20px;
    font-size: 11pt;
    cursor: pointer;
    border-radius: 4px;
    font-family: Arial, sans-serif;
  }
  .btn-do-print { background: #2C5F2E; color: white; border: none; }
  .btn-close    { background: #eee; color: #333; border: 1px solid #ccc; }

  /* ---- PRINT MEDIA ---- */
  @media print {
    body { background: #fff; }
    .page {
      margin: 0;
      padding: 2.5cm 2.5cm 2cm 3cm;
      width: 100%;
      min-height: auto;
      box-shadow: none;
    }
    .no-print { display: none !important; }
    @page { size: A4 portrait; margin: 0; }
  }
`;

// ---- Helper: wrapper HTML dokumen A4 ----
function _buildDoc(title, bodyContent) {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>${title} — PawCare</title>
  <style>${PRINT_CSS}</style>
</head>
<body>
<div class="print-btn-bar no-print">
  <button class="btn-close"    onclick="window.close()">✕ Tutup</button>
  <button class="btn-do-print" onclick="window.print()">🖨️ Cetak / Simpan PDF</button>
</div>
<div class="page">
  ${bodyContent}
</div>
</body>
</html>`;
}

// ---- Helper: kop surat bersama ----
function _kop() {
  return `
  <div class="kop">
    <div class="kop-logo">🐾</div>
    <div class="kop-text">
      <div class="kop-nama">PawCare</div>
      <div class="kop-sub">Platform Penangkaran &amp; Adopsi Hewan</div>
      <div class="kop-alamat">Email: admin@pawcare.id &nbsp;|&nbsp; Telp: (0511) 123-4567 &nbsp;|&nbsp; pawcare.id</div>
    </div>
  </div>
  <hr class="kop-divider">`;
}

// ---- Helper: info dokumen bersama ----
function _docInfo(nomorSuffix, judulLaporan, tgl, jam) {
  return `
  <div class="doc-title">${judulLaporan}</div>
  <div class="doc-subtitle">Dokumen Internal PawCare</div>
  <div class="doc-info">
    <table>
      <tr><td>Nomor Dokumen</td><td>: ${nomorSuffix}</td></tr>
      <tr><td>Tanggal Cetak</td><td>: ${tgl}</td></tr>
      <tr><td>Pukul</td>        <td>: ${jam} WIB</td></tr>
      <tr><td>Dicetak Oleh</td> <td>: Administrator</td></tr>
    </table>
  </div>`;
}

// ---- Helper: tanda tangan & footer ----
function _ttdFooter(tgl, jam) {
  return `
  <div class="ttd-section">
    <div class="ttd-box">
      <div>Mengetahui,</div>
      <div>Administrator PawCare</div>
      <div class="ttd-space"></div>
      <div class="ttd-name">Administrator</div>
      <div style="font-size:10pt">Admin Sistem</div>
    </div>
  </div>
  <div class="page-footer">
    <span>PawCare — Dokumen Internal</span>
    <span>Dicetak: ${tgl}, ${jam} WIB</span>
  </div>`;
}

// ============================================================
// FUNGSI UTAMA: printSection(type)
// Dipanggil dari tombol di admin.html
// ============================================================
function printSection(type) {
  const now = new Date();
  const tgl = now.toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  const jam = now.toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' });
  const tglKode = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;

  const handlers = {
    animals:   () => _printAnimals(tgl, jam, tglKode),
    adoptions: () => _printAdoptions(tgl, jam, tglKode),
    reports:   () => _printReports(tgl, jam, tglKode),
    boardings: () => _printBoardings(tgl, jam, tglKode),
    complaints:() => _printComplaints(tgl, jam, tglKode),
    donations: () => _printDonations(tgl, jam, tglKode),
  };

  if (handlers[type]) {
    handlers[type]();
  } else {
    alert('Tipe laporan tidak dikenali: ' + type);
  }
}

// ============================================================
// LAPORAN 1 — DATA HEWAN
// ============================================================
function _printAnimals(tgl, jam, tglKode) {
  const data   = getAnimals();
  const tot    = data.length;
  const avl    = data.filter(a => a.status === 'available').length;
  const pnd    = data.filter(a => a.status === 'pending').length;
  const adp    = data.filter(a => a.status === 'adopted').length;
  const lblSts = { available:'Tersedia', pending:'Proses Adopsi', adopted:'Sudah Diadopsi' };

  const body = `
    ${_kop()}
    ${_docInfo(`LDH-${tglKode}-001`, 'Laporan Data Hewan', tgl, jam)}

    <div class="summary-title">I. Ringkasan Data</div>
    <table class="summary-table">
      <thead><tr><th>Total Hewan</th><th>Tersedia</th><th>Proses Adopsi</th><th>Sudah Diadopsi</th></tr></thead>
      <tbody><tr><td>${tot}</td><td>${avl}</td><td>${pnd}</td><td>${adp}</td></tr></tbody>
    </table>

    <div class="data-title">II. Daftar Hewan</div>
    <table class="data-table">
      <thead>
        <tr>
          <th style="width:4%">No</th>
          <th style="width:12%">Nama</th>
          <th style="width:9%">Jenis</th>
          <th style="width:13%">Ras / Breed</th>
          <th style="width:6%">Usia</th>
          <th style="width:8%">Kelamin</th>
          <th style="width:12%">Lokasi</th>
          <th style="width:27%">Deskripsi</th>
          <th style="width:9%">Status</th>
        </tr>
      </thead>
      <tbody>
        ${data.map((a, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${a.name}</td>
            <td>${a.species}</td>
            <td>${a.breed}</td>
            <td style="text-align:center">${a.age} thn</td>
            <td style="text-align:center">${a.gender}</td>
            <td>${a.location}</td>
            <td style="font-size:9pt">${a.desc || '—'}</td>
            <td style="text-align:center">${lblSts[a.status] || a.status}</td>
          </tr>`).join('')}
      </tbody>
    </table>

    ${_ttdFooter(tgl, jam)}`;

  const win = window.open('', '_blank');
  win.document.write(_buildDoc('Laporan Data Hewan', body));
  win.document.close();
}

// ============================================================
// LAPORAN 2 — PENGAJUAN ADOPSI
// ============================================================
function _printAdoptions(tgl, jam, tglKode) {
  const data   = getAdoptions();
  const tot    = data.length;
  const mng    = data.filter(a => a.status === 'menunggu').length;
  const stj    = data.filter(a => a.status === 'disetujui').length;
  const tlk    = data.filter(a => a.status === 'ditolak').length;
  const expMap = { none:'Belum pernah', beginner:'Pemula', intermediate:'Menengah', expert:'Berpengalaman' };
  const lblSts = { menunggu:'Menunggu', disetujui:'Disetujui', ditolak:'Ditolak' };

  const body = `
    ${_kop()}
    ${_docInfo(`LPA-${tglKode}-001`, 'Laporan Pengajuan Adopsi', tgl, jam)}

    <div class="summary-title">I. Ringkasan Data</div>
    <table class="summary-table">
      <thead><tr><th>Total</th><th>Menunggu</th><th>Disetujui</th><th>Ditolak</th></tr></thead>
      <tbody><tr><td>${tot}</td><td>${mng}</td><td>${stj}</td><td>${tlk}</td></tr></tbody>
    </table>

    <div class="data-title">II. Daftar Pengajuan Adopsi</div>
    <table class="data-table">
      <thead>
        <tr>
          <th style="width:4%">No</th>
          <th style="width:12%">Hewan</th>
          <th style="width:14%">Nama Pengaju</th>
          <th style="width:18%">Email</th>
          <th style="width:13%">Pengalaman</th>
          <th style="width:11%">Tanggal</th>
          <th style="width:28%">Alamat</th>
          <th style="width:10%">Status</th>
        </tr>
      </thead>
      <tbody>
        ${data.map((a, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${a.animalName}</td>
            <td>${a.userName}</td>
            <td style="font-size:9pt">${a.userEmail}</td>
            <td>${expMap[a.experience] || a.experience}</td>
            <td style="text-align:center">${new Date(a.date).toLocaleDateString('id-ID')}</td>
            <td style="font-size:9pt">${a.address || '—'}</td>
            <td style="text-align:center">${lblSts[a.status] || a.status}</td>
          </tr>`).join('')}
      </tbody>
    </table>

    ${_ttdFooter(tgl, jam)}`;

  const win = window.open('', '_blank');
  win.document.write(_buildDoc('Laporan Pengajuan Adopsi', body));
  win.document.close();
}

// ============================================================
// LAPORAN 3 — LAPORAN PERKEMBANGAN HEWAN
// ============================================================
function _printReports(tgl, jam, tglKode) {
  const data   = getReports();
  const tot    = data.length;
  const baru   = data.filter(r => r.status === 'baru').length;
  const dbaca  = data.filter(r => r.status === 'dibaca').length;
  const dbls   = data.filter(r => r.status === 'dibalas').length;
  const kMap   = { 'sangat-baik':'Sangat Baik', 'baik':'Baik', 'cukup':'Cukup', 'perlu-perhatian':'Perlu Perhatian' };
  const lblSts = { baru:'Baru', dibaca:'Dibaca', dibalas:'Dibalas' };

  const body = `
    ${_kop()}
    ${_docInfo(`LPH-${tglKode}-001`, 'Laporan Perkembangan Hewan Pasca Adopsi', tgl, jam)}

    <div class="summary-title">I. Ringkasan Data</div>
    <table class="summary-table">
      <thead><tr><th>Total</th><th>Baru</th><th>Dibaca</th><th>Dibalas</th></tr></thead>
      <tbody><tr><td>${tot}</td><td>${baru}</td><td>${dbaca}</td><td>${dbls}</td></tr></tbody>
    </table>

    <div class="data-title">II. Daftar Laporan Perkembangan</div>
    <table class="data-table">
      <thead>
        <tr>
          <th style="width:4%">No</th>
          <th style="width:12%">Hewan</th>
          <th style="width:14%">Pelapor</th>
          <th style="width:10%">Kondisi</th>
          <th style="width:18%">Aspek</th>
          <th style="width:27%">Deskripsi</th>
          <th style="width:8%">Berat</th>
          <th style="width:10%">Tanggal</th>
          <th style="width:7%">Status</th>
        </tr>
      </thead>
      <tbody>
        ${data.map((r, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${r.animalName}</td>
            <td>${r.userName}</td>
            <td>${kMap[r.kondisi] || r.kondisi}</td>
            <td style="font-size:9pt">${(r.aspects || []).join(', ') || '—'}</td>
            <td style="font-size:9pt">${r.desc || '—'}</td>
            <td style="text-align:center">${r.weight || '—'}</td>
            <td style="text-align:center">${new Date(r.date).toLocaleDateString('id-ID')}</td>
            <td style="text-align:center">${lblSts[r.status] || r.status}</td>
          </tr>`).join('')}
      </tbody>
    </table>

    ${_ttdFooter(tgl, jam)}`;

  const win = window.open('', '_blank');
  win.document.write(_buildDoc('Laporan Perkembangan Hewan', body));
  win.document.close();
}

// ============================================================
// LAPORAN 4 — PENITIPAN HEWAN
// ============================================================
function _printBoardings(tgl, jam, tglKode) {
  const data   = getBoardings();
  const tot    = data.length;
  const mng    = data.filter(b => b.status === 'menunggu').length;
  const stj    = data.filter(b => b.status === 'disetujui').length;
  const brl    = data.filter(b => b.status === 'berlangsung').length;
  const sls    = data.filter(b => b.status === 'selesai').length;
  const rev    = data.filter(b => b.status === 'selesai').reduce((s, b) => s + (b.totalCost || 0), 0);
  const lblSts = { menunggu:'Menunggu', disetujui:'Disetujui', berlangsung:'Berlangsung', selesai:'Selesai', ditolak:'Ditolak' };

  const landscapeCSS = PRINT_CSS
    .replace(
      '@page { size: A4 portrait; margin: 0; }',
      '@page { size: A4 landscape; margin: 0; }'
    )
    .replace(
      'width: 210mm;\n    min-height: 297mm;',
      'width: 297mm;\n    min-height: 210mm;'
    );

  const body = `
    ${_kop()}
    ${_docInfo(`LPT-${tglKode}-001`, 'Laporan Penitipan Hewan', tgl, jam)}

    <div class="summary-title">I. Ringkasan Data</div>
    <table class="summary-table">
      <thead><tr><th>Total</th><th>Menunggu</th><th>Disetujui</th><th>Berlangsung</th><th>Selesai</th><th>Total Pendapatan</th></tr></thead>
      <tbody><tr><td>${tot}</td><td>${mng}</td><td>${stj}</td><td>${brl}</td><td>${sls}</td><td>Rp ${rev.toLocaleString('id-ID')}</td></tr></tbody>
    </table>

    <div class="data-title">II. Daftar Penitipan Hewan</div>
    <table class="data-table">
      <thead>
        <tr>
          <th style="width:3%">No</th>
          <th style="width:9%">Nama Hewan</th>
          <th style="width:6%">Jenis</th>
          <th style="width:10%">Pemilik</th>
          <th style="width:14%">Email</th>
          <th style="width:9%">No. HP</th>
          <th style="width:8%">Check-In</th>
          <th style="width:8%">Check-Out</th>
          <th style="width:5%">Durasi</th>
          <th style="width:10%">Biaya</th>
          <th style="width:18%">Layanan Tambahan</th>
          <th style="width:8%">Status</th>
        </tr>
      </thead>
      <tbody>
        ${data.map((b, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${b.petName}</td>
            <td>${b.petSpecies}</td>
            <td>${b.userName}</td>
            <td style="font-size:9pt">${b.userEmail}</td>
            <td style="font-size:9pt">${b.contactPhone || '—'}</td>
            <td style="text-align:center">${new Date(b.checkIn).toLocaleDateString('id-ID')}</td>
            <td style="text-align:center">${new Date(b.checkOut).toLocaleDateString('id-ID')}</td>
            <td style="text-align:center">${b.days} hari</td>
            <td style="text-align:right">Rp ${(b.totalCost || 0).toLocaleString('id-ID')}</td>
            <td style="font-size:9pt">${(b.services || []).join(', ') || '—'}</td>
            <td style="text-align:center">${lblSts[b.status] || b.status}</td>
          </tr>`).join('')}
      </tbody>
    </table>

    ${_ttdFooter(tgl, jam)}`;

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Laporan Penitipan Hewan — PawCare</title>
  <style>${landscapeCSS}</style>
</head>
<body>
<div class="print-btn-bar no-print">
  <button class="btn-close"    onclick="window.close()">✕ Tutup</button>
  <button class="btn-do-print" onclick="window.print()">🖨️ Cetak / Simpan PDF</button>
</div>
<div class="page">
  ${body}
</div>
</body>
</html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
}

// ============================================================
// LAPORAN 5 — PENGADUAN
// ============================================================
function _printComplaints(tgl, jam, tglKode) {
  const data   = getComplaints();
  const tot    = data.length;
  const baru   = data.filter(c => c.status === 'baru').length;
  const dpr    = data.filter(c => c.status === 'diproses').length;
  const sls    = data.filter(c => c.status === 'selesai').length;
  const dtp    = data.filter(c => c.status === 'ditutup').length;
  const rated  = data.filter(c => c.rating);
  const avgRat = rated.length
    ? (rated.reduce((s, c) => s + c.rating, 0) / rated.length).toFixed(1) + ' / 5'
    : '—';
  const lblSts = { baru:'Baru', diproses:'Diproses', selesai:'Selesai', ditutup:'Ditutup' };
  const lblUrg = { rendah:'Rendah', sedang:'Sedang', tinggi:'Tinggi', kritis:'Kritis' };

  const body = `
    ${_kop()}
    ${_docInfo(`LPG-${tglKode}-001`, 'Laporan Pengaduan Pengguna', tgl, jam)}

    <div class="summary-title">I. Ringkasan Data</div>
    <table class="summary-table">
      <thead><tr><th>Total</th><th>Baru</th><th>Diproses</th><th>Selesai</th><th>Ditutup</th><th>Rata-rata Rating</th></tr></thead>
      <tbody><tr><td>${tot}</td><td>${baru}</td><td>${dpr}</td><td>${sls}</td><td>${dtp}</td><td>${avgRat}</td></tr></tbody>
    </table>

    <div class="data-title">II. Daftar Pengaduan</div>
    <table class="data-table">
      <thead>
        <tr>
          <th style="width:4%">No</th>
          <th style="width:18%">Judul Pengaduan</th>
          <th style="width:13%">Pengguna</th>
          <th style="width:10%">Topik</th>
          <th style="width:8%">Urgensi</th>
          <th style="width:22%">Harapan</th>
          <th style="width:9%">Tanggal</th>
          <th style="width:8%">Status</th>
          <th style="width:8%">Rating</th>
        </tr>
      </thead>
      <tbody>
        ${data.map((c, i) => `
          <tr>
            <td>${i + 1}</td>
            <td style="font-size:9pt">${c.title}</td>
            <td>${c.userName}</td>
            <td>${c.topic}</td>
            <td style="text-align:center">${lblUrg[c.urgency] || c.urgency}</td>
            <td style="font-size:9pt">${c.expectation}</td>
            <td style="text-align:center">${new Date(c.date).toLocaleDateString('id-ID')}</td>
            <td style="text-align:center">${lblSts[c.status] || c.status}</td>
            <td style="text-align:center">${c.rating ? c.rating + '/5' : '—'}</td>
          </tr>`).join('')}
      </tbody>
    </table>

    ${_ttdFooter(tgl, jam)}`;

  const win = window.open('', '_blank');
  win.document.write(_buildDoc('Laporan Pengaduan', body));
  win.document.close();
}

// ============================================================
// LAPORAN 6 — SUMBANG HEWAN
// ============================================================
function _printDonations(tgl, jam, tglKode) {
  const data   = getDonations();
  const tot    = data.length;
  const mng    = data.filter(d => d.status === 'menunggu').length;
  const stj    = data.filter(d => d.status === 'disetujui').length;
  const tlk    = data.filter(d => d.status === 'ditolak').length;
  const lblSts = { menunggu:'Menunggu', disetujui:'Disetujui', ditolak:'Ditolak' };

  // CSS khusus landscape — override PRINT_CSS yang portrait
  const landscapeCSS = PRINT_CSS
    .replace(
      '@page { size: A4 portrait; margin: 0; }',
      '@page { size: A4 landscape; margin: 0; }'
    )
    .replace(
      // Lebar .page dari 210mm (portrait) → 297mm (landscape)
      'width: 210mm;\n    min-height: 297mm;',
      'width: 297mm;\n    min-height: 210mm;'
    );

  const body = `
    ${_kop()}
    ${_docInfo(`LSH-${tglKode}-001`, 'Laporan Donasi Hewan dari Pengguna', tgl, jam)}

    <div class="summary-title">I. Ringkasan Data</div>
    <table class="summary-table">
      <thead><tr><th>Total</th><th>Menunggu Review</th><th>Disetujui</th><th>Ditolak</th></tr></thead>
      <tbody><tr><td>${tot}</td><td>${mng}</td><td>${stj}</td><td>${tlk}</td></tr></tbody>
    </table>

    <div class="data-title">II. Daftar Donasi Hewan</div>
    <table class="data-table">
      <thead>
        <tr>
          <th style="width:3%">No</th>
          <th style="width:9%">Nama Hewan</th>
          <th style="width:7%">Jenis</th>
          <th style="width:10%">Ras / Breed</th>
          <th style="width:5%">Usia</th>
          <th style="width:6%">Kelamin</th>
          <th style="width:11%">Donatur</th>
          <th style="width:15%">Email</th>
          <th style="width:10%">No. HP</th>
          <th style="width:10%">Lokasi</th>
          <th style="width:7%">Tanggal</th>
          <th style="width:7%">Status</th>
        </tr>
      </thead>
      <tbody>
        ${data.map((d, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${d.name}</td>
            <td>${d.species}</td>
            <td>${d.breed}</td>
            <td style="text-align:center">${d.age} thn</td>
            <td style="text-align:center">${d.gender}</td>
            <td>${d.userName}</td>
            <td style="font-size:9pt">${d.userEmail}</td>
            <td style="font-size:9pt">${d.phone || '—'}</td>
            <td>${d.location}</td>
            <td style="text-align:center">${new Date(d.date).toLocaleDateString('id-ID')}</td>
            <td style="text-align:center">${lblSts[d.status] || d.status}</td>
          </tr>`).join('')}
      </tbody>
    </table>

    ${_ttdFooter(tgl, jam)}`;

  // Buat dokumen dengan CSS landscape
  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Laporan Sumbang Hewan — PawCare</title>
  <style>${landscapeCSS}</style>
</head>
<body>
<div class="print-btn-bar no-print">
  <button class="btn-close"    onclick="window.close()">✕ Tutup</button>
  <button class="btn-do-print" onclick="window.print()">🖨️ Cetak / Simpan PDF</button>
</div>
<div class="page">
  ${body}
</div>
</body>
</html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
}