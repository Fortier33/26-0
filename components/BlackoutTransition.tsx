"use client";

import { useEffect, useRef, useState } from "react";

const CHARS = "PLAY-OFFS".split("");

interface Props {
  onReveal: () => void;
  onDone: () => void;
}

export function BlackoutTransition({ onReveal, onDone }: Props) {
  const [bgOpacity, setBgOpacity]       = useState(0);
  const [fadeOut, setFadeOut]           = useState(false);
  const [visibleCount, setVisibleCount] = useState(0);
  const [punchIdx, setPunchIdx]         = useState(-1);
  const [pulse, setPulse]               = useState(false);

  const onRevealRef = useRef(onReveal);
  const onDoneRef   = useRef(onDone);
  onRevealRef.current = onReveal;
  onDoneRef.current   = onDone;

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const at = (fn: () => void, ms: number) => {
      const t = setTimeout(fn, ms);
      timers.current.push(t);
    };

    // Phase 1 — fade to black (0 → 1 over 600ms)
    at(() => setBgOpacity(1), 30);

    // Phase 2 — letters punch in from 750ms, 105ms apart
    CHARS.forEach((_, i) => {
      at(() => { setVisibleCount(i + 1); setPunchIdx(i); }, 750 + i * 105);
      at(() => setPunchIdx(-1), 750 + i * 105 + 190);
    });
    // last letter lands at 750 + 8×105 = 1590ms

    // Phase 3 — pulse at 1820ms
    at(() => setPulse(true),  1820);
    at(() => setPulse(false), 2080);

    // Phase 4 — reveal playoffs behind overlay + start fade-out at 2150ms
    at(() => {
      onRevealRef.current();
      setFadeOut(true);
    }, 2150);

    // Phase 5 — cleanup after fade-out (550ms)
    at(() => onDoneRef.current(), 2700);

    return () => { timers.current.forEach(clearTimeout); };
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "#000",
        opacity: fadeOut ? 0 : bgOpacity,
        transition: fadeOut ? "opacity 0.55s ease" : "opacity 0.6s ease",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: fadeOut ? "none" : "all",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 3,
          transform: pulse ? "scale(1.07)" : "scale(1)",
          filter: pulse
            ? "drop-shadow(0 0 28px rgba(212,175,55,0.95)) drop-shadow(0 0 60px rgba(212,175,55,0.4))"
            : "drop-shadow(0 0 0px transparent)",
          transition: "transform 0.15s ease, filter 0.15s ease",
        }}
      >
        {CHARS.map((char, i) => (
          <span
            key={i}
            style={{
              display: "inline-block",
              fontSize: "clamp(38px, 9vw, 80px)",
              fontWeight: 900,
              fontFamily: "inherit",
              lineHeight: 1,
              textTransform: "uppercase",
              color: char === "-" ? "rgba(212,175,55,0.55)" : "#D4AF37",
              opacity: visibleCount > i ? 1 : 0,
              transform: punchIdx === i
                ? "scale(1.55) translateY(-5px)"
                : "scale(1) translateY(0)",
              transition:
                "transform 0.2s cubic-bezier(0.34,1.56,0.64,1), opacity 0.01s",
              textShadow:
                visibleCount > i
                  ? "0 0 20px rgba(212,175,55,0.75), 0 0 50px rgba(212,175,55,0.3)"
                  : "none",
            }}
          >
            {char}
          </span>
        ))}
      </div>
    </div>
  );
}
