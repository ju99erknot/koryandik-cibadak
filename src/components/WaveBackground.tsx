'use client';

import { useEffect, useRef } from 'react';

interface WaveBackgroundProps {
  color?: string;
  amplitude?: number;
  frequency?: number;
  speed?: number;
}

export default function WaveBackground({ 
  color = 'rgba(59, 130, 246, 0.1)',
  amplitude = 30,
  frequency = 0.02,
  speed = 0.05
}: WaveBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let offset = 0;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const drawWave = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);

        for (let x = 0; x < canvas.width; x++) {
          const y = canvas.height / 2 + 
            Math.sin(x * frequency + offset + i * 2) * amplitude * (1 + i * 0.3);
          ctx.lineTo(x, y);
        }

        ctx.lineTo(canvas.width, canvas.height);
        ctx.lineTo(0, canvas.height);
        ctx.closePath();

        ctx.fillStyle = color.replace('0.1', `${0.1 - i * 0.02}`);
        ctx.fill();
      }

      offset += speed;
      animationFrameId = requestAnimationFrame(drawWave);
    };

    resizeCanvas();
    drawWave();

    const handleResize = () => {
      resizeCanvas();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [color, amplitude, frequency, speed]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0
      }}
    />
  );
}
