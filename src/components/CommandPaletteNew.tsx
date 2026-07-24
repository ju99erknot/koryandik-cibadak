'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Command {
  id: string;
  label: string;
  shortcut?: string;
  icon?: string;
  action: () => void;
  category?: string;
}

interface CommandPaletteProps {
  commands: Command[];
  trigger?: string;
  placeholder?: string;
  onClose?: () => void;
}

export default function CommandPalette({
  commands,
  trigger = 'Ctrl+K',
  placeholder = 'Search commands...',
  onClose
}: CommandPaletteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredCommands = commands.filter(cmd =>
    cmd.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cmd.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedCommands = filteredCommands.reduce((acc, cmd) => {
    const category = cmd.category || 'General';
    if (!acc[category]) acc[category] = [];
    acc[category].push(cmd);
    return acc;
  }, {} as Record<string, Command[]>);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
      if (isOpen) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
        }
        if (e.key === 'Enter' && filteredCommands.length > 0) {
          e.preventDefault();
          filteredCommands[selectedIndex].action();
          setIsOpen(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  const executeCommand = (cmd: Command) => {
    cmd.action();
    setIsOpen(false);
    onClose?.();
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="command-palette-overlay"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="command-palette"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="command-palette-header">
                <i className="fa-solid fa-search command-palette-search-icon"></i>
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={placeholder}
                  className="command-palette-input"
                />
                <kbd className="command-palette-shortcut">ESC</kbd>
              </div>

              <div className="command-palette-body">
                {Object.entries(groupedCommands).map(([category, cmds]) => (
                  <div key={category} className="command-palette-group">
                    <div className="command-palette-group-title">{category}</div>
                    {cmds.map((cmd, index) => (
                      <button
                        key={cmd.id}
                        className={`command-palette-item ${
                          index === selectedIndex ? 'selected' : ''
                        }`}
                        onClick={() => executeCommand(cmd)}
                        onMouseEnter={() => setSelectedIndex(index)}
                      >
                        {cmd.icon && (
                          <i className={`command-palette-item-icon ${cmd.icon}`}></i>
                        )}
                        <span className="command-palette-item-label">{cmd.label}</span>
                        {cmd.shortcut && (
                          <kbd className="command-palette-item-shortcut">
                            {cmd.shortcut}
                          </kbd>
                        )}
                      </button>
                    ))}
                  </div>
                ))}
                {filteredCommands.length === 0 && (
                  <div className="command-palette-empty">
                    <i className="fa-solid fa-search"></i>
                    <p>No commands found</p>
                  </div>
                )}
              </div>

              <div className="command-palette-footer">
                <div className="command-palette-hint">
                  <kbd>↑↓</kbd> to navigate
                  <kbd>Enter</kbd> to select
                </div>
                <div className="command-palette-trigger-hint">
                  Press <kbd>{trigger}</kbd> to open
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
