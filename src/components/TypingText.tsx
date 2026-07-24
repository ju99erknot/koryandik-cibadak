'use client';

import React, { useState, useEffect } from 'react';

interface TypingTextProps {
  text: string;
  speed?: number;
  delay?: number;
  cursor?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onComplete?: () => void;
}

export default function TypingText({ 
  text, 
  speed = 50, 
  delay = 0,
  cursor = true,
  className = '',
  style,
  onComplete
}: TypingTextProps) {
  const [displayText, setDisplayText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    let index = 0;

    const startTyping = () => {
      timeout = setTimeout(() => {
        if (index < text.length) {
          setDisplayText(text.slice(0, index + 1));
          index++;
          startTyping();
        } else {
          setIsComplete(true);
          onComplete?.();
        }
      }, speed);
    };

    const initialDelay = setTimeout(() => {
      startTyping();
    }, delay);

    return () => {
      clearTimeout(initialDelay);
      clearTimeout(timeout);
    };
  }, [text, speed, delay, onComplete]);

  return (
    <span className={className} style={style}>
      {displayText}
      {cursor && !isComplete && (
        <span style={{
          display: 'inline-block',
          width: '2px',
          height: '1em',
          background: 'var(--primary)',
          marginLeft: '2px',
          animation: 'blink 1s infinite'
        }} />
      )}
    </span>
  );
}
