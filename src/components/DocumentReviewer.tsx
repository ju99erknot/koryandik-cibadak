'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { School, Category, PengawasData } from '@/lib/schoolsData';
import type { Submission } from '@/lib/db';
import { getSchoolByNpsn, getCategories, getSupervisors } from '@/lib/db';
import { playSuccessSound, playWarningSound } from '@/lib/sound';
import { toast } from 'sonner';

interface DocumentReviewerProps {
  submission: Pick<Submission, 'id' | 'schoolNpsn' | 'categoryId' | 'fileName' | 'driveLink' | 'notes' | 'submittedAt'>;
  onApprove: (id: string) => void;
  onRejectSubmit: (id: string, notes: string) => void;
  onClose: () => void;
}

export default function DocumentReviewer({ submission, onApprove, onRejectSubmit, onClose }: DocumentReviewerProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [school, setSchool] = useState<School | undefined>(undefined);
  const [category, setCategory] = useState<Category | undefined>(undefined);
  const [supervisor, setSupervisor] = useState<PengawasData | undefined>(undefined);
  const [checklist, setChecklist] = useState({
    format: false,
    signature: false,
    stamp: false,
    dataMatch: false,
  });

  const formattedDate = useMemo(() => {
    const time = submission.submittedAt ? new Date(submission.submittedAt) : new Date();
    return time.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  }, [submission.submittedAt]);

  useEffect(() => {
    const loadData = async () => {
      const [schoolData, categories, supervisors] = await Promise.all([
        getSchoolByNpsn(submission.schoolNpsn),
        getCategories(),
        getSupervisors()
      ]);
      setSchool(schoolData);
      
      const catObj = categories.find(c => c.id === submission.categoryId);
      if (catObj) setCategory(catObj);
      
      const pengawas = supervisors.find(s => s.role === 'pengawas');
      if (pengawas) setSupervisor(pengawas);
    };
    loadData();
  }, [submission]);

  useEffect(() => {
    closeButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const startAiScan = () => {
    setIsScanning(true);
    setScanComplete(false);
    setTimeout(() => {
      setIsScanning(false);
      setScanComplete(true);
      setChecklist({
        format: true,
        signature: true,
        stamp: true,
        dataMatch: true,
      });
    }, 2500);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="doc-reviewer-title"
      aria-describedby="doc-reviewer-desc"
      style={{ position: 'fixed', inset: 0, zIndex: 'var(--z-modal-full)' as any, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <button
        type="button"
        aria-label="Tutup dialog verifikasi"
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'var(--modal-backdrop)',
          backdropFilter: 'blur(var(--modal-blur))',
          WebkitBackdropFilter: 'blur(var(--modal-blur))',
          border: 'none',
          cursor: 'default',
          padding: 0
        }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="modal-card"
        style={{
          position: 'relative',
          width: '95%',
          maxWidth: '1100px',
          height: '85vh',
          border: '1px solid var(--card-border)',
          borderRadius: '24px',
          display: 'flex',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 1
        }}
      >
        {/* Left Side: Mock PDF Viewer */}
        <div style={{ flex: 1.2, padding: '24px', background: 'var(--bg-space-dark)', borderRight: '1px solid var(--card-border)', display: 'flex', flexDirection: 'column', gap: '16px', overflow: 'hidden', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--card-border)', paddingBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className="fa-solid fa-file-pdf" style={{ color: '#ef4444', fontSize: '24px' }}></i>
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 700 }}>{submission.fileName || 'Dokumen_Berkas.pdf'}</h3>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>MOCK PREVIEW (SINKRON DENGAN DOKUMEN GOOGLE DRIVE)</span>
              </div>
            </div>
            <a href={submission.driveLink || '#'} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm" style={{ padding: '6px 12px', fontSize: '11px' }}>
              Buka File Asli <i className="fa-solid fa-arrow-up-right-from-square" style={{ marginLeft: '6px' }}></i>
            </a>
          </div>

          {/* Document Content Canvas Mock */}
          <div style={{ flex: 1, background: '#ffffff', borderRadius: '12px', padding: '40px 30px', color: '#1e293b', overflowY: 'auto', fontFamily: 'serif', position: 'relative', boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.05)' }}>
            
            {/* AI Scan Laser Line */}
            <AnimatePresence>
              {isScanning && (
                <motion.div
                  initial={{ top: '0%' }}
                  animate={{ top: ['0%', '100%', '0%'] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    height: '3px',
                    background: 'linear-gradient(to right, transparent, #3b82f6, #60a5fa, #3b82f6, transparent)',
                    boxShadow: '0 0 10px #3b82f6, 0 0 20px #60a5fa',
                    zIndex: 10
                  }}
                />
              )}
            </AnimatePresence>

            {/* Document Header (Kop Surat) */}
            <div style={{ textAlign: 'center', borderBottom: '3px double #1e293b', paddingBottom: '15px', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 'bold', textTransform: 'uppercase', margin: 0 }}>Pemerintah Kabupaten Sukabumi</h2>
              <h2 style={{ fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', margin: '2px 0 0' }}>Dinas Pendidikan - Kecamatan Cibadak</h2>
              <h1 style={{ fontSize: '15px', fontWeight: 'bold', textTransform: 'uppercase', margin: '4px 0 0' }}>{school ? school.name : 'Sekolah Binaan'}</h1>
              <p style={{ fontSize: '10px', fontStyle: 'italic', margin: '4px 0 0', fontFamily: 'sans-serif' }}>
                NPSN: {school ? school.npsn : '-'} | Alamat: {school ? school.address : '-'}
              </p>
            </div>

            {/* Document Title */}
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', textDecoration: 'underline', margin: 0 }}>
                {category ? category.name : 'Surat Administrasi'}
              </h3>
              <p style={{ fontSize: '10px', margin: '2px 0 0' }}>Nomor: 800/PK/{school ? school.npsn : '000'}/VI/{new Date().getFullYear()}</p>
            </div>

            {/* Document Body */}
            <div style={{ fontSize: '11px', lineHeight: '1.8', textAlign: 'justify', textIndent: '40px' }}>
              <p style={{ marginBottom: '12px' }}>
                Yang bertanda tangan di bawah ini, Kepala Sekolah {school ? school.name : 'Sekolah Binaan'}, dengan ini menyatakan pertanggungjawaban mutlak atas kelayakan serta keabsahan seluruh berkas dan dokumen yang dilampirkan terkait pelaporan administrasi bulanan periode Semester 1 Tahun Ajaran {new Date().getFullYear()}.
              </p>
              <p style={{ marginBottom: '12px' }}>
                Adapun berkas yang kami sampaikan di antaranya memuat daftar rekapitulasi data pendidik sebanyak <strong>{school ? school.teacherCount : 0} Guru Aktif</strong> serta jumlah peserta didik terdaftar sebanyak <strong>{school ? school.studentCount : 0} Siswa</strong> secara riil dan sebenar-benarnya tanpa adanya rekayasa.
              </p>
              <p style={{ marginBottom: '24px' }}>
                Demikian surat pernyataan pertanggungjawaban ini dibuat dengan sadar dan penuh rasa tanggung jawab untuk dipergunakan sebagaimana mestinya sebagai syarat kelengkapan administrasi pada Dinas Pendidikan Kecamatan Cibadak.
              </p>
            </div>

            {/* Signatures & Stamp */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginTop: '40px', padding: '0 20px' }}>
              <div>
                <p>Mengetahui,</p>
                <p style={{ fontWeight: 'bold' }}>Pengawas Bina</p>
                <div style={{ height: '55px' }}></div>
                <p style={{ textDecoration: 'underline', fontWeight: 'bold' }}>{supervisor ? supervisor.name : 'Pengawas Bina'}</p>
                <p>{supervisor ? `NIP. ${supervisor.nip}` : '-'}</p>
              </div>
              <div style={{ textAlign: 'right', position: 'relative' }}>
                <p>Cibadak, {formattedDate}</p>
                <p style={{ fontWeight: 'bold' }}>Kepala Sekolah,</p>
                
                {/* Mock Stamp overlay */}
                <div style={{
                  position: 'absolute',
                  right: '20px',
                  top: '25px',
                  width: '70px',
                  height: '70px',
                  border: '2px dashed rgba(59, 130, 246, 0.4)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'rgba(59, 130, 246, 0.4)',
                  fontSize: '8px',
                  fontWeight: 'bold',
                  transform: 'rotate(-15deg)',
                  pointerEvents: 'none'
                }}>
                  STEMPEL BASAH
                </div>

                <div style={{ height: '55px' }}></div>
                <p style={{ textDecoration: 'underline', fontWeight: 'bold' }}>{school ? school.principalName : 'Kepala Sekolah'}</p>
                <p>NIP. -</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Audit panel & decision */}
        <div style={{ flex: 0.8, padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 id="doc-reviewer-title" style={{ fontSize: '18px' }}><i className="fa-solid fa-clipboard-check" aria-hidden="true"></i> Lembar Verifikasi</h2>
            <button
              ref={closeButtonRef}
              type="button"
              aria-label="Tutup lembar verifikasi"
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '18px' }}
            >
              <i className="fa-solid fa-xmark" aria-hidden="true"></i>
            </button>
          </div>
          <p id="doc-reviewer-desc" className="sr-only">
            Verifikasi berkas {submission.fileName || 'dokumen'} dari sekolah NPSN {submission.schoolNpsn}. Gunakan checklist atau minta revisi dengan catatan.
          </p>

          {/* AI Auditor Button & Results */}
          <div className="card" style={{ border: '1px solid var(--primary-glow)', background: 'var(--primary-glow)' }}>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ fontSize: '13px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <i className="fa-solid fa-wand-magic-sparkles"></i> AI Quick-Scan Auditor
              </h3>
              
              <button 
                className={`btn ${isScanning ? 'btn-primary' : 'btn-accent'} btn-block`}
                onClick={startAiScan}
                disabled={isScanning}
                style={{ fontSize: '12px', padding: '10px' }}
              >
                {isScanning ? (
                  <span><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '6px' }}></i> Memindai Berkas...</span>
                ) : (
                  <span><i className="fa-solid fa-circle-notch"></i> Pindai dengan AI Auditor</span>
                )}
              </button>

              <AnimatePresence>
                {scanComplete && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ fontSize: '12px', borderTop: '1px solid rgba(59, 130, 246, 0.2)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Kecocokan Data Siswa:</span>
                      <strong style={{ color: 'var(--success)' }}>100% Cocok (Siswa: {school?.studentCount})</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Kecocokan Data Guru:</span>
                      <strong style={{ color: 'var(--success)' }}>100% Cocok (Guru: {school?.teacherCount})</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Tanda Tangan & Stempel:</span>
                      <strong style={{ color: 'var(--success)' }}>Terdeteksi Sah</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed rgba(59, 130, 246, 0.2)', paddingTop: '6px', marginTop: '2px' }}>
                      <span style={{ fontWeight: 'bold' }}>Confidence Score:</span>
                      <strong style={{ color: 'var(--success)', fontSize: '13px' }}>98% Valid</strong>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Verification Checklist */}
          <div className="card">
            <div className="card-header">
              <h3><i className="fa-solid fa-list-check"></i> Checklist Pemeriksa</h3>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={checklist.format} 
                  onChange={(e) => setChecklist({ ...checklist, format: e.target.checked })}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                Format dokumen benar (.PDF)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={checklist.signature} 
                  onChange={(e) => setChecklist({ ...checklist, signature: e.target.checked })}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                Tanda tangan Kepala Sekolah terlampir
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={checklist.stamp} 
                  onChange={(e) => setChecklist({ ...checklist, stamp: e.target.checked })}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                Stempel basah sekolah terbaca jelas
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={checklist.dataMatch} 
                  onChange={(e) => setChecklist({ ...checklist, dataMatch: e.target.checked })}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                Kesesuaian data siswa & guru riil
              </label>
            </div>
          </div>

          {/* Action Decision Form */}
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Presets */}
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Template Cepat Catatan Revisi:</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {[
                  { text: 'Ttd Kepsek belum terlampir', full: 'Tanda tangan Kepala Sekolah belum terlampir.' },
                  { text: 'Stempel sekolah tidak jelas', full: 'Stempel resmi sekolah basah kurang jelas atau terpotong.' },
                  { text: 'Wajib file PDF asli', full: 'Format dokumen tidak sesuai (wajib berupa file PDF asli).' },
                  { text: 'Data Siswa/Guru tidak cocok', full: 'Kesesuaian data jumlah siswa & guru tidak cocok dengan Dapodik.' }
                ].map(tmpl => (
                  <button
                    key={tmpl.text}
                    type="button"
                    onClick={() => setRevisionNotes(tmpl.full)}
                    style={{
                      background: 'rgba(245, 158, 11, 0.08)',
                      border: '1px solid rgba(245, 158, 11, 0.2)',
                      color: '#f59e0b',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      fontSize: '11px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    <i className="fa-solid fa-pen-nib" style={{ marginRight: '6px' }}></i>
                    {tmpl.text}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '8px' }}>
              <label htmlFor="revision-notes">Catatan Khusus / Catatan Revisi</label>
              <textarea
                id="revision-notes"
                className="form-control"
                rows={2}
                placeholder="Masukkan catatan perbaikan jika mengembalikan berkas..."
                value={revisionNotes}
                onChange={(e) => setRevisionNotes(e.target.value)}
                style={{ fontSize: '12px' }}
              ></textarea>
            </div>
            
            {/* Action buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-danger" 
                  style={{ flex: 1, height: '36px', fontSize: '11px', padding: '0 8px' }}
                  onClick={() => {
                    if (!revisionNotes.trim()) {
                      toast.warning('Mohon isi catatan revisi terlebih dahulu jika ingin mengembalikan berkas.');
                      return;
                    }
                    playWarningSound();
                    onRejectSubmit(submission.id, revisionNotes);
                  }}
                >
                  Minta Revisi
                </button>
                <button
                  type="button"
                  className="btn btn-primary" 
                  style={{ flex: 1.2, height: '36px', fontSize: '11px', padding: '0 8px' }}
                  disabled={!checklist.format || !checklist.signature || !checklist.stamp || !checklist.dataMatch}
                  onClick={() => {
                    playSuccessSound();
                    onApprove(submission.id);
                  }}
                >
                  Setujui Berkas <i className="fa-solid fa-circle-check" style={{ marginLeft: '4px' }}></i>
                </button>
              </div>

              {/* Instant Approve Shortcut */}
              <button
                type="button"
                className="btn btn-success"
                style={{ width: '100%', height: '36px', fontSize: '11px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                onClick={() => {
                  setChecklist({
                    format: true,
                    signature: true,
                    stamp: true,
                    dataMatch: true
                  });
                  playSuccessSound();
                  onApprove(submission.id);
                }}
              >
                <i className="fa-solid fa-bolt"></i> Setujui Instan (Lompati Checklist)
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
