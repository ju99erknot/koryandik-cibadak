
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
  placeholder?: string;
}

const commonIcons = [
  { icon: 'fa-graduation-cap', name: 'Topi Wisuda' },
  { icon: 'fa-book', name: 'Buku' },
  { icon: 'fa-chalkboard-user', name: 'Guru' },
  { icon: 'fa-school', name: 'Sekolah' },
  { icon: 'fa-building-columns', name: 'Instansi' },
  { icon: 'fa-file-lines', name: 'Dokumen' },
  { icon: 'fa-file-pdf', name: 'PDF' },
  { icon: 'fa-file-word', name: 'Word' },
  { icon: 'fa-file-excel', name: 'Excel' },
  { icon: 'fa-folder-open', name: 'Folder' },
  { icon: 'fa-folder', name: 'Folder Tertutup' },
  { icon: 'fa-calendar-days', name: 'Kalender' },
  { icon: 'fa-clock', name: 'Jam' },
  { icon: 'fa-bell', name: 'Notifikasi' },
  { icon: 'fa-info-circle', name: 'Info' },
  { icon: 'fa-question-circle', name: 'Tanya' },
  { icon: 'fa-circle-check', name: 'Cek' },
  { icon: 'fa-circle-xmark', name: 'X' },
  { icon: 'fa-link', name: 'Tautan' },
  { icon: 'fa-external-link', name: 'Tautan Luar' },
  { icon: 'fa-globe', name: 'Globe' },
  { icon: 'fa-users', name: 'Pengguna' },
  { icon: 'fa-user', name: 'Pengguna' },
  { icon: 'fa-user-group', name: 'Grup Pengguna' },
  { icon: 'fa-chart-pie', name: 'Diagram Pie' },
  { icon: 'fa-chart-bar', name: 'Diagram Batang' },
  { icon: 'fa-chart-line', name: 'Diagram Garis' },
  { icon: 'fa-money-bill-wave', name: 'Uang' },
  { icon: 'fa-credit-card', name: 'Kartu' },
  { icon: 'fa-bag-shopping', name: 'Belanja' },
  { icon: 'fa-shopping-cart', name: 'Keranjang' },
  { icon: 'fa-envelope', name: 'Email' },
  { icon: 'fa-phone', name: 'Telepon' },
  { icon: 'fa-location-dot', name: 'Lokasi' },
  { icon: 'fa-map-location-dot', name: 'Peta Lokasi' },
  { icon: 'fa-map', name: 'Peta' },
  { icon: 'fa-download', name: 'Unduh' },
  { icon: 'fa-upload', name: 'Unggah' },
  { icon: 'fa-cloud-arrow-up', name: 'Unggah Cloud' },
  { icon: 'fa-cloud-arrow-down', name: 'Unduh Cloud' },
  { icon: 'fa-google-drive', name: 'Google Drive' },
  { icon: 'fa-youtube', name: 'YouTube' },
  { icon: 'fa-facebook', name: 'Facebook' },
  { icon: 'fa-instagram', name: 'Instagram' },
  { icon: 'fa-twitter', name: 'Twitter' },
  { icon: 'fa-whatsapp', name: 'WhatsApp' },
  { icon: 'fa-gear', name: 'Pengaturan' },
  { icon: 'fa-sliders', name: 'Pengaturan' },
  { icon: 'fa-cog', name: 'Cog' },
  { icon: 'fa-star', name: 'Bintang' },
  { icon: 'fa-heart', name: 'Hati' },
  { icon: 'fa-thumbs-up', name: 'Suka' },
  { icon: 'fa-marker', name: 'Penanda' },
  { icon: 'fa-pen-to-square', name: 'Edit' },
  { icon: 'fa-trash', name: 'Hapus' },
  { icon: 'fa-eye', name: 'Lihat' },
  { icon: 'fa-print', name: 'Cetak' },
  { icon: 'fa-qrcode', name: 'QR Code' },
  { icon: 'fa-bolt', name: 'Petir' },
  { icon: 'fa-lightbulb', name: 'Lampu' },
  { icon: 'fa-fire', name: 'Api' },
  { icon: 'fa-rocket', name: 'Roket' },
  { icon: 'fa-comments', name: 'Komentar' },
  { icon: 'fa-comment-dots', name: 'Komentar' },
  { icon: 'fa-bullhorn', name: 'Pengumuman' },
  { icon: 'fa-broadcast-tower', name: 'Siaran' },
];

