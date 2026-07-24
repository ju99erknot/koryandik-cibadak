'use client';

import React from 'react';
import type { DownloadItem } from '@/lib/types';
import { incrementDownloadCount } from '@/lib/db';
import { toast } from 'sonner';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: DownloadItem | null;
  onDownloadSuccess?: () => void;
}

export default function DocumentPreviewModal({ isOpen, onClose, document: doc, onDownloadSuccess }: DocumentPreviewModalProps) {
  if (!isOpen || !doc) return null;

  // Convert Google Drive/Docs URL to embed URL using Google Docs Viewer
  const getGoogleDriveEmbedUrl = (url: string) => {
    // Handle Google Docs URLs - use direct preview link
    const docsMatch = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
    if (docsMatch) {
      const fileId = docsMatch[1];
      // Use direct preview without viewer wrapper to avoid blocking
      return `https://docs.google.com/document/d/${fileId}/preview?rm=minimal`;
    }
    
    // Handle Google Drive file URLs
    const driveMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (driveMatch) {
      const fileId = driveMatch[1];
      // Use direct Drive preview
      return `https://drive.google.com/file/d/${fileId}/preview?rm=minimal`;
    }
    
    // Handle Google Sheets URLs
    const sheetsMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (sheetsMatch) {
      const fileId = sheetsMatch[1];
      return `https://docs.google.com/spreadsheets/d/${fileId}/preview?rm=minimal`;
    }
    
    return null;
  };

  const embedUrl = doc.previewUrl || getGoogleDriveEmbedUrl(doc.downloadUrl);
  const canEmbed = !!embedUrl && embedUrl !== '#' && !embedUrl.includes('EXAMPLE_FILE_ID');

  const handleDownload = async () => {
    try {
      await incrementDownloadCount(doc.id);
      toast.success(`Mengunduh berkas resmi: ${doc.title}`);
      if (onDownloadSuccess) {
        onDownloadSuccess();
      }
      
      // Download actual file from downloadUrl
      if (doc.downloadUrl) {
        window.open(doc.downloadUrl, '_blank');
      } else {
        toast.error('Link download tidak tersedia');
      }
    } catch (err) {
      toast.error('Gagal memproses unduhan berkas.');
    }
  };

  const handlePrint = () => {
    if (doc.downloadUrl) {
      // Open Google Drive in print mode or direct print
      window.open(doc.downloadUrl, '_blank');
      toast.info('Membuka file untuk dicetak...');
    } else {
      toast.error('Link tidak tersedia untuk cetak');
    }
  };

  const getFileIconColor = (type: string) => {
    switch (type) {
      case 'PDF': return '#ef4444';
      case 'DOCX': return '#3b82f6';
      case 'XLSX': return '#10b981';
      default: return 'var(--text-secondary)';
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 'var(--z-modal-full)' as any,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        .prv-backdrop {
          position: absolute;
          inset: 0;
          background: var(--modal-backdrop);
          backdrop-filter: blur(var(--modal-blur));
          transition: all 0.3s ease;
        }
        .prv-container {
          position: relative;
          background: var(--card-glass);
          border: 1px solid var(--card-border);
          border-radius: 24px;
          width: 95%;
          maxWidth: 900px;
          height: 85vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.4);
          animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          z-index: 1;
        }
        .prv-header {
          padding: 20px 24px;
          border-bottom: 1px solid var(--card-border);
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: var(--card-glass);
        }
        .prv-body {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
          background: var(--bg-space);
          display: flex;
          gap: 20px;
        }
        @media (max-width: 768px) {
          .prv-body {
            flex-direction: column;
          }
        }
        .prv-sheet-paper {
          flex: 1.8;
          background: #ffffff;
          border: 1px solid rgba(0, 0, 0, 0.1);
          border-radius: 16px;
          padding: 40px;
          min-height: 500px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
          color: #1e293b;
          font-family: 'Times New Roman', Georgia, serif;
          position: relative;
          display: flex;
          flex-direction: column;
        }
        html.dark .prv-sheet-paper {
          background: #1e293b;
          color: #f8fafc;
          border-color: rgba(255, 255, 255, 0.08);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }
        .prv-sheet-logo {
          border-bottom: 3px double #1e293b;
          padding-bottom: 15px;
          margin-bottom: 25px;
          text-align: center;
        }
        html.dark .prv-sheet-logo {
          border-color: #f8fafc;
        }
        .prv-sidebar {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .prv-info-card {
          background: var(--bg-space-dark);
          border: 1px solid var(--card-border);
          border-radius: 16px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .prv-info-row {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          border-bottom: 1px dashed var(--card-border);
          padding-bottom: 8px;
        }
        .prv-info-row span {
          color: var(--text-secondary);
        }
        .prv-info-row strong {
          color: var(--text-primary);
        }
        .prv-stamp-badge {
          border: 2px solid var(--success);
          color: var(--success);
          font-weight: 900;
          font-size: 11px;
          text-transform: uppercase;
          padding: 6px 12px;
          border-radius: 8px;
          width: fit-content;
          transform: rotate(-4deg);
          margin-top: auto;
          align-self: flex-end;
          letter-spacing: 1px;
          box-shadow: 0 0 10px var(--success-glow);
        }
      ` }} />

      <div className="prv-backdrop" onClick={onClose} />

      <div className="prv-container">
        {/* Header */}
        <div className="prv-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'var(--primary-glow)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: getFileIconColor(doc.fileType),
                fontSize: '20px'
              }}
            >
              <i className={`fa-solid ${doc.icon || 'fa-file-lines'}`} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>Pratinjau Berkas Publik</h3>
              <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--text-secondary)' }}>Format resmi Koryandik Cibadak</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="dir-close-button"
            aria-label="Tutup Pratinjau"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Content Body */}
        <div className="prv-body">
          {/* Preview Info - Google blocks embedding, so show message */}
          <div className="prv-sheet-paper" style={{ padding: '40px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
            <div style={{ 
              width: '80px', 
              height: '80px', 
              borderRadius: '50%', 
              background: 'var(--primary-glow)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              marginBottom: '24px'
            }}>
              <i className={`fa-solid ${doc.icon || 'fa-file-lines'}`} style={{ fontSize: '32px', color: getFileIconColor(doc.fileType) }} />
            </div>
            
            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 12px', color: 'var(--text-primary)' }}>
              {doc.title}
            </h3>
            
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '0 0 24px', lineHeight: 1.6, maxWidth: '400px' }}>
              File ini tersimpan di Google Drive. Klik tombol di bawah untuk membuka file di tab baru.
            </p>
            
            <button
              onClick={() => window.open(doc.downloadUrl, '_blank')}
              className="btn btn-primary"
              style={{ 
                padding: '12px 24px', 
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <i className="fa-solid fa-external-link-alt" />
              Buka File di Google Drive
            </button>
            
            <div className="prv-stamp-badge" style={{ marginTop: '32px' }}>
              <i className="fa-solid fa-circle-check" style={{ marginRight: '6px' }} /> Koryandik Cibadak
            </div>
          </div>

          {/* Right Sidebar Metadata */}
          <div className="prv-sidebar">
            <div className="prv-info-card">
              <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>Detail Informasi File</h4>

              <div className="prv-info-row" style={{ marginTop: '6px' }}>
                <span>Tipe Dokumen</span>
                <strong style={{ color: getFileIconColor(doc.fileType) }}>{doc.fileType} Template</strong>
              </div>
              <div className="prv-info-row">
                <span>Ukuran Berkas</span>
                <strong>{doc.fileSize}</strong>
              </div>
              <div className="prv-info-row">
                <span>Versi Terkini</span>
                <strong>v{doc.version || '1.0'}</strong>
              </div>
              <div className="prv-info-row">
                <span>Kategori</span>
                <strong>{doc.category === 'surat' ? 'Surat Undangan' : doc.category === 'format' ? 'Format Berkas' : 'SK Resmi'}</strong>
              </div>
              <div className="prv-info-row">
                <span>Diperbarui</span>
                <strong>{doc.updatedAt}</strong>
              </div>
              <div className="prv-info-row" style={{ borderBottom: 'none' }}>
                <span>Total Diunduh</span>
                <strong><i className="fa-solid fa-download" style={{ marginRight: '4px', fontSize: '10px' }} /> {doc.downloadCount || 0} Kali</strong>
              </div>
            </div>

            {/* Actions Panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: 'auto' }}>
              <button
                className="btn btn-primary"
                onClick={handleDownload}
                style={{ width: '100%', height: '44px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <i className="fa-solid fa-download" /> Unduh Berkas Resmi
              </button>
              <button
                className="btn btn-outline"
                onClick={handlePrint}
                style={{ width: '100%', height: '44px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <i className="fa-solid fa-print" /> Cetak/Print Template
              </button>
              <button
                className="btn btn-outline"
                onClick={onClose}
                style={{ width: '100%', height: '44px', borderRadius: '12px', border: '1px dashed var(--card-border)' }}
              >
                Kembali
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
