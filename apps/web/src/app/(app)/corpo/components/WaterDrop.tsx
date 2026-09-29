"use client";

import { useEffect, useId, useRef } from "react";

const SHAPE = "M50 6 C60 24 92 52 92 84 C92 108 73 126 50 126 C27 126 8 108 8 84 C8 52 40 24 50 6 Z";
const PINGO = "M50 20 C50 20 44 28 44 32 A6 6 0 0 0 56 32 C56 28 50 20 50 20 Z";
const WAVE = "M0 8 Q12.5 0 25 8 T50 8 T75 8 T100 8 T125 8 T150 8 T175 8 T200 8 V200 H0 Z";
/** Quanto o pingo leva para "cair" na água: a onda sobe e as bolhas saem depois disso. */
const LAND_S = 0.38;
/** Posições fixas (não aleatórias): o SVG renderiza igual no servidor e no cliente. */
const BUBBLES = [
  { cx: 34, cy: 114, r: 2.5, delay: 0 },
  { cx: 58, cy: 118, r: 3.5, delay: 0.08 },
  { cx: 46, cy: 110, r: 1.8, delay: 0.16 },
  { cx: 66, cy: 112, r: 2.2, delay: 0.24 },
  { cx: 40, cy: 120, r: 3, delay: 0.32 },
];
const SQUISH: Keyframe[] = [
  { transform: "scale(1)" },
  { transform: "scale(1.06, 0.94)", offset: 0.4 },
  { transform: "scale(0.97, 1.03)", offset: 0.7 },
  { transform: "scale(1)" },
];

export type DropBurst = { id: number; kind: "add" | "remove" };

/** Gota da Hidratação: nível da água, onda contínua, anel do "segurar" e a reação a cada registro. */
export function WaterDrop({
  level,
  holding,
  ringMs,
  burst,
}: {
  /** 0–1, fração da meta. */
  level: number;
  holding: boolean;
  ringMs: number;
  burst: DropBurst | null;
}) {
  const uid = useId().replace(/:/g, "");
  const clipId = `drop-clip-${uid}`;
  const gradId = `drop-grad-${uid}`;
  const bodyRef = useRef<SVGGElement>(null);
  // Superfície da água no viewBox (topo da gota em ~6, fundo em ~126).
  const surface = 124 - level * 120;
  const landing = burst?.kind === "add" ? LAND_S : 0;

  // O corpo não pode remontar a cada registro: a água perderia a transição de nível.
  useEffect(() => {
    if (!burst || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    bodyRef.current?.animate(SQUISH, { duration: 350, delay: landing * 1000, easing: "ease" });
  }, [burst, landing]);

  return (
    <svg width="96" height="125" viewBox="0 0 100 130" overflow="visible" aria-hidden="true">
      <defs>
        <clipPath id={clipId}>
          <path d={SHAPE} />
        </clipPath>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#C9B7EC" />
          <stop offset="1" stopColor="#9C7FD0" />
        </linearGradient>
      </defs>

      <path
        d={SHAPE}
        fill="none"
        className="stroke-lilac"
        strokeWidth={5}
        strokeLinecap="round"
        pathLength={100}
        strokeDasharray={100}
        strokeDashoffset={holding ? 0 : 100}
        opacity={holding ? 1 : 0}
        transform="translate(50 70) scale(1.12) translate(-50 -70)"
        style={{ transition: `stroke-dashoffset ${holding ? ringMs : 0}ms linear` }}
      />

      <g ref={bodyRef} style={{ transformOrigin: "50px 120px" }}>
        <path d={SHAPE} className="fill-white/70" />
        <g clipPath={`url(#${clipId})`}>
          <g
            className="transition-transform duration-700 ease-[cubic-bezier(0.3,1.35,0.5,1)] motion-reduce:transition-none"
            style={{ transform: `translateY(${surface}px)`, transitionDelay: `${landing}s` }}
          >
            <path d={WAVE} fill="#D9CCF0" opacity={0.55} transform="translate(0 -4)" className="animate-wave-slow" />
            <path d={WAVE} fill={`url(#${gradId})`} className="animate-wave" />
          </g>
          {burst ? (
            <g key={burst.id}>
              <ellipse
                cx={50}
                cy={surface + 8}
                rx={28}
                ry={5}
                fill="none"
                stroke="#fff"
                strokeWidth={2}
                className="animate-ripple"
                style={{ transformOrigin: `50px ${surface + 8}px`, animationDelay: `${landing}s`, opacity: 0 }}
              />
              {burst.kind === "add"
                ? BUBBLES.map((b) => (
                    <circle
                      key={b.cx}
                      cx={b.cx}
                      cy={b.cy}
                      r={b.r}
                      fill="#fff"
                      className="animate-bubble"
                      style={{ animationDelay: `${landing + b.delay}s`, opacity: 0 }}
                    />
                  ))
                : null}
            </g>
          ) : null}
        </g>
        {/* reflexo de luz */}
        <path d="M30 60 C32 46 40 34 46 26" fill="none" stroke="#fff" strokeWidth={5} strokeLinecap="round" opacity={0.85} />
        <circle cx={27} cy={72} r={3} fill="#fff" opacity={0.8} />
      </g>

      {burst ? (
        <path
          key={`pingo-${burst.id}`}
          d={PINGO}
          className={`fill-lilac motion-reduce:hidden ${burst.kind === "add" ? "animate-drop-fall" : "animate-drop-rise"}`}
          style={{ opacity: 0, animationDelay: burst.kind === "remove" ? "0.15s" : undefined }}
        />
      ) : null}
    </svg>
  );
}
