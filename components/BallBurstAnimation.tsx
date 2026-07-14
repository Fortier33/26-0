"use client";

import { useEffect, useState } from "react";

const PARTICLE_COUNT = 22;

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

interface Particle {
  id: number;
  angle: number;
  distance: number;
  rotation: number;
  size: number;
  delay: number;
}

export function BallBurstAnimation() {
  const [stage, setStage] = useState<"entering" | "bursting" | "gone">("entering");
  const [burst, setBurst] = useState(false);

  const [particles] = useState<Particle[]>(() =>
    Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      id: i,
      angle: (360 / PARTICLE_COUNT) * i + rand(-10, 10),
      distance: rand(80, 270),
      rotation: rand(-600, 600),
      size: rand(0.9, 2.0),
      delay: rand(0, 0.06),
    }))
  );

  useEffect(() => {
    const t1 = setTimeout(() => setStage("bursting"), 1100);
    const t2 = setTimeout(() => setBurst(true), 1160);
    const t3 = setTimeout(() => setStage("gone"), 2900);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  if (stage === "gone") return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center overflow-hidden">

      {/* Main ball: drops from above with bounce, then pops */}
      <div
        style={{
          fontSize: "5rem",
          lineHeight: 1,
          willChange: "transform, opacity",
          animation: stage === "entering"
            ? "ballDrop 1.1s cubic-bezier(0.22, 1, 0.36, 1) forwards"
            : undefined,
          transform: stage === "bursting" ? "scale(1.5)" : undefined,
          opacity: stage === "bursting" ? 0 : undefined,
          transition: stage === "bursting"
            ? "transform 0.13s ease-in, opacity 0.13s ease-in"
            : undefined,
        }}
      >
        🏉
      </div>

      {/* Particles: burst outward and fade */}
      {stage === "bursting" && particles.map((p) => {
        const rad = (p.angle * Math.PI) / 180;
        const tx = burst ? Math.cos(rad) * p.distance : 0;
        const ty = burst ? Math.sin(rad) * p.distance : 0;
        return (
          <div
            key={p.id}
            style={{
              position: "absolute",
              fontSize: `${p.size}rem`,
              lineHeight: 1,
              opacity: burst ? 0 : 1,
              transform: `translate(${tx}px, ${ty}px) rotate(${burst ? p.rotation : 0}deg)`,
              transition: [
                `transform 1.5s cubic-bezier(0.15, 0.8, 0.4, 1) ${p.delay}s`,
                `opacity 1.4s ease-out ${0.08 + p.delay}s`,
              ].join(", "),
              willChange: "transform, opacity",
            }}
          >
            🏉
          </div>
        );
      })}
    </div>
  );
}
