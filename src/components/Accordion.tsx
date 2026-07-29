'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AccordionItem {
  id: string;
  title: string;
  content: React.ReactNode;
  icon?: string;
}

interface AccordionProps {
  items: AccordionItem[];
  allowMultiple?: boolean;
  defaultOpen?: string[];
  className?: string;
}

export default function Accordion({
  items,
  allowMultiple = false,
  defaultOpen = [],
  className = ''
}: AccordionProps) {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set(defaultOpen));

  const toggleItem = (id: string) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(id)) {
      newOpenItems.delete(id);
    } else {
      if (!allowMultiple) {
        newOpenItems.clear();
      }
      newOpenItems.add(id);
    }
    setOpenItems(newOpenItems);
  };

  return (
    <div className={`accordion ${className}`}>
      {items.map((item) => (
        <div key={item.id} className="accordion-item">
          <button
            className="accordion-header"
            onClick={() => toggleItem(item.id)}
            aria-expanded={openItems.has(item.id)}
          >
            <div className="accordion-header-content">
              {item.icon && (
                <i className={`accordion-icon ${item.icon}`}></i>
              )}
              <span className="accordion-title">{item.title}</span>
            </div>
            <motion.i
              className="fa-solid fa-chevron-down accordion-chevron"
              animate={{ rotate: openItems.has(item.id) ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            />
          </button>
          <AnimatePresence>
            {openItems.has(item.id) && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="accordion-content-wrapper"
              >
                <div className="accordion-content">
                  {item.content}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}
