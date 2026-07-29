'use client';
import React, { useState } from 'react';

interface CityBarData {
  label: string;
  value: number;
  maxValue: number;
  color: string;
  detail?: string;
}

interface Props {
  data: CityBarData[];
  title?: string;
}

export default function CityScapeChart({ data, title }: Props) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Proteksi type safety & cegah division by zero / -Infinity
  const validData = Array.isArray(data) ? data : [];
  const maxVal = validData.length > 0 
    ? Math.max(...validData.map(d => d.maxValue ?? 1), 1) 
    : 1;

  if (validData.length === 0) {
    return (
      <div className="cityscape-chart flex items-center justify-center h-48 border border-dashed border-slate-700 rounded-2xl">
        <span className="text-sm text-slate-500">Tidak ada data visualisasi tersedia</span>
      </div>
    );
  }

  return (
    <div className="cityscape-chart">
      {title && <h3 className="cityscape-title">{title}</h3>}
      <div className="cityscape-stage">
        {/* Ground reflection */}
        <div className="cityscape-ground"></div>
        
        {/* Buildings */}
        <div className="cityscape-buildings">
          {validData.map((item, idx) => {
            const heightPercent = Math.max((item.value / maxVal) * 100, 8);
            const isHovered = hoveredIdx === idx;
            
            return (
              <div 
                key={idx} 
                className={`building-wrapper ${isHovered ? 'hovered' : ''}`}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {/* Tooltip */}
                {isHovered && (
                  <div className="building-tooltip">
                    <strong>{item.label}</strong>
                    <span>{item.value} / {item.maxValue}</span>
                    {item.detail && <small>{item.detail}</small>}
                  </div>
                )}
                
                {/* Building */}
                <div 
                  className="building-3d"
                  style={{
                    '--building-height': `${heightPercent}%`,
                    '--building-color': item.color,
                    '--building-delay': `${idx * 0.1}s`,
                  } as React.CSSProperties}
                >
                  {/* Front face */}
                  <div className="building-front">
                    {/* Windows */}
                    {Array.from({ length: Math.max(Math.floor(heightPercent / 15), 1) }).map((_, wi) => (
                      <div key={wi} className="window-row">
                        <div className="window" style={{ animationDelay: `${(wi * 0.3) + (idx * 0.2)}s` }}></div>
                        <div className="window" style={{ animationDelay: `${(wi * 0.3) + (idx * 0.2) + 0.15}s` }}></div>
                      </div>
                    ))}
                  </div>
                  {/* Right face */}
                  <div className="building-right"></div>
                  {/* Top face */}
                  <div className="building-top"></div>
                </div>
                
                {/* Label */}
                <div className="building-label">{item.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        .cityscape-chart {
          width: 100%;
          padding: 20px 0;
        }
        .cityscape-title {
          text-align: center;
          font-size: 18px;
          color: var(--text-primary);
          margin-bottom: 20px;
          font-weight: 700;
        }
        .cityscape-stage {
          position: relative;
          height: 320px;
          perspective: 600px;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          overflow: hidden;
        }
        .cityscape-ground {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 50px;
          background: linear-gradient(180deg, rgba(0,240,255,0.05) 0%, transparent 100%);
          border-top: 1px solid rgba(0,240,255,0.15);
        }
        .cityscape-buildings {
          display: flex;
          align-items: flex-end;
          justify-content: center;
          gap: 16px;
          height: 100%;
          padding: 0 20px 50px;
          width: 100%;
          z-index: 2;
        }
        .building-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex: 1;
          max-width: 80px;
          position: relative;
          cursor: pointer;
        }
        .building-3d {
          width: 100%;
          height: var(--building-height);
          position: relative;
          transform-style: preserve-3d;
          transform: rotateX(2deg) rotateY(-8deg);
          transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          animation: buildingRise 0.8s var(--building-delay) ease-out both;
        }
        .building-wrapper.hovered .building-3d {
          transform: rotateX(2deg) rotateY(-8deg) translateY(-8px) scale(1.05);
          filter: brightness(1.3);
        }
        .building-front {
          position: absolute;
          width: 100%;
          height: 100%;
          background: linear-gradient(180deg, var(--building-color), color-mix(in srgb, var(--building-color) 60%, black));
          border-radius: 4px 4px 0 0;
          display: flex;
          flex-direction: column;
          justify-content: space-evenly;
          align-items: center;
          padding: 4px;
          box-shadow: inset 0 0 20px rgba(0,0,0,0.3);
        }
        .building-right {
          position: absolute;
          width: 16px;
          height: 100%;
          right: -16px;
          background: linear-gradient(180deg, color-mix(in srgb, var(--building-color) 40%, black), color-mix(in srgb, var(--building-color) 20%, black));
          transform: skewY(-30deg);
          transform-origin: top left;
          border-radius: 0 4px 0 0;
        }
        .building-top {
          position: absolute;
          width: 100%;
          height: 16px;
          top: -10px;
          background: color-mix(in srgb, var(--building-color) 80%, white);
          transform: skewX(-30deg);
          transform-origin: bottom left;
          border-radius: 2px;
        }
        .window-row {
          display: flex;
          gap: 4px;
          justify-content: center;
        }
        .window {
          width: 8px;
          height: 6px;
          background: rgba(255,255,200,0.7);
          border-radius: 1px;
          animation: windowFlicker 3s infinite alternate;
          box-shadow: 0 0 4px rgba(255,255,200,0.4);
        }
        .building-label {
          font-size: 9px;
          color: var(--text-secondary);
          text-align: center;
          margin-top: 8px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 80px;
          font-weight: 600;
          letter-spacing: 0.5px;
        }
        .building-tooltip {
          position: absolute;
          top: -60px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0,0,0,0.9);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 10px;
          padding: 8px 14px;
          display: flex;
          flex-direction: column;
          gap: 2px;
          z-index: 10;
          white-space: nowrap;
          animation: tooltipIn 0.2s ease;
        }
        .building-tooltip strong {
          color: #fff;
          font-size: 12px;
        }
        .building-tooltip span {
          color: #00f0ff;
          font-size: 11px;
          font-weight: 600;
        }
        .building-tooltip small {
          color: rgba(255,255,255,0.5);
          font-size: 10px;
        }
        @keyframes buildingRise {
          0% { height: 0; opacity: 0; }
          100% { height: var(--building-height); opacity: 1; }
        }
        @keyframes windowFlicker {
          0%, 80% { opacity: 0.7; }
          82% { opacity: 0.2; }
          84% { opacity: 0.8; }
          86% { opacity: 0.3; }
          100% { opacity: 0.9; }
        }
        @keyframes tooltipIn {
          from { opacity: 0; transform: translateX(-50%) translateY(5px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @media (max-width: 768px) {
          .cityscape-buildings { gap: 8px; padding: 0 10px 50px; }
          .building-wrapper { max-width: 50px; }
          .building-right { width: 10px; right: -10px; }
          .building-top { height: 10px; top: -6px; }
          .building-label { font-size: 7px; max-width: 50px; }
        }
      `}</style>
    </div>
  );
}
