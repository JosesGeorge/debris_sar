import React, { useCallback, useEffect, useRef } from 'react';
import { MissionStatus, SonarTarget } from '../types';

interface SonarRadarProps {
  targets: SonarTarget[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  scanRange: number;
  missionStatus: MissionStatus;
}

const TAU = Math.PI * 2;
const SWEEP_SPEED = 0.00042;

const SonarRadar: React.FC<SonarRadarProps> = ({ targets, selectedId, onSelect, scanRange, missionStatus }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const sweepRef = useRef(0);
  const lastTimeRef = useRef(0);
  const trailRef = useRef<Float32Array>(new Float32Array(360));
  const propsRef = useRef({ targets, selectedId, scanRange, missionStatus });
  const noiseRef = useRef<Array<{ angle: number; distance: number; alpha: number }>>([]);

  propsRef.current = { targets, selectedId, scanRange, missionStatus };

  const targetPosition = useCallback((target: SonarTarget, cx: number, cy: number, radius: number, range: number) => {
    const distance = Math.min(1, target.distance / range) * radius;
    const angle = (target.bearing - 90) * Math.PI / 180;
    return { x: cx + Math.cos(angle) * distance, y: cy + Math.sin(angle) * distance, angle };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    noiseRef.current = Array.from({ length: 90 }, () => ({
      angle: Math.random() * TAU,
      distance: 0.08 + Math.random() * 0.9,
      alpha: 0.08 + Math.random() * 0.2
    }));

    const resize = () => {
      const rect = parent.getBoundingClientRect();
      const size = Math.max(220, Math.min(rect.width, rect.height, 680));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(size * dpr);
      canvas.height = Math.floor(size * dpr);
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(parent);

    const render = (timestamp: number) => {
      const dt = lastTimeRef.current ? timestamp - lastTimeRef.current : 16;
      lastTimeRef.current = timestamp;
      const { targets: currentTargets, selectedId: currentSelected, scanRange: range, missionStatus: status } = propsRef.current;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const cx = width / 2;
      const cy = height / 2;
      const radius = Math.max(1, Math.min(cx, cy) * 0.82);
      const paused = status === MissionStatus.PAUSED || status === MissionStatus.IDLE;
      if (!paused) sweepRef.current = (sweepRef.current + SWEEP_SPEED * dt) % TAU;

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#010a13';
      ctx.fillRect(0, 0, width, height);

      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      bg.addColorStop(0, 'rgba(8, 58, 75, 0.24)');
      bg.addColorStop(0.7, 'rgba(2, 22, 34, 0.12)');
      bg.addColorStop(1, 'rgba(1, 8, 19, 0)');
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, TAU);
      ctx.fill();

      ctx.font = `${Math.max(8, width * 0.019)}px monospace`;
      ctx.textBaseline = 'middle';
      for (let ring = 1; ring <= 4; ring++) {
        const r = radius * ring / 4;
        ctx.strokeStyle = ring === 4 ? 'rgba(34, 211, 238, 0.32)' : 'rgba(34, 211, 238, 0.13)';
        ctx.lineWidth = ring === 4 ? 1.5 : 1;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, TAU);
        ctx.stroke();
        ctx.fillStyle = 'rgba(103, 232, 249, 0.52)';
        ctx.fillText(`${Math.round(range * ring / 4)}m`, cx + 5, cy - r + 10);
      }

      for (let deg = 0; deg < 360; deg += 15) {
        const angle = (deg - 90) * Math.PI / 180;
        const inner = deg % 30 === 0 ? radius * 0.94 : radius * 0.97;
        ctx.strokeStyle = deg % 30 === 0 ? 'rgba(34, 211, 238, 0.3)' : 'rgba(34, 211, 238, 0.14)';
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
        ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
        ctx.stroke();
        if (deg % 30 === 0) {
          ctx.fillStyle = 'rgba(165, 243, 252, 0.68)';
          ctx.textAlign = 'center';
          ctx.fillText(`${deg}°`, cx + Math.cos(angle) * (radius + 14), cy + Math.sin(angle) * (radius + 14));
        }
      }

      noiseRef.current.forEach(point => {
        const angle = point.angle - Math.PI / 2;
        const r = point.distance * radius;
        ctx.fillStyle = `rgba(103, 232, 249, ${point.alpha})`;
        ctx.fillRect(cx + Math.cos(angle) * r - 1, cy + Math.sin(angle) * r - 1, 2, 2);
      });

      const sweepAngle = sweepRef.current;
      const sweepDeg = Math.floor(sweepAngle * 180 / Math.PI) % 360;
      for (let d = 0; d < 360; d++) trailRef.current[d] *= Math.pow(0.965, dt / 16);
      for (let k = 0; k < 18; k++) {
        const d = (sweepDeg - k + 360) % 360;
        trailRef.current[d] = Math.max(trailRef.current[d], 1 - k / 18);
      }
      for (let d = 0; d < 360; d++) {
        const alpha = trailRef.current[d] * 0.16;
        if (alpha < 0.004) continue;
        const start = (d - 90.5) * Math.PI / 180;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, start, start + Math.PI / 180);
        ctx.closePath();
        ctx.fillStyle = `rgba(34, 211, 238, ${alpha})`;
        ctx.fill();
      }

      const sweepTheta = sweepAngle - Math.PI / 2;
      const gradient = ctx.createLinearGradient(cx, cy, cx + Math.cos(sweepTheta) * radius, cy + Math.sin(sweepTheta) * radius);
      gradient.addColorStop(0, 'rgba(165, 243, 252, 0.95)');
      gradient.addColorStop(0.35, 'rgba(34, 211, 238, 0.55)');
      gradient.addColorStop(1, 'rgba(34, 211, 238, 0)');
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(sweepTheta) * radius, cy + Math.sin(sweepTheta) * radius);
      ctx.stroke();

      currentTargets.forEach(target => {
        if (target.track_status !== 'active') return;
        const { x, y, angle } = targetPosition(target, cx, cy, radius, range);
        const bearingAngle = (target.bearing * Math.PI / 180) % TAU;
        let delta = Math.abs(((sweepAngle - bearingAngle + Math.PI) % TAU) - Math.PI);
        if (delta < 0.08) {
          ctx.strokeStyle = `rgba(251, 191, 36, ${0.5 + (0.08 - delta) * 5})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(x, y, 10 + (0.08 - delta) * 80, 0, TAU);
          ctx.stroke();
        }
        const selected = target.target_id === currentSelected;
        const pulse = 1 + Math.sin(timestamp / 250) * 0.16;
        ctx.shadowBlur = selected ? 22 : 14;
        ctx.shadowColor = selected ? '#fbbf24' : '#22d3ee';
        ctx.fillStyle = selected ? '#fbbf24' : '#22d3ee';
        ctx.beginPath();
        ctx.arc(x, y, (selected ? 5.5 : 4) * pulse, 0, TAU);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = selected ? 'rgba(251, 191, 36, 0.75)' : 'rgba(34, 211, 238, 0.45)';
        ctx.beginPath();
        ctx.arc(x, y, selected ? 13 : 8, 0, TAU);
        ctx.stroke();
        if (selected) {
          ctx.beginPath();
          ctx.moveTo(x - 18, y); ctx.lineTo(x + 18, y);
          ctx.moveTo(x, y - 18); ctx.lineTo(x, y + 18);
          ctx.stroke();
        }
        ctx.textAlign = 'left';
        ctx.fillStyle = selected ? '#fef08a' : 'rgba(165, 243, 252, 0.82)';
        ctx.font = `${Math.max(8, width * 0.02)}px monospace`;
        ctx.fillText(target.target_id, x + 12, y - 7);
        ctx.fillStyle = 'rgba(165, 243, 252, 0.55)';
        ctx.font = `${Math.max(7, width * 0.017)}px monospace`;
        ctx.fillText(`${target.distance.toFixed(1)}m / ${target.confidence.toFixed(2)}`, x + 12, y + 6);
      });

      ctx.fillStyle = '#67e8f9';
      ctx.beginPath();
      ctx.arc(cx, cy, 3.5, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(103, 232, 249, 0.4)';
      ctx.beginPath();
      ctx.arc(cx, cy, 8, 0, TAU);
      ctx.stroke();
      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [targetPosition]);

  const handleClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const radius = Math.min(cx, cy) * 0.82;
    const { targets: currentTargets, scanRange: range } = propsRef.current;
    let best: SonarTarget | null = null;
    let bestDistance = 24;
    currentTargets.forEach(target => {
      const point = targetPosition(target, cx, cy, radius, range);
      const distance = Math.hypot(x - point.x, y - point.y);
      if (distance < bestDistance) { bestDistance = distance; best = target; }
    });
    if (best) onSelect(best.target_id);
  }, [onSelect, targetPosition]);

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      className="cursor-crosshair"
      style={{ maxWidth: '100%', maxHeight: '100%' }}
      aria-label="SONAR radar display — SIMULATED DATA"
    />
  );
};

export default SonarRadar;
