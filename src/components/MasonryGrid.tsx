'use client';

import React from 'react';

interface MasonryGridProps {
  children: React.ReactNode;
  columns?: number;
  gap?: number;
  className?: string;
}

export default function MasonryGrid({ 
  children, 
  columns,
  gap = 16,
  className = '' 
}: MasonryGridProps) {
  const columnCount = columns || (typeof window !== 'undefined' 
    ? window.innerWidth < 768 ? 1 : window.innerWidth < 1024 ? 2 : 3
    : 3
  );

  const childrenArray = React.Children.toArray(children);
  const columnsArray = Array.from({ length: columnCount }, () => [] as React.ReactNode[]);

  // Distribute children across columns
  childrenArray.forEach((child, index) => {
    const columnIndex = index % columnCount;
    columnsArray[columnIndex].push(child);
  });

  return (
    <div 
      className={`masonry-grid ${className}`}
      style={{
        display: 'flex',
        gap: `${gap}px`,
        alignItems: 'flex-start'
      }}
    >
      {columnsArray.map((column, columnIndex) => (
        <div
          key={columnIndex}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: `${gap}px`
          }}
        >
          {column}
        </div>
      ))}
    </div>
  );
}
