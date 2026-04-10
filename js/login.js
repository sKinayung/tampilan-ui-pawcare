/* ============================================================
   login.js — Logika halaman login & registrasi
   ============================================================ */

'use strict';

// ---- Redirect jika sudah login ----
(function checkExistingSession() {
  const session = getSession();
  if (session && session.role === 'admin') { window.location.href = 'admin.html'; return; }
  if (session && session.role === 'user')  { window.location.href = 'user.html';  return; }
})();

// ---- Helper tampilkan / sembunyikan alert ----
function showAlert(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.classList.add('show');
}

function hideAlert(id) {
  const el = document.getElementById(id);
  el.textContent = '';
  el.classList.remove('show');
}

// ---- Ganti tab Masuk / Daftar ----
function switchTab(tab) {
  const isLogin = tab === 'login';

  document.querySelectorAll('.tab-btn').forEach((btn, i) => {
    btn.classList.toggle('active', isLogin ? i === 0 : i === 1);
  });

  document.getElementById('loginForm').style.display    = isLogin ? 'block' : 'none';
  document.getElementById('registerForm').style.display = isLogin ? 'none'  : 'block';

  hideAlert('loginError');
  hideAlert('regError');
  hideAlert('regSuccess');
}

// ---- Login sebagai Pengguna ----
function doLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const pass  = document.getElementById('loginPassword').value;

  hideAlert('loginError');

  if (!email || !pass) {
    showAlert('loginError', 'Email dan kata sandi harus diisi.');
    return;
  }

  const user = getUsers().find(u => u.email === email && u.password === pass && u.role === 'user');
  if (!user) {
    showAlert('loginError', 'Email atau kata sandi salah.');
    return;
  }

  saveSession({ id: user.id, name: user.name, email: user.email, role: 'user' });
  window.location.href = 'user.html';
}

// ---- Login sebagai Admin ----
function doAdminLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const pass  = document.getElementById('loginPassword').value;

  hideAlert('loginError');

  // Kredensial admin tetap
  if (email === 'admin@pawcare.id' && pass === 'admin123') {
    saveSession({ id: 0, name: 'Administrator', email: 'admin@pawcare.id', role: 'admin' });
    window.location.href = 'admin.html';
    return;
  }

  showAlert('loginError', 'Kredensial admin salah. (Gunakan admin@pawcare.id / admin123)');
}

// ---- Daftar akun baru ----
function doRegister() {
  const name  = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const phone = document.getElementById('regPhone').value.trim();
  const pass  = document.getElementById('regPassword').value;

  hideAlert('regError');
  hideAlert('regSuccess');

  if (!name || !email || !phone || !pass) {
    showAlert('regError', 'Semua kolom harus diisi.');
    return;
  }
  if (pass.length < 6) {
    showAlert('regError', 'Kata sandi minimal 6 karakter.');
    return;
  }

  const users = getUsers();
  if (users.find(u => u.email === email)) {
    showAlert('regError', 'Email sudah terdaftar.');
    return;
  }

  const newUser = {
    id: Date.now(),
    name, email, phone, password: pass,
    role: 'user',
    joinDate: new Date().toISOString()
  };

  users.push(newUser);
  saveUsers(users);

  showAlert('regSuccess', 'Akun berhasil dibuat! Silakan masuk.');
  setTimeout(() => switchTab('login'), 2000);
}

// ---- Aktifkan Enter untuk submit ----
document.addEventListener('keydown', function (e) {
  if (e.key !== 'Enter') return;
  const loginVisible = document.getElementById('loginForm').style.display !== 'none';
  if (loginVisible) doLogin();
  else doRegister();
});
