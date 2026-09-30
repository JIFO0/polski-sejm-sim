import { useEffect, useRef } from "react";
import { PARTY_COLORS } from "@/data/parties";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  from: number;
  to: number;
  t: number;
  speed: number;
}

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ] as const;
}

const RGB = PARTY_COLORS.map(hexToRgb);
const FALLBACK = [148, 163, 184] as const;

/**
 * Tło: "polskie społeczeństwo" jako chmura punktów. Punkty rozstępują się
 * przed kursorem i przebarwiają na kolory partii w jego promieniu.
 */
export function ParticleField({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let particles: Particle[] = [];
    const pointer = { x: -9999, y: -9999, active: false };
    let raf = 0;

    const build = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const density = Math.round((width * height) / 3600);
      const count = Math.max(260, Math.min(1800, density));
      particles = Array.from({ length: count }, () => {
        const c = Math.floor(Math.random() * RGB.length);
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.12,
          vy: (Math.random() - 0.5) * 0.12,
          r: 1.25 + Math.random() * 2.25,
          from: c,
          to: c,
          t: 1,
          speed: 0.012 + Math.random() * 0.02,
        };
      });
    };

    const onPointer = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.active = true;
    };
    const onLeave = () => {
      pointer.active = false;
      pointer.x = -9999;
      pointer.y = -9999;
    };

    const radius = 210;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;
        if (p.y < -10) p.y = height + 10;
        if (p.y > height + 10) p.y = -10;

        let boost = 0;
        if (pointer.active) {
          const dx = p.x - pointer.x;
          const dy = p.y - pointer.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < radius * radius) {
            const d = Math.sqrt(d2) || 1;
            const force = (1 - d / radius) ** 2;
            boost = force;
            p.vx += (dx / d) * force * 0.55;
            p.vy += (dy / d) * force * 0.55;
            if (p.t >= 1 && Math.random() < 0.06 + force * 0.12) {
              p.from = p.to;
              p.to = Math.floor(Math.random() * RGB.length);
              p.t = 0;
            }
          }
        }

        p.vx *= 0.94;
        p.vy *= 0.94;
        const drift = 0.035;
        p.vx += (Math.random() - 0.5) * drift * 0.4;
        p.vy += (Math.random() - 0.5) * drift * 0.4;
        const sp = Math.hypot(p.vx, p.vy);
        if (sp > 2.4) {
          p.vx = (p.vx / sp) * 2.4;
          p.vy = (p.vy / sp) * 2.4;
        }

        if (p.t < 1) p.t = Math.min(1, p.t + p.speed);
        const a = RGB[p.from] ?? FALLBACK;
        const b = RGB[p.to] ?? FALLBACK;
        const t = p.t;
        const r = Math.round(a[0] + (b[0] - a[0]) * t);
        const g = Math.round(a[1] + (b[1] - a[1]) * t);
        const bl = Math.round(a[2] + (b[2] - a[2]) * t);
        const alpha = 0.32 + boost * 0.62;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r + boost * 1.6, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r}, ${g}, ${bl}, ${alpha})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };

    build();
    if (reduced) {
      ctx.clearRect(0, 0, width, height);
      for (const p of particles) {
        const c = RGB[p.to] ?? FALLBACK;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${c[0]}, ${c[1]}, ${c[2]}, 0.28)`;
        ctx.fill();
      }
    } else {
      raf = requestAnimationFrame(draw);
      window.addEventListener("pointermove", onPointer, { passive: true });
      window.addEventListener("pointerleave", onLeave);
    }

    const ro = new ResizeObserver(() => build());
    ro.observe(canvas);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("pointerleave", onLeave);
      ro.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
