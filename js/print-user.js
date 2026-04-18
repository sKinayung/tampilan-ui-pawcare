/* ============================================================
   print-user.js — Logika cetak laporan sisi pengguna PawCare
   Bergantung pada getter dari storage.js
   ============================================================ */

'use strict';

// ---- CSS bersama untuk laporan user (A4 portrait) ----
const USER_PRINT_CSS = `
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
  .kop-logo  { font-size: 28pt; line-height: 1; }
  .kop-text  { flex: 1; }
  .kop-nama  {
    font-size: 16pt;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  .kop-sub    { font-size: 10pt; color: #333; margin-top: 2px; }
  .kop-alamat { font-size: 9pt;  color: #555; margin-top: 2px; }
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
  .summary-title { font-size: 11pt; font-weight: bold; margin: 14px 0 6px; }
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
  .data-title { font-size: 11pt; font-weight: bold; margin: 14px 0 6px; }
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
  .ttd-section { margin-top: 32px; display: flex; justify-content: flex-end; }
  .ttd-box     { text-align: center; font-size: 11pt; line-height: 1.6; }
  .ttd-space   { height: 60px; }
  .ttd-name    { font-weight: bold; text-decoration: underline; }

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

  /* ---- TOMBOL CETAK (tidak ikut tercetak) ---- */
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
  .btn-do-print { background: #5C4A2A; color: white; border: none; }
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

// ---- CSS landscape (untuk penitipan) ----
const USER_PRINT_CSS_LANDSCAPE = USER_PRINT_CSS
  .replace(
    '@page { size: A4 portrait; margin: 0; }',
    '@page { size: A4 landscape; margin: 0; }'
  )
  .replace(
    'width: 210mm;\n    min-height: 297mm;',
    'width: 297mm;\n    min-height: 210mm;'
  );

// ---- Helper: buka jendela cetak baru ----
function _userBuildDoc(title, body, landscape = false) {
  const css = landscape ? USER_PRINT_CSS_LANDSCAPE : USER_PRINT_CSS;
  const pageW = landscape ? '297mm' : '210mm';
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>${title} — PawCare</title>
  <style>${css}</style>
</head>
<body>
<div class="print-btn-bar no-print" style="width:${pageW}">
  <button class="btn-close"    onclick="window.close()">✕ Tutup</button>
  <button class="btn-do-print" onclick="window.print()">🖨️ Cetak / Simpan PDF</button>
</div>
<div class="page">
  ${body}
</div>
</body>
</html>`;
}

// ---- Helper: kop surat ----
function _userKop() {
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

// ---- Helper: info dokumen ----
function _userDocInfo(nomorDok, judul, userName, tgl, jam) {
  return `
  <div class="doc-title">${judul}</div>
  <div class="doc-subtitle">Dokumen Riwayat Pengguna PawCare</div>
  <div class="doc-info">
    <table>
      <tr><td>Nomor Dokumen</td><td>: ${nomorDok}</td></tr>
      <tr><td>Tanggal Cetak</td><td>: ${tgl}</td></tr>
      <tr><td>Pukul</td>        <td>: ${jam} WIB</td></tr>
      <tr><td>Nama Pengguna</td><td>: ${userName}</td></tr>
    </table>
  </div>`;
}

// ---- Helper: tanda tangan & footer ----
function _userTtdFooter(userName, tgl, jam) {
  return `
  <div class="ttd-section">
    <div class="ttd-box">
      <div>Hormat saya,</div>
      <div class="ttd-space"></div>
      <div class="ttd-name">${userName}</div>
      <div style="font-size:10pt">Pengguna PawCare</div>
    </div>
  </div>
  <div class="page-footer">
    <span>PawCare — Dokumen Pengguna</span>
    <span>Dicetak: ${tgl}, ${jam} WIB</span>
  </div>`;
}

// ============================================================
// LAPORAN USER 1 — RIWAYAT ADOPSI
// Dipanggil dari tombol di section "Pengajuan Saya"
// ============================================================
function printUserAdoptions() {
  const sess   = getSession();
  if (!sess)   return;

  const now    = new Date();
  const tgl    = now.toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  const jam    = now.toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' });
  const tglKode= `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;

  // Filter hanya adopsi milik user yang sedang login
  const all    = getAdoptions().filter(a => a.userId === sess.id);
  const tot    = all.length;
  const mng    = all.filter(a => a.status === 'menunggu').length;
  const stj    = all.filter(a => a.status === 'disetujui').length;
  const tlk    = all.filter(a => a.status === 'ditolak').length;

  const expMap = {
    none:         'Belum pernah',
    beginner:     'Pemula (1-2 thn)',
    intermediate: 'Menengah (3-5 thn)',
    expert:       'Berpengalaman (5+ thn)',
  };

  const lblSts = { menunggu:'Menunggu', disetujui:'Disetujui', ditolak:'Ditolak' };

  const body = `
    ${_userKop()}
    ${_userDocInfo(
      `RPA-${tglKode}-${String(sess.id).slice(-4)}`,
      'Riwayat Pengajuan Adopsi',
      sess.name, tgl, jam
    )}

    <div class="summary-title">I. Ringkasan Pengajuan</div>
    <table class="summary-table">
      <thead>
        <tr><th>Total Pengajuan</th><th>Menunggu</th><th>Disetujui</th><th>Ditolak</th></tr>
      </thead>
      <tbody>
        <tr><td>${tot}</td><td>${mng}</td><td>${stj}</td><td>${tlk}</td></tr>
      </tbody>
    </table>

    <div class="data-title">II. Daftar Riwayat Pengajuan Adopsi</div>
    ${all.length === 0
      ? '<p style="font-style:italic;color:#666;font-size:10pt">Belum ada pengajuan adopsi.</p>'
      : `<table class="data-table">
          <thead>
            <tr>
              <th style="width:4%">No</th>
              <th style="width:14%">Nama Hewan</th>
              <th style="width:14%">Ras / Breed</th>
              <th style="width:14%">Pengalaman</th>
              <th style="width:22%">Alamat</th>
              <th style="width:22%">Alasan Adopsi</th>
              <th style="width:10%">Tanggal</th>
              <th style="width:10%">Status</th>
            </tr>
          </thead>
          <tbody>
            ${all.map((a, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${a.animalName}</td>
                <td>${a.animalBreed || '—'}</td>
                <td>${expMap[a.experience] || a.experience}</td>
                <td style="font-size:9pt">${a.address || '—'}</td>
                <td style="font-size:9pt">${a.reason || '—'}</td>
                <td style="text-align:center">${new Date(a.date).toLocaleDateString('id-ID')}</td>
                <td style="text-align:center">${lblSts[a.status] || a.status}</td>
              </tr>`).join('')}
          </tbody>
        </table>`}

    ${_userTtdFooter(sess.name, tgl, jam)}`;

  const win = window.open('', '_blank');
  win.document.write(_userBuildDoc('Riwayat Pengajuan Adopsi', body, false));
  win.document.close();
}

