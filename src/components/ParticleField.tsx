import { useEffect, useRef } from "react";
import { PARTY_COLORS } from "@/data/parties";

interface Particle {
  originX: number;
  originY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  from: number;
  to: number;
  t: number;
  partyColor: number;
  colorHold: number;
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
const DOT = 1.45;

function neutralRgb() {
  const dark = document.documentElement.classList.contains("dark");
  return dark ? ([186, 198, 216] as const) : ([148, 163, 184] as const);
}

/**
 * Tło: równa siatka kropek tej samej wielkości.
 * Kolor partii pojawia się tylko na chwilę przy kursorze, potem wraca do szarości.
 */
export function ParticleField({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      document.documentElement.dataset["reduceMotion"] === "true";
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

      const spacing = width < 640 ? 18 : 22;
      const cols = Math.max(1, Math.floor(width / spacing));
      const rows = Math.max(1, Math.floor(height / spacing));
      const offsetX = (width - (cols - 1) * spacing) / 2;
      const offsetY = (height - (rows - 1) * spacing) / 2;
      particles = [];
      let index = 0;
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const ox = offsetX + col * spacing;
          const oy = offsetY + row * spacing;
          particles.push({
            originX: ox,
            originY: oy,
            x: ox,
            y: oy,
            vx: 0,
            vy: 0,
            from: -1,
            to: -1,
            t: 1,
            partyColor: index % RGB.length,
            colorHold: 0,
          });
          index += 1;
        }
      }
    };

    const paintDot = (x: number, y: number, from: number, to: number, t: number, alpha: number) => {
      const neutral = neutralRgb();
      const a = from === -1 ? neutral : (RGB[from] ?? neutral);
      const b = to === -1 ? neutral : (RGB[to] ?? neutral);
      const r = Math.round(a[0] + (b[0] - a[0]) * t);
      const g = Math.round(a[1] + (b[1] - a[1]) * t);
      const bl = Math.round(a[2] + (b[2] - a[2]) * t);
      ctx.beginPath();
      ctx.arc(x, y, DOT, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r}, ${g}, ${bl}, ${alpha})`;
      ctx.fill();
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

    const radius = 150;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      for (const p of particles) {
        let near = 0;
        if (pointer.active) {
          const dx = p.x - pointer.x;
          const dy = p.y - pointer.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < radius * radius) {
            const d = Math.sqrt(d2) || 1;
            const force = (1 - d / radius) ** 2;
            near = force;
            p.vx += (dx / d) * force * 0.28;
            p.vy += (dy / d) * force * 0.28;
            if (force > 0.12) {
              if (p.to !== p.partyColor) {
                p.from = p.to;
                p.to = p.partyColor;
                p.t = 0;
              }
              p.colorHold = 28;
            }
          }
        }

        const homeDx = p.originX - p.x;
        const homeDy = p.originY - p.y;
        p.vx += homeDx * 0.085;
        p.vy += homeDy * 0.085;
        p.vx *= 0.78;
        p.vy *= 0.78;
        p.x += p.vx;
        p.y += p.vy;

        if (p.t < 1) p.t = Math.min(1, p.t + 0.08);
        if (p.colorHold > 0) p.colorHold -= 1;
        if (p.colorHold <= 0 && p.to !== -1 && p.t >= 1) {
          p.from = p.to;
          p.to = -1;
          p.t = 0;
        }

        const colored = p.to !== -1 || p.from !== -1;
        const alpha = (colored ? 0.72 : 0.38) + near * 0.2;
        paintDot(p.x, p.y, p.from, p.to, p.t, alpha);
      }
      raf = requestAnimationFrame(draw);
    };

    build();
    if (reduced) {
      ctx.clearRect(0, 0, width, height);
      const neutral = neutralRgb();
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.originX, p.originY, DOT, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${neutral[0]}, ${neutral[1]}, ${neutral[2]}, 0.4)`;
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