const IconPicker: React.FC<IconPickerProps> = ({ value, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  }, [isOpen]);

  const renderDropdown = () => (
    <>
      <div 
        style={{ 
          position: 'fixed', 
          inset: 0, 
          zIndex: 9998, 
          cursor: 'default' 
        }}
        onClick={() => setIsOpen(false)}
      />
      <div
        style={{
          position: 'absolute',
          top: dropdownPosition.top,
          left: dropdownPosition.left,
          width: dropdownPosition.width,
          maxHeight: '300px',
          overflowY: 'auto',
          background: 'var(--card-glass)',
          border: '1px solid var(--card-border)',
          borderRadius: '12px',
          padding: '12px',
          zIndex: 9999,
          boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
        }}
      >
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))', 
          gap: '8px' 
        }}>
          {commonIcons.map(({ icon, name }) => {
              const isBrand = icon.includes('google') || icon.includes('youtube') || icon.includes('facebook') || icon.includes('instagram') || icon.includes('twitter') || icon.includes('whatsapp');
              return (
            <button
              key={icon}
              type="button"
              title={name}
              onClick={(e) => {
                e.stopPropagation();
                onChange(icon);
                setIsOpen(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '10px',
                background: value === icon ? 'var(--primary-glow)' : 'transparent',
                border: value === icon ? '1px solid var(--primary)' : '1px solid transparent',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (value !== icon) {
                  e.currentTarget.style.background = 'var(--primary-glow)';
                  e.currentTarget.style.borderColor = 'var(--primary)';
                }
              }}
              onMouseLeave={(e) => {
                if (value !== icon) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = 'transparent';
                }
              }}
            >
              <i 
                className={`${isBrand ? 'fa-brands' : 'fa-solid'} ${icon}`} 
                style={{ 
                  fontSize: '18px', 
                  color: value === icon ? 'var(--primary)' : 'var(--text-secondary)' 
                }}
              ></i>
            </button>
              );
            })}
        </div>
        
        {/* Custom icon input */}
        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--card-border)' }}>
          <label style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>
            Atau masukkan custom icon:
          </label>
          <input
            type="text"
            placeholder="fa-icon-name"
            className="form-input"
            style={{ fontSize: '12px' }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onChange(e.currentTarget.value);
                setIsOpen(false);
              }
            }}
            onBlur={(e) => {
              if (e.target.value) {
                onChange(e.target.value);
                setIsOpen(false);
              }
            }}
          />
        </div>
      </div>
    </>
  );

  return (
    <div style={{ position: 'relative' }}>
      <div
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 14px',
          background: 'var(--card-glass)',
          border: '1px solid var(--card-border)',
          borderRadius: '10px',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          if (!isOpen) {
            e.currentTarget.style.borderColor = 'var(--primary)';
            e.currentTarget.style.background = 'var(--primary-glow)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isOpen) {
            e.currentTarget.style.borderColor = 'var(--card-border)';
            e.currentTarget.style.background = 'var(--card-glass)';
          }
        }}
      >
        {value ? (
          <i className={`${value.includes('google') || value.includes('youtube') || value.includes('facebook') || value.includes('instagram') || value.includes('twitter') || value.includes('whatsapp') ? 'fa-brands' : 'fa-solid'} ${value}`} style={{ fontSize: '18px', color: 'var(--primary)' }}></i>
        ) : (
          <i className="fa-solid fa-link" style={{ fontSize: '18px', color: 'var(--text-muted)' }}></i>
        )}
        <span style={{ flex: 1, color: value ? 'var(--text-primary)' : 'var(--text-muted)' }}>
          {value || placeholder || 'Pilih Ikon'}
        </span>
        <i className="fa-solid fa-chevron-down" style={{ color: 'var(--text-muted)', fontSize: '12px' }}></i>
      </div>
      
      {isOpen && typeof window !== 'undefined' && createPortal(renderDropdown(), document.body)}
    </div>
  );
};

export default IconPicker;
