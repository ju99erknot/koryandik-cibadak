'use client';

import React, { useState, useRef } from 'react';
import type { Category } from '@/lib/schoolsData';
import { addSubmission } from '@/lib/db';
import { toast } from 'sonner';
import { playSuccessSound } from '@/lib/sound';

interface BulkFile {
  id: string;
  file: File;
  name: string;
  categoryId: string;
  status: 'matched' | 'unmatched' | 'uploading' | 'success' | 'error';
  errorMsg?: string;
}

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  schoolNpsn: string;
  onUploadSuccess: () => void;
}

export default function BulkUploadModal({ isOpen, onClose, categories, schoolNpsn, onUploadSuccess }: BulkUploadModalProps) {
  const [files, setFiles] = useState<BulkFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Clean name helper for matching
  const cleanString = (str: string) => {
    return str.toLowerCase().replace(/[^a-z0-9]/g, '');
  };

  // Find matching category by filename
  const findMatchingCategory = (fileName: string): string => {
    const cleanedFile = cleanString(fileName);
    const matched = categories.find(cat => {
      const cleanedCat = cleanString(cat.name);
      return cleanedFile.includes(cleanedCat) || cleanedCat.includes(cleanedFile);
    });
    return matched ? matched.id : '';
  };

  const handleFilesAdded = (rawFiles: FileList) => {
    const newFiles: BulkFile[] = [];
    for (let i = 0; i < rawFiles.length; i++) {
      const file = rawFiles[i];
      if (file.type !== 'application/pdf') {
        toast.error(`File "${file.name}" diabaikan. Hanya file PDF yang diperbolehkan.`);
        continue;
      }

      const matchedCatId = findMatchingCategory(file.name);
      newFiles.push({
        id: Math.random().toString(36).substring(7),
        file,
        name: file.name,
        categoryId: matchedCatId,
        status: matchedCatId ? 'matched' : 'unmatched'
      });
    }
    setFiles(prev => [...prev, ...newFiles]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files) {
      handleFilesAdded(e.dataTransfer.files);
    }
  };

  const handleCategoryChange = (fileId: string, categoryId: string) => {
    setFiles(prev => prev.map(f => {
      if (f.id === fileId) {
        return {
          ...f,
          categoryId,
          status: categoryId ? 'matched' : 'unmatched'
        };
      }
      return f;
    }));
  };

  const handleRemoveFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleUploadAll = async () => {
    const readyFiles = files.filter(f => f.categoryId && f.status !== 'success');
    if (readyFiles.length === 0) {
      toast.warning('Pilih kategori untuk dokumen sebelum mengunggah.');
      return;
    }

    setIsUploading(true);
    let successCount = 0;

    for (const f of readyFiles) {
      setFiles(prev => prev.map(item => item.id === f.id ? { ...item, status: 'uploading' } : item));
      try {
        // Generate mock Google Drive link
        const mockLink = `https://drive.google.com/file/d/1${Math.random().toString(36).substring(2, 17)}/view?usp=sharing`;
        await addSubmission({
          schoolNpsn,
          categoryId: f.categoryId,
          status: 'pending',
          fileName: f.name,
          driveLink: mockLink,
        });

        setFiles(prev => prev.map(item => item.id === f.id ? { ...item, status: 'success' } : item));
        successCount++;
      } catch (err) {
        setFiles(prev => prev.map(item => item.id === f.id ? { ...item, status: 'error', errorMsg: 'Gagal mengunggah berkas' } : item));
      }
    }

    setIsUploading(false);
    if (successCount > 0) {
      playSuccessSound();
      toast.success(`${successCount} berkas berhasil diunggah secara bulk!`);
      onUploadSuccess();
      // Remove success files from list
      setFiles(prev => prev.filter(item => item.status !== 'success'));
    }
  };

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-upload-title"
      style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'var(--modal-backdrop)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 'var(--z-modal-full)',
      backdropFilter: 'blur(var(--modal-blur))'
    }}>
      <div className="card modal-card" style={{
        border: '1px solid var(--card-border)',
        borderRadius: 'var(--modal-radius)',
        padding: '24px',
        width: '90%',
        maxWidth: '640px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: 'var(--shadow-lg)',
        animation: 'modal-zoom 0.2s ease-out'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 id="bulk-upload-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
            <i className="fa-solid fa-cloud-arrow-up" style={{ color: '#3b82f6' }}></i>
            Bulk Upload Berkas (PDF Only)
          </h3>
          <button type="button" onClick={onClose} aria-label="Tutup dialog unggah massal" style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '18px', cursor: 'pointer' }}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Drag and Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: isDragOver ? '2px dashed #3b82f6' : '2px dashed rgba(255,255,255,0.2)',
            borderRadius: '16px',
            padding: '40px 20px',
            textAlign: 'center',
            cursor: 'pointer',
            background: isDragOver ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.02)',
            transition: 'background 0.2s, border-color 0.2s',
            marginBottom: '20px'
          }}
        >
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            multiple
            accept=".pdf"
            onChange={(e) => e.target.files && handleFilesAdded(e.target.files)}
          />
          <i className="fa-solid fa-file-pdf" style={{ fontSize: '48px', color: '#ef4444', marginBottom: '12px', display: 'block' }}></i>
          <span style={{ fontSize: '14px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
            Seret & Lepas file PDF di sini
          </span>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            atau klik untuk memilih file dari komputer Anda
          </span>
        </div>

        {/* File Queue List */}
        {files.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '10px', fontWeight: 'bold' }}>
              Antrean Berkas ({files.length})
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto' }}>
              {files.map(f => (
                <div key={f.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--card-border)',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  gap: '12px'
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: '13px', fontWeight: 'bold', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {f.name}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                      <select
                        value={f.categoryId}
                        onChange={(e) => handleCategoryChange(f.id, e.target.value)}
                        style={{
                          fontSize: '11px',
                          background: 'var(--bg-space-dark)',
                          color: 'var(--text-primary)',
                          border: '1px solid var(--card-border)',
                          borderRadius: '6px',
                          padding: '2px 4px',
                          maxWidth: '200px'
                        }}
                      >
                        <option value="">-- Pilih Kategori --</option>
                        {categories.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                      {f.status === 'matched' && (
                        <span style={{ fontSize: '10px', color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                          <i className="fa-solid fa-circle-check"></i> Auto-Match
                        </span>
                      )}
                      {f.status === 'unmatched' && (
                        <span style={{ fontSize: '10px', color: '#f59e0b', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                          <i className="fa-solid fa-circle-question"></i> Pilih Kategori
                        </span>
                      )}
                      {f.status === 'uploading' && (
                        <span style={{ fontSize: '10px', color: '#3b82f6' }}>
                          <i className="fa-solid fa-spinner fa-spin"></i> Mengunggah...
                        </span>
                      )}
                      {f.status === 'error' && (
                        <span style={{ fontSize: '10px', color: '#ef4444' }}>
                          {f.errorMsg}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleRemoveFile(f.id)}
                    disabled={isUploading}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '4px'
                    }}
                  >
                    <i className="fa-solid fa-trash-can"></i>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="btn btn-outline"
            style={{ padding: '8px 16px' }}
          >
            Batal
          </button>
          <button
            onClick={handleUploadAll}
            disabled={isUploading || files.length === 0}
            className="btn btn-primary"
            style={{ padding: '8px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            {isUploading ? (
              <>
                <i className="fa-solid fa-spinner fa-spin"></i> Mengunggah...
              </>
            ) : (
              <>
                Unggah Semua <i className="fa-solid fa-cloud-arrow-up"></i>
              </>
            )}
          </button>
        </div>
      </div>

      <style jsx global>{`
        @keyframes modal-zoom {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