// ============================================================
// LAPORAN USER 2 — RIWAYAT PENITIPAN (landscape)
// Dipanggil dari tombol di section "Penitipan Hewan"
// ============================================================
function printUserBoardings() {
  const sess   = getSession();
  if (!sess)   return;

  const now    = new Date();
  const tgl    = now.toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  const jam    = now.toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' });
  const tglKode= `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;

  const all    = getBoardings().filter(b => b.userId === sess.id);
  const tot    = all.length;
  const mng    = all.filter(b => b.status === 'menunggu').length;
  const stj    = all.filter(b => b.status === 'disetujui').length;
  const brl    = all.filter(b => b.status === 'berlangsung').length;
  const sls    = all.filter(b => b.status === 'selesai').length;
  const totalBiaya = all.reduce((s, b) => s + (b.totalCost || 0), 0);

  const lblSts = {
    menunggu:    'Menunggu',
    disetujui:   'Disetujui',
    berlangsung: 'Berlangsung',
    selesai:     'Selesai',
    ditolak:     'Ditolak',
  };

  const body = `
    ${_userKop()}
    ${_userDocInfo(
      `RPT-${tglKode}-${String(sess.id).slice(-4)}`,
      'Riwayat Penitipan Hewan',
      sess.name, tgl, jam
    )}

    <div class="summary-title">I. Ringkasan Penitipan</div>
    <table class="summary-table">
      <thead>
        <tr><th>Total</th><th>Menunggu</th><th>Disetujui</th><th>Berlangsung</th><th>Selesai</th><th>Total Biaya</th></tr>
      </thead>
      <tbody>
        <tr>
          <td>${tot}</td><td>${mng}</td><td>${stj}</td><td>${brl}</td><td>${sls}</td>
          <td>Rp ${totalBiaya.toLocaleString('id-ID')}</td>
        </tr>
      </tbody>
    </table>

    <div class="data-title">II. Daftar Riwayat Penitipan Hewan</div>
    ${all.length === 0
      ? '<p style="font-style:italic;color:#666;font-size:10pt">Belum ada riwayat penitipan.</p>'
      : `<table class="data-table">
          <thead>
            <tr>
              <th style="width:3%">No</th>
              <th style="width:10%">Nama Hewan</th>
              <th style="width:7%">Jenis</th>
              <th style="width:10%">Ras / Breed</th>
              <th style="width:6%">Usia</th>
              <th style="width:8%">Check-In</th>
              <th style="width:8%">Check-Out</th>
              <th style="width:5%">Durasi</th>
              <th style="width:9%">Biaya</th>
              <th style="width:20%">Layanan Tambahan</th>
              <th style="width:7%">No. HP</th>
              <th style="width:8%">Status</th>
              <th style="width:9%">Catatan Admin</th>
            </tr>
          </thead>
          <tbody>
            ${all.map((b, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${b.petName}</td>
                <td>${b.petSpecies}</td>
                <td>${b.petBreed || '—'}</td>
                <td style="text-align:center">${b.petAge || '—'}</td>
                <td style="text-align:center">${new Date(b.checkIn).toLocaleDateString('id-ID')}</td>
                <td style="text-align:center">${new Date(b.checkOut).toLocaleDateString('id-ID')}</td>
                <td style="text-align:center">${b.days} hari</td>
                <td style="text-align:right">Rp ${(b.totalCost || 0).toLocaleString('id-ID')}</td>
                <td style="font-size:9pt">${(b.services || []).join(', ') || '—'}</td>
                <td style="font-size:9pt">${b.contactPhone || '—'}</td>
                <td style="text-align:center">${lblSts[b.status] || b.status}</td>
                <td style="font-size:9pt">${b.adminNote || '—'}</td>
              </tr>`).join('')}
          </tbody>
        </table>`}

    ${_userTtdFooter(sess.name, tgl, jam)}`;

  const win = window.open('', '_blank');
  win.document.write(_userBuildDoc('Riwayat Penitipan Hewan', body, true));
  win.document.close();
}