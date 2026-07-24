'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface FancySelectOption {
  value: string;
  label: string;
  hint?: string;
}

interface FancySelectProps {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: FancySelectOption[];
  placeholder?: string;
  icon?: string;
  searchable?: boolean;
  disabled?: boolean;
  required?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  fullWidth?: boolean;
  /** Render menu in portal to avoid overflow clipping inside cards */
  usePortal?: boolean;
}

const MENU_MAX_HEIGHT = 320;

export default function FancySelect({
  id: idProp,
  label,
  value,
  onChange,
  options,
  placeholder = 'Pilih opsi…',
  icon,
  searchable = false,
  disabled = false,
  required = false,
  size = 'md',
  className = '',
  fullWidth = true,
  usePortal = true,
}: FancySelectProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const [menuPos, setMenuPos] = useState<{ top?: number; bottom?: number; left: number; width: number; flip: boolean }>({
    left: 0,
    width: 0,
    flip: false,
  });

  const selected = options.find((o) => o.value === value);
  const showSearch = searchable && options.length > 6;
  const filtered = showSearch
    ? options.filter((o) => {
        const q = query.toLowerCase();
        return o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q);
      })
    : options;

  const updateMenuPosition = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const flip = spaceBelow < MENU_MAX_HEIGHT && rect.top > spaceBelow;
    setMenuPos({
      left: rect.left,
      width: rect.width,
      top: flip ? undefined : rect.bottom + 8,
      bottom: flip ? window.innerHeight - rect.top + 8 : undefined,
      flip,
    });
  };

  useEffect(() => {
    if (!open) {
      setQuery('');
      setHighlight(0);
      return;
    }
    updateMenuPosition();
    if (showSearch) searchRef.current?.focus();

    const onScrollOrResize = () => updateMenuPosition();
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [open, showSearch]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  const pick = (val: string) => {
    onChange(val);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter' && filtered[highlight]) {
      e.preventDefault();
      pick(filtered[highlight].value);
    }
  };

  const menuContent = (
    <div
      ref={menuRef}
      className={`fancy-select-menu ${menuPos.flip ? 'flip-up' : ''}`}
      role="listbox"
      aria-labelledby={id}
      style={
        usePortal
          ? {
              position: 'fixed',
              left: menuPos.left,
              width: menuPos.width,
              top: menuPos.top,
              bottom: menuPos.bottom,
              zIndex: 10050,
            }
          : undefined
      }
    >
      {showSearch && (
        <div className="fancy-select-search">
          <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
          <input
            ref={searchRef}
            type="search"
            placeholder="Cari sekolah…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setHighlight(0);
            }}
            onKeyDown={onKeyDown}
          />
        </div>
      )}
      <ul className="fancy-select-options">
        {filtered.length === 0 ? (
          <li className="fancy-select-empty">Tidak ditemukan</li>
        ) : (
          filtered.map((opt, idx) => (
            <li key={opt.value || `opt-${idx}`}>
              <button
                type="button"
                role="option"
                aria-selected={opt.value === value}
                className={`fancy-select-option ${opt.value === value ? 'is-selected' : ''} ${idx === highlight ? 'is-highlighted' : ''}`}
                onMouseEnter={() => setHighlight(idx)}
                onClick={() => pick(opt.value)}
              >
                <span className="fancy-select-option-label">{opt.label}</span>
                {opt.hint && <span className="fancy-select-option-hint">{opt.hint}</span>}
                {opt.value === value && (
                  <i className="fa-solid fa-check fancy-select-check" aria-hidden="true" />
                )}
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );

  return (
    <div
      ref={rootRef}
      className={`fancy-select fancy-select-${size} ${fullWidth ? 'fancy-select-block' : ''} ${open ? 'is-open' : ''} ${disabled ? 'is-disabled' : ''} ${className}`}
    >
      {label && (
        <label htmlFor={id} className="fancy-select-label">
          {label}
        </label>
      )}

      <button
        ref={triggerRef}
        id={id}
        type="button"
        className="fancy-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={onKeyDown}
      >
        {icon && <i className={`fancy-select-icon ${icon}`} aria-hidden="true" />}
        <span className={`fancy-select-value ${!selected?.value ? 'is-placeholder' : ''}`}>
          {selected?.label || placeholder}
        </span>
        <i className="fa-solid fa-chevron-down fancy-select-chevron" aria-hidden="true" />
      </button>

      {required && !value && (
        <select
          tabIndex={-1}
          aria-hidden
          required
          value={value}
          onChange={() => {}}
          className="fancy-select-native-required"
        >
          <option value="">Required</option>
        </select>
      )}

      {open &&
        (usePortal && typeof document !== 'undefined'
          ? createPortal(menuContent, document.body)
          : menuContent)}
    </div>
  );
}
