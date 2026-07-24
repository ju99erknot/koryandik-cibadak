'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { School, Category } from '@/lib/schoolsData';
import { getSubmissionsBySchool, getCategories } from '@/lib/db';
import type { Submission } from '@/lib/db';
import CommandPalette from '@/components/CommandPalette';
import DashboardShell, { LoadingScreen } from '@/components/DashboardShell';
import { useAuth } from '@/hooks/useAuth';
import { usePresence } from '@/hooks/usePresence';
import { toggleThemeWithTransition } from '@/lib/theme';
import { toast } from 'sonner';
import { confirmAction } from '@/components/ConfirmDialog';

export default function SchoolReceipt() {
  const router = useRouter();
  const { user, loading, logout } = useAuth('school');
  usePresence(user, '/school/receipt');
  const [school, setSchool] = useState<School | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  
  const receiptId = useMemo(() => Date.now().toString(36).toUpperCase().slice(-4), []);
  const documentId = useMemo(() => Date.now().toString(36).toUpperCase(), []);
  const [categories, setCategories] = useState<Category[]>([]);
  const [savedSignature, setSavedSignature] = useState<string | null>(null);
  const [stempelColor, setStempelColor] = useState('#2563eb');
  const [receiptTheme, setReceiptTheme] = useState<'classic' | 'modern' | 'executive'>('classic');
  const [isSigModalOpen, setIsSigModalOpen] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  // Initialize canvas configurations when modal opens
  useEffect(() => {
    if (isSigModalOpen && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#1e3a8a'; // Deep official blue ink
      }
    }
  }, [isSigModalOpen]);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const saveCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Check if empty
    const blank = document.createElement('canvas');
    blank.width = canvas.width;
    blank.height = canvas.height;
    if (canvas.toDataURL() === blank.toDataURL()) {
      toast.error('Gambarkan tanda tangan Anda terlebih dahulu!');
      return;
    }

    const dataUrl = canvas.toDataURL('image/png');
    localStorage.setItem('koryandik_signature', dataUrl);
    setSavedSignature(dataUrl);
    setIsSigModalOpen(false);
    toast.success('Tanda tangan digital berhasil disimpan!');
  };

  const deleteSignature = async () => {
    const confirmed = await confirmAction({
      title: 'Hapus Tanda Tangan',
      message: 'Hapus tanda tangan digital yang tersimpan?',
      variant: 'danger',
    });
    if (confirmed) {
      localStorage.removeItem('koryandik_signature');
      setSavedSignature(null);
      toast.success('Tanda tangan digital dihapus.');
    }
  };

  useEffect(() => {
    if (loading || !user?.details || !user.npsn) return;
    let active = true;
    setTimeout(() => {
      if (active) {
        setSchool(user.details as unknown as School);
        const sig = localStorage.getItem('koryandik_signature');
        if (sig) setSavedSignature(sig);
        const sc = localStorage.getItem('koryandik_stempel_color');
        if (sc) setStempelColor(sc);
      }
    }, 0);
    getSubmissionsBySchool(user.npsn).then(s => {
      if (active) setSubmissions(s);
    });
    getCategories().then(c => {
      if (active) setCategories(c);
    });
    return () => {
      active = false;
    };
  }, [loading, user]);

  const handlePrint = () => {
    window.print();
  };

  if (loading || !user || !school) return <LoadingScreen />;

  const approvedCount = submissions.filter(s => s.status === 'approved').length;
  const isComplete = approvedCount === categories.length;

  return (
    <>
    <DashboardShell
      user={user}
      onLogout={logout}
      brandTitle={school.name}
      brandSubtitle={`NPSN: ${school.npsn}`}
      headerTitle="Bukti Pengumpulan Berkas"
      headerSubtitle="Tanda terima resmi rekapitulasi berkas kecamatan"
      headerActions={<CommandPalette currentUser={{ role: 'school', details: school, npsn: school.npsn }} onThemeToggle={() => toggleThemeWithTransition()} />}
    >
        <div className="content-area">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }} className="no-print">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}><i className="fa-solid fa-palette"></i> Tema Tanda Terima:</span>
              <div style={{ display: 'flex', gap: '4px', background: 'var(--card-glass)', border: '1px solid var(--card-border)', padding: '4px', borderRadius: '8px' }}>
                <button 
                  className={`btn btn-sm ${receiptTheme === 'classic' ? 'btn-primary' : 'btn-outline'}`} 
                  onClick={() => setReceiptTheme('classic')}
                  style={{ fontSize: '11px', padding: '4px 10px', minWidth: '80px' }}
                >
                  Dinas Klasik
                </button>
                <button 
                  className={`btn btn-sm ${receiptTheme === 'modern' ? 'btn-primary' : 'btn-outline'}`} 
                  onClick={() => setReceiptTheme('modern')}
                  style={{ fontSize: '11px', padding: '4px 10px', minWidth: '80px' }}
                >
                  Modern
                </button>
                <button 
                  className={`btn btn-sm ${receiptTheme === 'executive' ? 'btn-primary' : 'btn-outline'}`} 
                  onClick={() => setReceiptTheme('executive')}
                  style={{ fontSize: '11px', padding: '4px 10px', minWidth: '80px' }}
                >
                  Eksklusif
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                className="btn btn-outline" 
                onClick={() => setIsSigModalOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <i className="fa-solid fa-signature"></i> Tanda Tangan
              </button>
              <button className="btn btn-primary" onClick={handlePrint}>
                Cetak Dokumen <i className="fa-solid fa-print" style={{ marginLeft: '8px' }}></i>
              </button>
            </div>
          </div>

          {/* Printable Receipt */}
          <div className="card print-container animate-fade-in" style={{ 
            padding: '40px', 
            background: receiptTheme === 'classic' ? '#ffffff' : receiptTheme === 'executive' ? 'linear-gradient(135deg, rgba(217, 119, 6, 0.03) 0%, rgba(217, 119, 6, 0.01) 100%)' : 'var(--card-glass)',
            border: receiptTheme === 'classic' ? '3px double #000000' : receiptTheme === 'executive' ? '3px double #d97706' : '1px solid var(--primary-glow)',
            color: receiptTheme === 'classic' ? '#000000' : 'inherit',
            borderRadius: receiptTheme === 'classic' ? '0' : '16px'
          }}>
            {/* Header Print */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              borderBottom: receiptTheme === 'classic' ? '3px double #000000' : receiptTheme === 'executive' ? '3px double #d97706' : '2px solid var(--primary-glow)', 
              paddingBottom: '20px', 
              marginBottom: '30px' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {receiptTheme === 'classic' ? (
                  <div style={{ width: '60px', height: '60px', border: '2px solid #000000', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#000000', fontSize: '28px' }}>
                    <i className="fa-solid fa-graduation-cap"></i>
                  </div>
                ) : (
                  <div style={{ 
                    width: '60px', 
                    height: '60px', 
                    borderRadius: '12px', 
                    background: receiptTheme === 'executive' ? 'linear-gradient(135deg, #d97706, #f59e0b)' : 'linear-gradient(135deg, var(--primary), var(--accent))', 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    color: 'white', 
                    fontSize: '28px',
                    boxShadow: receiptTheme === 'executive' ? '0 4px 20px rgba(217, 119, 6, 0.2)' : '0 4px 20px rgba(59, 130, 246, 0.2)'
                  }}>
                    <i className="fa-solid fa-graduation-cap"></i>
                  </div>
                )}
                <div>
                  <h2 style={{ fontSize: '22px', textTransform: 'uppercase', color: receiptTheme === 'classic' ? '#000000' : receiptTheme === 'executive' ? '#d97706' : 'var(--text-primary)' }}>Koryandik Cibadak</h2>
                  <p style={{ fontSize: '11px', color: receiptTheme === 'classic' ? '#000000' : 'var(--text-secondary)' }}>KOORDINATOR LAYANAN PENDIDIKAN KECAMATAN CIBADAK</p>
                  <p style={{ fontSize: '11px', color: receiptTheme === 'classic' ? '#000000' : 'var(--text-secondary)' }}>Kabupaten Sukabumi, Jawa Barat</p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className={`badge badge-${isComplete ? 'success' : 'warning'}`} style={{ 
                  padding: '8px 16px', 
                  fontSize: '12px',
                  background: receiptTheme === 'classic' ? (isComplete ? '#22c55e' : '#f59e0b') : undefined,
                  color: receiptTheme === 'classic' ? '#ffffff' : undefined
                }}>
                  {isComplete ? 'LENGKAP' : 'BELUM LENGKAP'}
                </span>
                <p style={{ fontSize: '10px', color: receiptTheme === 'classic' ? '#000000' : 'var(--text-muted)', marginTop: '8px' }}>
                  No. Tanda Terima: <code>REC-{school.npsn}-{receiptId}</code>
                </p>
              </div>
            </div>

            {/* School Details Block */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px', padding: '16px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--card-border)', borderRadius: '12px' }}>
              <div>
                <small style={{ color: 'var(--text-secondary)' }}>Nama Lembaga</small>
                <p style={{ fontWeight: 'bold' }}>{school.name}</p>
              </div>
              <div>
                <small style={{ color: 'var(--text-secondary)' }}>NPSN Sekolah</small>
                <p style={{ fontWeight: 'bold' }}>{school.npsn}</p>
              </div>
              <div>
                <small style={{ color: 'var(--text-secondary)' }}>Kepala Sekolah</small>
                <p style={{ fontWeight: 'bold' }}>{school.principalName}</p>
              </div>
              <div>
                <small style={{ color: 'var(--text-secondary)' }}>Wilayah Gugus</small>
                <p style={{ fontWeight: 'bold' }}>Gugus {school.gugus}</p>
              </div>
            </div>

            {/* File List */}
            <div style={{ marginBottom: '40px' }}>
              <h3 style={{ fontSize: '16px', marginBottom: '16px', borderBottom: '1px solid var(--card-border)', paddingBottom: '8px' }}>
                Daftar Dokumen Terverifikasi
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--card-border)' }}>
                    <th style={{ padding: '10px 0' }}>Kategori Berkas</th>
                    <th>Status</th>
                    <th>Tgl Pengiriman</th>
                    <th style={{ textAlign: 'right' }}>Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map(cat => {
                    const sub = submissions.find(s => s.categoryId === cat.id);
                    return (
                      <tr key={cat.id} style={{ borderBottom: '1px solid var(--card-border)' }}>
                        <td style={{ padding: '12px 0', fontWeight: 'bold' }}>{cat.name}</td>
                        <td>
                          <span style={{ color: sub?.status === 'approved' ? 'var(--success)' : sub?.status === 'pending' ? 'var(--primary)' : 'var(--danger)', fontWeight: 'bold' }}>
                            {sub?.status === 'approved' ? 'DISETUJUI' : sub?.status === 'pending' ? 'REVIEW' : sub?.status === 'revision' ? 'REVISI' : 'KOSONG'}
                          </span>
                        </td>
                        <td>{sub ? new Date(sub.submittedAt).toLocaleDateString('id-ID', { dateStyle: 'short' }) : '-'}</td>
                        <td style={{ textAlign: 'right', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                          {sub?.status === 'approved' ? 'Lolos Verifikasi' : sub?.status === 'pending' ? 'Proses Antrian' : 'Belum Lengkap'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Print Signatures */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 40px', marginTop: '60px' }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Penyetor,</p>
                <div style={{ height: '70px' }}></div>
                <p style={{ fontWeight: 'bold', textDecoration: 'underline' }}>{school.operatorName}</p>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Operator Sekolah</p>
              </div>
              <div style={{ textAlign: 'center', position: 'relative' }}>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Cibadak, {new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}</p>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Penerima / Koryandik,</p>
                
                {/* Digital Signature Overlay */}
                <div style={{ height: '70px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {savedSignature ? (
                    <img src={savedSignature} alt="Digital Signature" style={{ height: '60px', objectFit: 'contain', position: 'absolute' }} />
                  ) : (
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontStyle: 'italic' }}>(Tanda tangan digital belum diatur)</span>
                  )}
                  
                  {/* Auto Stamp Overlay */}
                  {savedSignature && (
                    <div style={{
                      position: 'absolute',
                      width: '80px',
                      height: '80px',
                      border: `3px solid ${stempelColor}`,
                      borderRadius: '50%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transform: 'rotate(-18deg)',
                      opacity: 0.55,
                      right: '-30px',
                      top: '-5px',
                      pointerEvents: 'none'
                    }}>
                      <span style={{ fontSize: '6px', fontWeight: 900, color: stempelColor, textTransform: 'uppercase', letterSpacing: '0.08em', lineHeight: '1.1', textAlign: 'center' }}>Koryandik<br/>Kec. Cibadak</span>
                      <span style={{ fontSize: '5px', color: stempelColor, marginTop: '2px' }}>SAH ✓</span>
                    </div>
                  )}
                </div>

                <p style={{ fontWeight: 'bold', textDecoration: 'underline' }}>Admin Kecamatan</p>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Kec. Cibadak</p>
              </div>
            </div>

            {/* QR Code Verification */}
            {savedSignature && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '30px', borderTop: '1px dashed var(--card-border)', paddingTop: '20px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    width: '80px',
                    height: '80px',
                    border: '2px solid var(--text-primary)',
                    borderRadius: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 8px',
                    background: '#ffffff',
                    color: '#000000',
                    fontSize: '8px',
                    fontWeight: 'bold',
                    padding: '6px'
                  }}>
                    <i className="fa-solid fa-qrcode" style={{ fontSize: '32px', marginBottom: '4px' }}></i>
                    <span>KRY-{school.npsn}</span>
                  </div>
                  <p style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Pindai QR untuk memverifikasi keaslian dokumen ini</p>
                  <p style={{ fontSize: '8px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>ID: KRY-{school.npsn}-{documentId}</p>
                </div>
              </div>
            )}
          </div>
          {/* ✍️ Signature Drawing Modal */}
          {isSigModalOpen && (
            <div style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(3, 7, 18, 0.6)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '20px'
            }} className="no-print animate-fade-in">
              <div style={{
                background: 'var(--card-glass)',
                backdropFilter: 'blur(20px)',
                border: '1px solid var(--card-border)',
                borderRadius: '24px',
                width: '100%',
                maxWidth: '500px',
                boxShadow: 'var(--shadow-lg)',
                overflow: 'hidden'
              }}>
                {/* Modal Header */}
                <div style={{
                  padding: '20px 24px',
                  borderBottom: '1px solid var(--card-border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fa-solid fa-signature" style={{ color: 'var(--primary)', fontSize: '18px' }}></i>
                    <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>Atur Tanda Tangan Digital</h3>
                  </div>
                  <button 
                    onClick={() => setIsSigModalOpen(false)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '16px' }}
                  >
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                </div>

                {/* Modal Body */}
                <div style={{ padding: '24px' }}>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 16px', lineHeight: 1.6 }}>
                    Gambarkan tanda tangan resmi operator sekolah pada papan gambar di bawah. Gunakan mouse (desktop) atau jari/stylus (smartphone/tablet).
                  </p>

                  {/* Canvas Area */}
                  <div style={{
                    background: '#ffffff',
                    border: '2px dashed var(--card-border)',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    position: 'relative',
                    height: '200px'
                  }}>
                    <canvas
                      ref={canvasRef}
                      width={450}
                      height={200}
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseUp}
                      onTouchStart={handleMouseDown}
                      onTouchMove={handleMouseMove}
                      onTouchEnd={handleMouseUp}
                      style={{
                        width: '100%',
                        height: '100%',
                        cursor: 'crosshair',
                        display: 'block'
                      }}
                    />
                  </div>

                  {/* Options */}
                  <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    {/* Stempel Color Selector */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Warna Stempel:</span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {[
                          { hex: '#2563eb', label: 'Biru' },
                          { hex: '#dc2626', label: 'Merah' },
                          { hex: '#16a34a', label: 'Hijau' }
                        ].map(col => (
                          <button
                            key={col.hex}
                            onClick={() => {
                              setStempelColor(col.hex);
                              localStorage.setItem('koryandik_stempel_color', col.hex);
                            }}
                            style={{
                              width: '18px',
                              height: '18px',
                              borderRadius: '50%',
                              background: col.hex,
                              border: stempelColor === col.hex ? '2px solid var(--text-primary)' : '1px solid rgba(0,0,0,0.1)',
                              cursor: 'pointer',
                              padding: 0
                            }}
                            title={col.label}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Delete Signature Option if saved */}
                    {savedSignature && (
                      <button 
                        onClick={deleteSignature}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--danger)',
                          fontSize: '11px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: 0
                        }}
                      >
                        <i className="fa-solid fa-trash-can"></i> Hapus yang Tersimpan
                      </button>
                    )}
                  </div>
                </div>

                {/* Modal Footer */}
                <div style={{
                  padding: '16px 24px',
                  borderTop: '1px solid var(--card-border)',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '12px',
                  background: 'rgba(255,255,255,0.01)'
                }}>
                  <button 
                    className="btn btn-outline" 
                    onClick={clearCanvas}
                    style={{ padding: '8px 16px', fontSize: '12px' }}
                  >
                    <i className="fa-solid fa-eraser" style={{ marginRight: '6px' }}></i> Bersihkan
                  </button>
                  <button 
                    className="btn btn-primary" 
                    onClick={saveCanvas}
                    style={{ padding: '8px 20px', fontSize: '12px' }}
                  >
                    <i className="fa-solid fa-circle-check" style={{ marginRight: '6px' }}></i> Simpan & Pasang
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
    </DashboardShell>

      {/* CSS untuk print */}
      <style jsx global>{`
        @media print {
          body {
            background: #ffffff !important;
            color: #000000 !important;
          }
          .no-print {
            display: none !important;
          }
          .sidebar {
            display: none !important;
          }
          .main-content {
            margin-left: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }
          .print-container {
            border: none !important;
            box-shadow: none !important;
            background: none !important;
            padding: 0 !important;
            color: #000000 !important;
          }
          .card {
            border: none !important;
            box-shadow: none !important;
            background: none !important;
          }
          html {
            background: #ffffff !important;
            color: #000000 !important;
            color-scheme: light !important;
          }
        }
      `}</style>
    </>
  );
}
