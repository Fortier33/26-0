"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  label: string;
  color?: string; // accent color, defaults to gold
  onReveal: () => void;
  onDone: () => void;
}

export function ScreenTransition({ label, color = "#D4AF37", onReveal, onDone }: Props) {
  const [bgOpacity, setBgOpacity] = useState(0);
  const [fadeOut, setFadeOut]     = useState(false);
  const [visibleCount, setVisibleCount] = useState(0);
  const [punchIdx, setPunchIdx]   = useState(-1);
  const [pulse, setPulse]         = useState(false);

  const onRevealRef = useRef(onReveal);
  const onDoneRef   = useRef(onDone);
  onRevealRef.current = onReveal;
  onDoneRef.current   = onDone;

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const chars = label.split("");
    const perLetterDelay = 88;
    const startLetters   = 700;
    const lastAt         = startLetters + (chars.length - 1) * perLetterDelay;
    const pulseStart     = lastAt + 220;
    const revealAt       = pulseStart + 260;
    const doneAt         = revealAt + 600;

    const at = (fn: () => void, ms: number) => {
      const t = setTimeout(fn, ms);
      timers.current.push(t);
    };

    at(() => setBgOpacity(1), 30);

    chars.forEach((_, i) => {
      at(() => { setVisibleCount(i + 1); setPunchIdx(i); }, startLetters + i * perLetterDelay);
      at(() => setPunchIdx(-1), startLetters + i * perLetterDelay + 180);
    });

    at(() => setPulse(true),  pulseStart);
    at(() => setPulse(false), pulseStart + 250);
    at(() => { onRevealRef.current(); setFadeOut(true); }, revealAt);
    at(() => onDoneRef.current(), doneAt);

    return () => { timers.current.forEach(clearTimeout); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chars = label.split("");
  const nonSpaceLen = chars.filter(c => c !== " ").length;
  const fontSize =
    nonSpaceLen <= 6  ? "clamp(44px, 10vw, 88px)"  :
    nonSpaceLen <= 9  ? "clamp(36px, 8.5vw, 76px)"  :
    nonSpaceLen <= 12 ? "clamp(26px, 6vw, 58px)"    :
                        "clamp(20px, 4.5vw, 46px)";

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
            ? `drop-shadow(0 0 28px ${color}CC) drop-shadow(0 0 60px ${color}55)`
            : "drop-shadow(0 0 0px transparent)",
          transition: "transform 0.15s ease, filter 0.15s ease",
        }}
      >
        {chars.map((char, i) =>
          char === " " ? (
            <span key={i} style={{ display: "inline-block", width: "0.5em" }} />
          ) : (
            <span
              key={i}
              style={{
                display: "inline-block",
                fontSize,
                fontWeight: 900,
                fontFamily: "inherit",
                lineHeight: 1,
                textTransform: "uppercase",
                color: char === "-" ? `${color}66` : color,
                opacity: visibleCount > i ? 1 : 0,
                transform: punchIdx === i
                  ? "scale(1.55) translateY(-5px)"
                  : "scale(1) translateY(0)",
                transition: "transform 0.2s cubic-bezier(0.34,1.56,0.64,1), opacity 0.01s",
                textShadow: visibleCount > i
                  ? `0 0 20px ${color}BB, 0 0 50px ${color}44`
                  : "none",
              }}
            >
              {char}
            </span>
          )
        )}
      </div>
    </div>
  );
}
