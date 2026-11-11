import React, { useEffect, useRef } from 'react';

interface AcousticWaveformProps {
  data: Float32Array;
  isActive: boolean;
}

const AcousticWaveform: React.FC<AcousticWaveformProps> = ({ data, isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.fillStyle = '#010808';
    ctx.fillRect(0, 0, width, height);

    if (!isActive) {
      // Flat noise line
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      for (let x = 0; x < width; x++) {
        const noise = (Math.random() - 0.5) * 2;
        ctx.lineTo(x, height / 2 + noise);
      }
      ctx.stroke();
      return;
    }

    // Grid
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.06)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 20) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    for (let y = 0; y < height; y += 15) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }

    // Waveform from acoustic data buffer
    const len = data.length;
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < len; i++) {
      const x = (i / len) * width;
      const y = height / 2 - data[i] * (height * 0.42);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Echo peak markers — find local maxima above threshold
    ctx.fillStyle = '#fbbf24';
    for (let i = 2; i < len - 2; i++) {
      const v = Math.abs(data[i]);
      if (v > 0.4 && v > Math.abs(data[i - 1]) && v > Math.abs(data[i + 1])) {
        const x = (i / len) * width;
        const y = height / 2 - data[i] * (height * 0.42);
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Centre line
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
  }, [data, isActive]);

  return (
    <canvas
      ref={canvasRef}
      width={500}
      height={70}
      className="h-full w-full"
      aria-label="Simulated acoustic signal waveform"
    />
  );
};

export default AcousticWaveform;
