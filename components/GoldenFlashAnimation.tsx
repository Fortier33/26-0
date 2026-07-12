"use client";

import { useEffect, useState } from "react";

const EMBER_COUNT = 65;

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

interface Ember {
  id: number;
  x: number;
  dy: number;
  dx: number;
  size: number;
  dur: number;
  delay: number;
  op: number;
}

export function GoldenFlashAnimation() {
  const [stage, setStage] = useState<"flash" | "embers" | "done">("flash");
  const [fadeOut, setFadeOut] = useState(false);

  const [embers] = useState<Ember[]>(() =>
    Array.from({ length: EMBER_COUNT }, (_, i) => ({
      id: i,
      x: rand(2, 98),
      dy: rand(120, 520),
      dx: rand(-90, 90),
      size: rand(3, 9),
      dur: rand(2200, 4200),
      delay: rand(0, 1400),
      op: rand(0.5, 1),
    }))
  );

  useEffect(() => {
    const t1 = setTimeout(() => setStage("embers"), 350);
    const t2 = setTimeout(() => setFadeOut(true), 4200);
    const t3 = setTimeout(() => setStage("done"), 5400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  if (stage === "done") return null;

  return (
    <>
      <style>{`
        @keyframes gf-flash {
          0%   { opacity: 0; }
          12%  { opacity: 0.9; }
          35%  { opacity: 0.45; }
          100% { opacity: 0; }
        }
        @keyframes gf-ember {
          0%   { transform: translate(0,0) scale(1);   opacity: var(--e-op); }
          65%  { opacity: var(--e-op); }
          100% { transform: translate(var(--e-dx), var(--e-dy)) scale(0.15); opacity: 0; }
        }
        @keyframes gf-letter {
          from { opacity: 0; transform: translateY(10px); filter: blur(6px); }
          to   { opacity: 1; transform: translateY(0);    filter: blur(0);   }
        }
        @keyframes gf-sub {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>

      <div
        className="fixed inset-0 z-50 pointer-events-none overflow-hidden"
        style={{
          opacity: fadeOut ? 0 : 1,
          transition: fadeOut ? "opacity 1.2s ease-in" : undefined,
        }}
      >
        {/* Radial gold flash */}
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse at 50% 55%, #FFE066 0%, #D4AF37 35%, #6B4F00 80%, #000 100%)",
          animation: "gf-flash 1.3s ease-out forwards",
        }} />

        {/* Ember particles */}
        {stage === "embers" && embers.map(e => (
          <div key={e.id} style={{
            position: "absolute",
            bottom: "18%",
            left: `${e.x}%`,
            width: e.size,
            height: e.size,
            borderRadius: "50%",
            background: "radial-gradient(circle, #FFF0A0 0%, #D4AF37 55%, #7A5800 100%)",
            boxShadow: `0 0 ${e.size * 2.5}px ${e.size * 1.2}px rgba(212,175,55,0.35)`,
            "--e-op": e.op,
            "--e-dx": `${e.dx}px`,
            "--e-dy": `-${e.dy}px`,
            animation: `gf-ember ${e.dur}ms ${e.delay}ms ease-out forwards`,
          } as React.CSSProperties} />
        ))}

        {/* CHAMPION text */}
        {stage === "embers" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <p style={{
              color: "rgba(212,175,55,0.55)",
              fontSize: "9px",
              fontWeight: 900,
              letterSpacing: "0.7em",
              textTransform: "uppercase",
              animation: "gf-sub 0.5s ease 0.8s forwards",
              opacity: 0,
            }}>
              Bouclier de Brennus
            </p>
            <div style={{ display: "flex" }}>
              {"CHAMPION".split("").map((letter, i) => (
                <span key={i} style={{
                  fontWeight: 900,
                  fontSize: "clamp(2.8rem, 13vw, 5.5rem)",
                  lineHeight: 1,
                  color: "#D4AF37",
                  animation: `gf-letter 0.45s ease ${0.9 + i * 0.065}s forwards`,
                  opacity: 0,
                  textShadow: "0 0 50px rgba(255,220,50,0.9), 0 0 100px rgba(212,175,55,0.5)",
                  display: "inline-block",
                }}>
                  {letter}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
