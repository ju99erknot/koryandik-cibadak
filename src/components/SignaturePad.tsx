'use client';

import React, { useRef, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { playSuccessSound } from '@/lib/sound';

interface SignaturePadProps {
  onSave?: (signatureDataUrl: string) => void;
  onClose?: () => void;
}

export default function SignaturePad({ onSave, onClose }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);
  const [stempelColor, setStempelColor] = useState('#2563eb'); // Default blue stamp

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear and configure context
    ctx.strokeStyle = '#1e3a8a'; // Dark ink blue
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    // Check if TouchEvent or MouseEvent
    if ('touches' in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const coords = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const coords = getCoordinates(e);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    setHasSigned(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSigned(false);
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSigned) {
      toast.error('Gambarkan tanda tangan Anda terlebih dahulu.');
      return;
    }
    const signatureUrl = canvas.toDataURL('image/png');
    
    // Save to localStorage
    localStorage.setItem('koryandik_signature', signatureUrl);
    localStorage.setItem('koryandik_stempel_color', stempelColor);
    
    onSave?.(signatureUrl);
    playSuccessSound();
    toast.success('Tanda tangan dan stempel digital berhasil disimpan!');
    onClose?.();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10005, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Backdrop */}
      <div 
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(3, 7, 18, 0.65)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)'
        }}
      />

      {/* Signature Panel */}
      <div 
        className="card modal-card" 
        style={{
          position: 'relative',
          width: '90%',
          maxWidth: '450px',
          border: '1px solid var(--card-border)',
          borderRadius: '20px',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 1
        }}
      >
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3><i className="fa-solid fa-signature"></i> Tanda Tangan & Stempel</h3>
          <button 
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '18px' }}
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Gambarkan tanda tangan resmi Anda pada area putih di bawah. Tanda tangan ini akan dilekatkan otomatis bersama stempel Koryandik pada bukti penerimaan berkas sekolah.
          </p>

          {/* Stempel Color Selector */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
            <span>Pilih Warna Stempel Dinas:</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                type="button" 
                onClick={() => setStempelColor('#2563eb')}
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: '#2563eb',
                  border: stempelColor === '#2563eb' ? '2.5px solid #ffffff' : 'none',
                  boxShadow: stempelColor === '#2563eb' ? '0 0 5px rgba(0,0,0,0.5)' : 'none',
                  cursor: 'pointer'
                }}
              />
              <button 
                type="button" 
                onClick={() => setStempelColor('#dc2626')}
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: '#dc2626',
                  border: stempelColor === '#dc2626' ? '2.5px solid #ffffff' : 'none',
                  boxShadow: stempelColor === '#dc2626' ? '0 0 5px rgba(0,0,0,0.5)' : 'none',
                  cursor: 'pointer'
                }}
              />
              <button 
                type="button" 
                onClick={() => setStempelColor('#059669')}
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: '#059669',
                  border: stempelColor === '#059669' ? '2.5px solid #ffffff' : 'none',
                  boxShadow: stempelColor === '#059669' ? '0 0 5px rgba(0,0,0,0.5)' : 'none',
                  cursor: 'pointer'
                }}
              />
            </div>
          </div>

          {/* Drawing Canvas */}
          <div style={{ background: '#ffffff', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '5px', overflow: 'hidden' }}>
            <canvas
              ref={canvasRef}
              width={380}
              height={180}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              style={{
                width: '100%',
                height: '180px',
                display: 'block',
                background: '#ffffff',
                touchAction: 'none',
                cursor: 'crosshair'
              }}
            />
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button 
              type="button" 
              className="btn btn-outline" 
              style={{ flex: 1 }} 
              onClick={clearCanvas}
            >
              Hapus Gambar
            </button>
            <button 
              type="button" 
              className="btn btn-primary" 
              style={{ flex: 1.2 }} 
              onClick={saveSignature}
            >
              Simpan & Terapkan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
