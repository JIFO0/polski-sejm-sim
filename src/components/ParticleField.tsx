import { useEffect, useRef } from "react";
import { PARTY_COLORS } from "@/data/parties";

interface Particle {
  originX: number;
  originY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  from: number;
  to: number;
  t: number;
  speed: number;
  phase: number;
  colorHold: number;
  partyColor: number;
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
 * Tło: "polskie społeczeństwo" jako chmura punktów. Punkty delikatnie
 * rozstępują się przed kursorem i płynnie wracają na swoje miejsce (spring physics).
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

      const density = Math.round((width * height) / 2200);
      const count = Math.max(420, Math.min(1500, density));
      particles = Array.from({ length: count }, (_, index) => {
        const ox = Math.random() * width;
        const oy = Math.random() * height;
        return {
          originX: ox,
          originY: oy,
          x: ox,
          y: oy,
          vx: 0,
          vy: 0,
          r: 1.1 + Math.random() * 1.5,
          from: -1,
          to: -1,
          t: 1,
          speed: 0.003 + Math.random() * 0.005,
          phase: Math.random() * Math.PI * 2,
          colorHold: 160 + Math.random() * 500,
          partyColor: index % RGB.length,
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

    const radius = 175;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      for (const p of particles) {
        let boost = 0;

        // Odpychanie od kursora
        if (pointer.active) {
          const dx = p.x - pointer.x;
          const dy = p.y - pointer.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < radius * radius) {
            const d = Math.sqrt(d2) || 1;
            const force = (1 - d / radius) ** 2;
            boost = force;
            // Impuls odpychający
            p.vx += (dx / d) * force * 0.65;
            p.vy += (dy / d) * force * 0.65;

            if (force > 0.04 && p.to === -1) {
              p.from = p.to;
              p.to = p.partyColor;
              p.t = 0;
              p.colorHold = 80 + Math.random() * 120;
            }
          }
        }

        // Siła sprężystości ściągająca punkt z powrotem na pozycję wyjściową (origin)
        const homeDx = p.originX - p.x;
        const homeDy = p.originY - p.y;
        p.vx += homeDx * 0.022;
        p.vy += homeDy * 0.022;

        // Tłumienie prędkości (damping)
        p.vx *= 0.89;
        p.vy *= 0.89;

        p.phase += 0.004;
        p.vx += Math.cos(p.phase) * 0.0025;
        p.vy += Math.sin(p.phase * 0.83) * 0.0025;

        p.x += p.vx;
        p.y += p.vy;

        if (p.t < 1) p.t = Math.min(1, p.t + p.speed);
        p.colorHold -= 1;
        if (p.colorHold <= 0 && p.t >= 1) {
          p.from = p.to;
          p.to = p.to === -1 ? Math.floor(Math.random() * RGB.length) : -1;
          p.t = 0;
          p.colorHold = p.to === -1 ? 220 + Math.random() * 620 : 90 + Math.random() * 220;
        }
        const a = p.from === -1 ? FALLBACK : (RGB[p.from] ?? FALLBACK);
        const b = p.to === -1 ? FALLBACK : (RGB[p.to] ?? FALLBACK);
        const t = p.t;
        const r = Math.round(a[0] + (b[0] - a[0]) * t);
        const g = Math.round(a[1] + (b[1] - a[1]) * t);
        const bl = Math.round(a[2] + (b[2] - a[2]) * t);

        const colored = p.to !== -1 || p.from !== -1;
        const alpha = (colored ? 0.34 : 0.22) + boost * 0.18;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r + boost * 0.9, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r}, ${g}, ${bl}, ${alpha})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };

    build();
    if (reduced) {
      ctx.clearRect(0, 0, width, height);
      for (const p of particles) {
        const c = p.to === -1 ? FALLBACK : (RGB[p.to] ?? FALLBACK);
        ctx.beginPath();
        ctx.arc(p.originX, p.originY, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${c[0]}, ${c[1]}, ${c[2]}, 0.22)`;
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

  return <canvas ref={canvasRef} className={className} aria-hidden="true" data-particle-field />;
}
