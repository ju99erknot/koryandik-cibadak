'use client';

import React, { useState } from 'react';

interface FloatingLabelInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export default function FloatingLabelInput({ label, error, value, onChange, ...props }: FloatingLabelInputProps) {
  const [focused, setFocused] = useState(false);
  const hasValue = value !== undefined && value !== '';

  return (
    <div style={{ position: 'relative', marginBottom: '20px' }}>
      <input
        {...props}
        value={value}
        onChange={onChange}
        onFocus={(e) => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          props.onBlur?.(e);
        }}
        style={{
          width: '100%',
          padding: '16px 12px 8px',
          fontSize: '16px',
          border: `1px solid ${error ? 'var(--danger)' : 'var(--card-border)'}`,
          borderRadius: '8px',
          background: 'var(--card-glass)',
          color: 'var(--text-primary)',
          outline: 'none',
          transition: 'all 0.3s ease',
          ...props.style
        }}
      />
      <label
        style={{
          position: 'absolute',
          left: '12px',
          top: focused || hasValue ? '4px' : '50%',
          transform: focused || hasValue ? 'translateY(0)' : 'translateY(-50%)',
          fontSize: focused || hasValue ? '12px' : '16px',
          color: error ? 'var(--danger)' : focused ? 'var(--primary)' : 'var(--text-muted)',
          transition: 'all 0.3s ease',
          pointerEvents: 'none',
          background: 'var(--card-glass)',
          padding: '0 4px',
          borderRadius: '4px'
        }}
      >
        {label}
      </label>
      {error && (
        <span style={{
          position: 'absolute',
          bottom: '-20px',
          left: '0',
          fontSize: '12px',
          color: 'var(--danger)'
        }}>
          {error}
        </span>
      )}
    </div>
  );
}
