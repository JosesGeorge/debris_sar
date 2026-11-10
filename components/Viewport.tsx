import React, { useEffect, useRef } from 'react';
import { DebrisDetection, MissionStatus, Particulate, TelemetryData } from '../types';

interface ViewportProps { missionStatus: MissionStatus; telemetry: TelemetryData; detection?: DebrisDetection; }

const Viewport: React.FC<ViewportProps> = ({ missionStatus, telemetry, detection }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particulate[]>(Array.from({ length: 220 }, () => ({
    x: Math.random() * 2 - 1, y: Math.random() * 2 - 1, z: Math.random() * 10,
    size: Math.random() * 1.3 + 0.3, opacity: Math.random() * 0.25 + 0.04,
    vx: (Math.random() - 0.5) * 0.001, vy: (Math.random() - 0.5) * 0.001
  })));

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    let frame = 0;
    const render = (time: number) => {
      const { width, height } = canvas;
      context.fillStyle = '#020b14';
      context.fillRect(0, 0, width, height);
      const centerX = width * 0.52;
      const centerY = height * 0.5;
      const radius = Math.min(width, height) * 0.42;
      const scanAngle = (time / 1800) % (Math.PI * 2);
      context.strokeStyle = 'rgba(34, 211, 238, .12)';
      context.lineWidth = 1;
      for (let ring = 1; ring <= 4; ring++) {
        context.beginPath();
        context.arc(centerX, centerY, radius * ring / 4, 0, Math.PI * 2);
        context.stroke();
      }
      context.beginPath();
      context.moveTo(centerX - radius, centerY);
      context.lineTo(centerX + radius, centerY);
      context.moveTo(centerX, centerY - radius);
      context.lineTo(centerX, centerY + radius);
      context.stroke();
      const gradient = context.createLinearGradient(centerX, centerY, centerX + Math.cos(scanAngle) * radius, centerY + Math.sin(scanAngle) * radius);
      gradient.addColorStop(0, 'rgba(34,211,238,.35)');
      gradient.addColorStop(1, 'rgba(34,211,238,0)');
      context.strokeStyle = gradient;
      context.lineWidth = 5;
      context.beginPath();
      context.moveTo(centerX, centerY);
      context.lineTo(centerX + Math.cos(scanAngle) * radius, centerY + Math.sin(scanAngle) * radius);
      context.stroke();
      particles.current.forEach(particle => {
        particle.z -= 0.012;
        if (particle.z < 0.2) particle.z = 10;
        const x = centerX + (particle.x - telemetry.gimbalYaw / 180) * width / particle.z;
        const y = centerY + (particle.y - telemetry.gimbalPitch / 180) * height / particle.z;
        context.fillStyle = `rgba(125, 211, 252, ${particle.opacity * (1 - particle.z / 11)})`;
        context.fillRect(x, y, particle.size, particle.size);
      });
      if (detection && missionStatus !== MissionStatus.SCANNING) {
        const pulse = 1 + Math.sin(time / 220) * 0.08;
        const targetX = centerX + Math.sin(detection.angle * Math.PI / 180) * radius * 0.62;
        const targetY = centerY - Math.cos(detection.angle * Math.PI / 180) * radius * 0.62;
        context.save();
        context.translate(targetX, targetY);
        context.scale(pulse, pulse);
        context.strokeStyle = missionStatus === MissionStatus.CONFIRMED ? '#fbbf24' : '#22d3ee';
        context.shadowBlur = 18;
        context.shadowColor = context.strokeStyle;
        context.lineWidth = 1.5;
        const objectScale = Math.min(width, height) * 0.1;
        if (detection.category === 'Fishing Waste') {
          for (let row = -2; row <= 2; row++) {
            context.beginPath();
            context.moveTo(-objectScale, row * objectScale / 2);
            context.quadraticCurveTo(0, row * objectScale / 2 + objectScale / 3, objectScale, row * objectScale / 2);
            context.stroke();
          }
          for (let column = -2; column <= 2; column++) {
            context.beginPath(); context.moveTo(column * objectScale / 2, -objectScale); context.lineTo(column * objectScale / 2, objectScale); context.stroke();
          }
        } else {
          const bottle = detection.label.includes('bottle');
          const can = detection.label.includes('can');
          const bag = detection.label.includes('bag');
          const widthFactor = bag ? 1.5 : can ? 0.7 : 0.85;
          context.beginPath();
          if (bag) { context.moveTo(-objectScale, -objectScale); context.quadraticCurveTo(-objectScale * .7, objectScale, objectScale, objectScale * .7); }
          else { context.roundRect(-objectScale * widthFactor / 2, -objectScale, objectScale * widthFactor, objectScale * 2, objectScale * .18); }
          context.stroke();
          if (bottle) { context.beginPath(); context.rect(-objectScale * .22, -objectScale * 1.25, objectScale * .44, objectScale * .3); context.stroke(); }
          for (let line = -2; line <= 2; line++) {
            context.beginPath(); context.moveTo(-objectScale * widthFactor / 2, line * objectScale / 2); context.lineTo(objectScale * widthFactor / 2, line * objectScale / 2); context.stroke();
          }
        }
        context.restore();
        context.fillStyle = '#fef08a';
        context.font = '12px monospace';
        context.fillText(`${detection.id} // ${detection.label.toUpperCase()}`, targetX + 16, targetY - 12);
      }
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frame);
  }, [detection, missionStatus, telemetry]);

  return <canvas ref={canvasRef} width={1400} height={900} className="absolute inset-0 h-full w-full object-contain opacity-90" aria-label="Animated sonar scan with debris wireframe target" />;
};

export default Viewport;
