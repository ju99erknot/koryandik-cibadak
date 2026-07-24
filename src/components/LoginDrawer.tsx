'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { School, GugusData, PengawasData } from '@/lib/schoolsData';
import { showDynamicNotification } from '@/components/DynamicIsland';
import BiometricAuthOverlay from '@/components/BiometricAuthOverlay';
import FancySelect from '@/components/FancySelect';

interface LoginDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  schools: School[];
  guguses: GugusData[];
  supervisors: PengawasData[];
}

type LoginTabRole = 'school' | 'gugus' | 'pengawas' | 'kkks' | 'pgri' | 'admin';

export default function LoginDrawer({ isOpen, onClose, schools, guguses, supervisors }: LoginDrawerProps) {
  const router = useRouter();

  // Active Login Tab
  const [loginTab, setLoginTab] = useState<LoginTabRole>('school');

  // Input states
  const [selectedSchoolNpsn, setSelectedSchoolNpsn] = useState('');
  const [schoolNpsnInput, setSchoolNpsnInput] = useState('');
  const [selectedGugus, setSelectedGugus] = useState('I');
  const [gugusPasscode, setGugusPasscode] = useState('');
  const [pengawasPassword, setPengawasPassword] = useState('');
  const [kkksPassword, setKkksPassword] = useState('');
  const [pgriPassword, setPgriPassword] = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  // Biometric Auth Overlay States
  const [authOverlayActive, setAuthOverlayActive] = useState(false);
  const [authRoleName, setAuthRoleName] = useState('');

  const loginTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    return () => {
      if (loginTimeoutRef.current) {
        clearTimeout(loginTimeoutRef.current);
      }
    };
  }, []);

  const executeLogin = (session: any, successMsg: string, route: string, roleName: string) => {
    setAuthRoleName(roleName);
    setAuthOverlayActive(true);
    
    loginTimeoutRef.current = setTimeout(() => {
      localStorage.setItem('koryandik_current_user', JSON.stringify(session));
      setAuthOverlayActive(false);
      onClose();
      showDynamicNotification(`System Secured: ${successMsg}`, 'fa-solid fa-shield-halved');
      router.push(route);
    }, 2500);
  };

  const handleSchoolLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchoolNpsn) {
      toast.error('Pilih sekolah Anda terlebih dahulu.');
      return;
    }
    const target = schools.find(s => s.npsn === selectedSchoolNpsn);
    if (!target) return;

    const sessionData = { 
      npsn: target.npsn, 
      name: target.name, 
      role: 'school', 
      details: target,
      avatar: target.operatorAvatarUrl // Include operator avatar in session
    };

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'school', identifier: target.npsn, passcode: schoolNpsnInput, sessionData })
      });
      if (!res.ok) throw new Error();
      const { token } = await res.json();
      localStorage.setItem('koryandik_session_token', token);
      executeLogin(sessionData, `Selamat datang, Operator ${target.name}!`, '/school/dashboard', `OPERATOR SEKOLAH - ${target.npsn}`);
    } catch {
      toast.error('NPSN salah! Gunakan NPSN sekolah Anda sebagai passcode untuk masuk.');
    }
  };

  const handleGugusLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const gugus = guguses.find(g => g.id === selectedGugus);
    if (!gugus) return;

    const sessionData = { id: gugus.id, name: gugus.name, koordinator: gugus.koordinator, role: 'gugus' };

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'gugus', identifier: gugus.id, passcode: gugusPasscode, sessionData })
      });
      if (!res.ok) throw new Error();
      const { token } = await res.json();
      localStorage.setItem('koryandik_session_token', token);
      executeLogin(sessionData, `Selamat datang, Koordinator ${gugus.name}!`, '/gugus/dashboard', `KOORDINATOR ${gugus.name.toUpperCase()}`);
    } catch {
      toast.error('Passcode gugus salah! Gunakan NPSN Sekolah Inti.');
    }
  };

  const handleSupervisorLogin = async (e: React.FormEvent, role: 'pengawas' | 'kkks' | 'pgri') => {
    e.preventDefault();
    const sup = supervisors.find(s => s.role === role);
    if (!sup) return;

    const passcode = role === 'pengawas' ? pengawasPassword : role === 'kkks' ? kkksPassword : pgriPassword;
    const sessionData = { id: sup.id, name: sup.name, title: sup.title, role, avatar: sup.photoUrl };

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, identifier: sup.id, passcode, sessionData })
      });
      if (!res.ok) throw new Error();
      const { token } = await res.json();
      localStorage.setItem('koryandik_session_token', token);
      executeLogin(sessionData, `Selamat datang, ${sup.title}!`, `/${role}/dashboard`, sup.title.toUpperCase());
    } catch {
      toast.error('Passcode Anda salah!');
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const adminUser = supervisors.find(s => s.role === 'admin');
    
    const sessionData = adminUser 
      ? { id: adminUser.id, name: adminUser.name, role: 'admin', title: adminUser.title, avatar: adminUser.photoUrl }
      : { name: 'Administrator', role: 'admin' };
      
    try {
      const identifier = adminUsername.trim();
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'admin', identifier, passcode: adminPassword, sessionData })
      });
      if (!res.ok) throw new Error();
      const { token } = await res.json();
      localStorage.setItem('koryandik_session_token', token);
      const title = adminUser ? adminUser.title.toUpperCase() : 'SUPER ADMINISTRATOR';
      executeLogin(sessionData, 'Selamat datang kembali, Administrator!', '/admin/dashboard', title);
    } catch {
      toast.error('Username atau password salah!');
    }
  };

  return (
    <>
      {/* Login Drawer Overlay */}
      <div className={`drawer-overlay ${isOpen ? 'active' : ''}`} onClick={onClose}></div>

      {/* Login Drawer */}
      <div className={`login-drawer ${isOpen ? 'active' : ''}`}>
        <BiometricAuthOverlay active={authOverlayActive} roleName={authRoleName} />
        <button className="drawer-close-btn" onClick={onClose}>
          <i className="fa-solid fa-xmark"></i>
        </button>

        <div className="login-header">
          <div className="logo-icon">
            <i className="fa-solid fa-shield-halved"></i>
          </div>
          <h2>Portal Koryandik</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '6px' }}>
            Masuk untuk mengelola administrasi berkas
          </p>
        </div>

        {/* 6 Tabs Grid */}
        <div className="login-tabs">
          <button className={`tab-btn ${loginTab === 'school' ? 'active' : ''}`} onClick={() => setLoginTab('school')}>
            <i className="fa-solid fa-school"></i> Sekolah
          </button>
          <button className={`tab-btn ${loginTab === 'gugus' ? 'active' : ''}`} onClick={() => setLoginTab('gugus')}>
            <i className="fa-solid fa-sitemap"></i> Gugus
          </button>
          <button className={`tab-btn ${loginTab === 'pengawas' ? 'active' : ''}`} onClick={() => setLoginTab('pengawas')}>
            <i className="fa-solid fa-user-tie"></i> Pengawas
          </button>
          <button className={`tab-btn ${loginTab === 'kkks' ? 'active' : ''}`} onClick={() => setLoginTab('kkks')}>
            <i className="fa-solid fa-users-gear"></i> KKKS
          </button>
          <button className={`tab-btn ${loginTab === 'pgri' ? 'active' : ''}`} onClick={() => setLoginTab('pgri')}>
            <i className="fa-solid fa-id-card"></i> PGRI
          </button>
          <button className={`tab-btn ${loginTab === 'admin' ? 'active' : ''}`} onClick={() => setLoginTab('admin')}>
            <i className="fa-solid fa-user-shield"></i> Admin
          </button>
        </div>

        {/* School Login Form */}
        {loginTab === 'school' && (
          <form className="login-form active" onSubmit={handleSchoolLogin}>
            <FancySelect
              id="login-school-select"
              label="Pilih Sekolah"
              icon="fa-solid fa-school"
              searchable
              required
              value={selectedSchoolNpsn}
              onChange={setSelectedSchoolNpsn}
              placeholder="-- Pilih Sekolah --"
              options={[
                { value: '', label: '-- Pilih Sekolah --' },
                ...schools.map((s) => ({
                  value: s.npsn,
                  label: s.name,
                  hint: `NPSN ${s.npsn}`,
                })),
              ]}
            />
            <div className="form-group">
              <label htmlFor="login-school-passcode">Passcode Sekolah (NPSN)</label>
              <div className="input-with-icon">
                <i className="fa-solid fa-lock"></i>
                <input
                  id="login-school-passcode"
                  type="password"
                  className="form-control"
                  placeholder="Masukkan NPSN sekolah"
                  value={schoolNpsnInput}
                  onChange={(e) => setSchoolNpsnInput(e.target.value)}
                  required
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-block">Masuk Portal Sekolah</button>
          </form>
        )}

        {/* Gugus Login Form */}
        {loginTab === 'gugus' && (
          <form className="login-form active" onSubmit={handleGugusLogin}>
            <FancySelect
              id="login-gugus-select"
              label="Pilih Gugus"
              icon="fa-solid fa-sitemap"
              required
              value={selectedGugus}
              onChange={setSelectedGugus}
              placeholder="-- Pilih Gugus --"
              options={[
                { value: 'I', label: 'Gugus I' },
                { value: 'II', label: 'Gugus II' },
                { value: 'III', label: 'Gugus III' },
                { value: 'IV', label: 'Gugus IV' },
                { value: 'V', label: 'Gugus V' },
              ]}
            />
            <div className="form-group">
              <label htmlFor="login-gugus-passcode">Passcode Koordinator (NPSN Sekolah Inti)</label>
              <div className="input-with-icon">
                <i className="fa-solid fa-lock"></i>
                <input
                  id="login-gugus-passcode"
                  type="password"
                  className="form-control"
                  placeholder="Masukkan passcode gugus"
                  value={gugusPasscode}
                  onChange={(e) => setGugusPasscode(e.target.value)}
                  required
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-block">Masuk Portal Gugus</button>
          </form>
        )}

        {/* Pengawas Login Form */}
        {loginTab === 'pengawas' && (
          <form className="login-form active" onSubmit={(e) => handleSupervisorLogin(e, 'pengawas')}>
            <div className="form-group">
              <label htmlFor="login-pengawas-passcode">Passcode Pengawas</label>
              <div className="input-with-icon">
                <i className="fa-solid fa-lock"></i>
                <input
                  id="login-pengawas-passcode"
                  type="password"
                  className="form-control"
                  placeholder="Masukkan passcode pengawas"
                  value={pengawasPassword}
                  onChange={(e) => setPengawasPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-block">Masuk Portal Pengawas</button>
          </form>
        )}

        {/* KKKS Login Form */}
        {loginTab === 'kkks' && (
          <form className="login-form active" onSubmit={(e) => handleSupervisorLogin(e, 'kkks')}>
            <div className="form-group">
              <label htmlFor="login-kkks-passcode">Passcode Ketua KKKS</label>
              <div className="input-with-icon">
                <i className="fa-solid fa-lock"></i>
                <input
                  id="login-kkks-passcode"
                  type="password"
                  className="form-control"
                  placeholder="Masukkan passcode KKKS"
                  value={kkksPassword}
                  onChange={(e) => setKkksPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-block">Masuk Portal KKKS</button>
          </form>
        )}

        {/* PGRI Login Form */}
        {loginTab === 'pgri' && (
          <form className="login-form active" onSubmit={(e) => handleSupervisorLogin(e, 'pgri')}>
            <div className="form-group">
              <label htmlFor="login-pgri-passcode">Passcode Ketua PGRI</label>
              <div className="input-with-icon">
                <i className="fa-solid fa-lock"></i>
                <input
                  id="login-pgri-passcode"
                  type="password"
                  className="form-control"
                  placeholder="Masukkan passcode PGRI"
                  value={pgriPassword}
                  onChange={(e) => setPgriPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-block">Masuk Portal PGRI</button>
          </form>
        )}

        {/* Admin Login Form */}
        {loginTab === 'admin' && (
          <form className="login-form active" onSubmit={handleAdminLogin}>
            <div className="form-group">
              <label htmlFor="login-admin-username">Username Administrator</label>
              <div className="input-with-icon">
                <i className="fa-solid fa-user"></i>
                <input
                  id="login-admin-username"
                  type="text"
                  className="form-control"
                  placeholder="Masukkan username admin"
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="login-admin-password">Password Administrator</label>
              <div className="input-with-icon">
                <i className="fa-solid fa-lock"></i>
                <input
                  id="login-admin-password"
                  type="password"
                  className="form-control"
                  placeholder="Masukkan password admin"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-block">Masuk Portal Admin</button>
          </form>
        )}
      </div>
    </>
  );
}
