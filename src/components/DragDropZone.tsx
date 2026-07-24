'use client';

import { motion } from 'framer-motion';
import React, { useState, useRef } from 'react';

interface DragDropZoneProps {
  onDrop: (files: File[]) => void;
  children?: React.ReactNode;
  className?: string;
  accept?: string;
  multiple?: boolean;
}

export default function DragDropZone({ 
  onDrop, 
  children, 
  className = '',
  accept = '*/*',
  multiple = true
}: DragDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (accept !== '*/*') {
      const acceptedFiles = files.filter(file => file.type.match(accept));
      onDrop(acceptedFiles);
    } else {
      onDrop(files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    onDrop(files);
  };

  return (
    <motion.div
      className={className}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      animate={{
        borderColor: isDragging ? 'var(--primary)' : 'var(--card-border)',
        backgroundColor: isDragging ? 'var(--primary-glow)' : 'var(--card-glass)',
        scale: isDragging ? 1.02 : 1
      }}
      transition={{ duration: 0.2 }}
      style={{
        border: '2px dashed var(--card-border)',
        borderRadius: '16px',
        padding: '40px',
        textAlign: 'center',
        cursor: 'pointer',
        background: 'var(--card-glass)',
        backdropFilter: 'blur(20px)',
        transition: 'all 0.2s ease'
      }}
    >
      <input
        ref={inputRef}
        type="file"
        multiple={multiple}
        accept={accept}
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
      {children || (
        <div>
          <motion.div
            animate={{
              y: isDragging ? -10 : 0
            }}
            transition={{ duration: 0.2 }}
          >
            <i className="fa-solid fa-cloud-arrow-up" style={{ fontSize: '48px', color: 'var(--primary)', marginBottom: '16px' }} />
          </motion.div>
          <p style={{ fontSize: '16px', color: 'var(--text-primary)', marginBottom: '8px' }}>
            Drag & drop files here
          </p>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            or click to browse
          </p>
        </div>
      )}
    </motion.div>
  );
}
