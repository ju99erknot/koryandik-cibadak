import React, { useEffect, useState } from 'react';

export default function BiometricAuthOverlay({ active, roleName }: { active: boolean, roleName: string }) {
  const [matrixText, setMatrixText] = useState('');
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsDark(document.documentElement.classList.contains('dark'));
    }
  }, []);

  useEffect(() => {
    if (!active) return;
    
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*';
    let iterations = 0;
    
    const interval = setInterval(() => {
      setMatrixText(Array(20).fill(0).map(() => chars[Math.floor(Math.random() * chars.length)]).join(' '));
      iterations++;
      
      if (iterations > 20) {
        clearInterval(interval);
        setMatrixText('ACCESS GRANTED');
      }
    }, 80);

    return () => clearInterval(interval);
  }, [active]);

  if (!active) return null;

  return (
    <div className="biometric-overlay">
      <div className="scanner-container">
        <div className="fingerprint-icon">
          <i className="fa-solid fa-fingerprint"></i>
          <div className="scanner-line"></div>
        </div>
        <h3 className="auth-status">
          {matrixText === 'ACCESS GRANTED' ? 'OTENTIKASI BERHASIL' : 'MENGANALISIS KREDENSIAL...'}
        </h3>
        <div className="matrix-code">{matrixText}</div>
        <p className="auth-role">Otorisasi: {roleName}</p>
      </div>

      <style jsx>{`
        .biometric-overlay {
          position: absolute;
          top: 0; left: 0; width: 100%; height: 100%;
          background: ${isDark ? 'rgba(10, 15, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)'};
          backdrop-filter: blur(10px);
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          border-radius: 20px 0 0 20px;
          animation: fadeIn 0.3s ease;
        }
        @media (max-width: 768px) {
          .biometric-overlay { border-radius: 20px 20px 0 0; }
        }
        .scanner-container {
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
        }
        .fingerprint-icon {
          position: relative;
          font-size: 80px;
          color: ${isDark ? 'rgba(0, 240, 255, 0.2)' : 'rgba(59, 130, 246, 0.2)'};
          overflow: hidden;
          width: 100px;
          height: 100px;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .matrix-code {
          font-family: monospace;
          color: ${isDark ? '#00ff41' : '#10b981'};
          font-size: 14px;
          letter-spacing: 2px;
          height: 20px;
          text-shadow: ${isDark ? '0 0 5px #00ff41' : '0 0 5px #10b981'};
        }
        .auth-status {
          color: ${isDark ? '#fff' : 'var(--text-primary)'};
          font-weight: 600;
          letter-spacing: 1px;
          margin: 0;
          font-size: 16px;
        }
        .auth-role {
          color: ${isDark ? 'rgba(255,255,255,0.6)' : 'var(--text-muted)'};
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 2px;
        }
        .scanner-line {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 4px;
          background: ${isDark ? '#00f0ff' : 'var(--primary)'};
          box-shadow: ${isDark ? '0 0 15px #00f0ff, 0 0 30px #00f0ff' : '0 0 15px var(--primary), 0 0 30px var(--primary)'};
          animation: scan 1.5s infinite linear;
        }
        @keyframes scan {
          0% { top: -10%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 110%; opacity: 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; backdrop-filter: blur(0px); }
          to { opacity: 1; backdrop-filter: blur(10px); }
        }
      `}</style>
    </div>
  );
}
