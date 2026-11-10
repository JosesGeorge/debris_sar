
import React, { useRef, useEffect } from 'react';

interface SonarPanelProps {
  isActive: boolean;
}

const SonarPanel: React.FC<SonarPanelProps> = ({ isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let frame: number;
    let offset = 0;

    const render = () => {
      const { width, height } = canvas;
      ctx.fillStyle = '#010808';
      ctx.fillRect(0, 0, width, height);

      // Grid with opacity
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.08)';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 25) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke(); }
      for (let y = 0; y < height; y += 15) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); }

      // Smooth wave construction
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      for (let x = 0; x < width; x++) {
        const h = isActive ? 1.0 : 0.2;
        const noise = (Math.random() - 0.5) * (isActive ? 4 : 1);
        const y = height / 2 + 
          Math.sin(x * 0.06 + offset) * (height * 0.25 * h) + 
          Math.sin(x * 0.12 - offset * 1.5) * (height * 0.1 * h) + noise;
        ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Scan cursor
      const sx = (offset * 120) % width;
      ctx.fillStyle = 'rgba(16, 185, 129, 0.3)';
      ctx.fillRect(sx, 0, 3, height);

      offset += 0.04;
      frame = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(frame);
  }, [isActive]);

  return (
    <div className="bg-black/90 border border-white/10 p-3 backdrop-blur-xl shadow-xl">
      <div className="flex justify-between text-[7px] mb-2 opacity-50 font-black">
        <span>ACOUSTIC_ARRAY // 200kHz</span>
        <span className="flex items-center gap-1">GAIN: 72dB <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div></span>
      </div>
      <canvas ref={canvasRef} width={280} height={70} className="w-full bg-emerald-950/10" />
    </div>
  );
};

export default SonarPanel;
