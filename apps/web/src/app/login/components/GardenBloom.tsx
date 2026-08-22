const LEAF_PATH = "M0 0 C5 -7 14 -7 17 0 C14 7 5 7 0 0 Z";

const LEAF_ORIGIN = {
  transformBox: "fill-box",
  transformOrigin: "0% 50%",
} as const;
const BLOOM_ORIGIN = {
  transformBox: "fill-box",
  transformOrigin: "50% 50%",
} as const;

const PETALS: [number, number, number, number][] = [
  [0, -10, 6.5, 9],
  [9, -3, 9, 6.5],
  [5.5, 8, 7.5, 8.5],
  [-5.5, 8, 7.5, 8.5],
  [-9, -3, 9, 6.5],
];

type Stem = {
  d: string;
  color: string;
  width: number;
  dur: number;
  delay: number;
};
type Leaf = {
  x: number;
  y: number;
  rot: number;
  scale: number;
  color: string;
  delay: number;
};
type Flower = {
  x: number;
  y: number;
  scale: number;
  color: string;
  delay: number;
};

const STEMS: Stem[] = [
  {
    d: "M 13 185 C 8 158, 18 134, 26 107",
    color: "#7FC4A0",
    width: 2.8,
    dur: 0.89,
    delay: 0.26,
  },
  {
    d: "M 56 185 C 58 136, 54 94, 60 45",
    color: "#A8D5BA",
    width: 3.1,
    dur: 1.3,
    delay: 0.45,
  },
  {
    d: "M 96 185 C 97 148, 95 117, 98 80",
    color: "#8FCCA9",
    width: 2.9,
    dur: 1.07,
    delay: 0.47,
  },
  {
    d: "M 140 185 C 145 157, 146 133, 153 105",
    color: "#7FC4A0",
    width: 1.9,
    dur: 0.9,
    delay: 0.59,
  },
  {
    d: "M 170 185 C 171 139, 170 100, 173 54",
    color: "#A8D5BA",
    width: 3.1,
    dur: 1.24,
    delay: 0.58,
  },
  {
    d: "M 216 185 C 213 132, 217 86, 208 33",
    color: "#8FCCA9",
    width: 2.9,
    dur: 1.38,
    delay: 0.7,
  },
  {
    d: "M 239 185 C 239 142, 243 105, 239 62",
    color: "#7FC4A0",
    width: 3,
    dur: 1.19,
    delay: 0.71,
  },
  {
    d: "M 276 185 C 278 152, 275 124, 280 91",
    color: "#A8D5BA",
    width: 2.3,
    dur: 0.99,
    delay: 0.88,
  },
  {
    d: "M 319 185 C 321 150, 321 119, 324 84",
    color: "#8FCCA9",
    width: 2.5,
    dur: 1.05,
    delay: 0.95,
  },
];

const LEAVES: Leaf[] = [
  { x: 11, y: 165, rot: -20, scale: 0.64, color: "#7FC4A0", delay: 0.47 },
  { x: 10, y: 150, rot: 173, scale: 0.93, color: "#A8D5BA", delay: 0.62 },
  { x: 8, y: 136, rot: -59, scale: 0.95, color: "#8FCCA9", delay: 0.77 },
  { x: 57, y: 148, rot: -38, scale: 0.83, color: "#A8D5BA", delay: 0.76 },
  { x: 97, y: 158, rot: -25, scale: 0.65, color: "#8FCCA9", delay: 0.72 },
  { x: 142, y: 164, rot: -24, scale: 0.7, color: "#7FC4A0", delay: 0.8 },
  { x: 144, y: 149, rot: 176, scale: 0.76, color: "#A8D5BA", delay: 0.95 },
  { x: 145, y: 135, rot: -39, scale: 0.55, color: "#8FCCA9", delay: 1.11 },
  { x: 171, y: 151, rot: -38, scale: 0.61, color: "#A8D5BA", delay: 0.87 },
  { x: 171, y: 114, rot: 165, scale: 0.57, color: "#8FCCA9", delay: 1.18 },
  { x: 215, y: 145, rot: -57, scale: 0.84, color: "#8FCCA9", delay: 1.02 },
  { x: 239, y: 153, rot: -52, scale: 0.88, color: "#7FC4A0", delay: 0.99 },
  { x: 277, y: 161, rot: -33, scale: 0.93, color: "#A8D5BA", delay: 1.11 },
  { x: 277, y: 134, rot: 187, scale: 0.57, color: "#8FCCA9", delay: 1.36 },
  { x: 320, y: 159, rot: -30, scale: 0.85, color: "#8FCCA9", delay: 1.19 },
  { x: 320, y: 140, rot: 185, scale: 0.75, color: "#7FC4A0", delay: 1.37 },
  { x: 321, y: 121, rot: -32, scale: 0.68, color: "#A8D5BA", delay: 1.54 },
];

const FLOWERS: Flower[] = [
  { x: 26, y: 107, scale: 1.17, color: "#F3B6D0", delay: 1.15 },
  { x: 60, y: 45, scale: 0.88, color: "#E8A8C6", delay: 1.75 },
  { x: 98, y: 80, scale: 1.02, color: "#F3B6D0", delay: 1.54 },
  { x: 153, y: 105, scale: 1.12, color: "#F3B6D0", delay: 1.49 },
  { x: 173, y: 54, scale: 1.04, color: "#E8A8C6", delay: 1.82 },
  { x: 208, y: 33, scale: 1.09, color: "#F3B6D0", delay: 2.07 },
  { x: 239, y: 62, scale: 0.97, color: "#E8A8C6", delay: 1.9 },
  { x: 280, y: 91, scale: 0.94, color: "#E8A8C6", delay: 1.87 },
  { x: 324, y: 84, scale: 0.76, color: "#F3B6D0", delay: 1.99 },
];

export function GardenBloom() {
  return (
    <svg viewBox="0 0 342 185" className="h-auto w-full" aria-hidden="true">
      {STEMS.map((s) => (
        <path
          key={s.d}
          className="animate-grow-stem"
          d={s.d}
          pathLength={1}
          fill="none"
          stroke={s.color}
          strokeWidth={s.width}
          strokeLinecap="round"
          strokeDasharray={1}
          style={{
            animationDuration: `${s.dur}s`,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}

      {LEAVES.map((l, i) => (
        <g
          key={`leaf-${i}`}
          transform={`translate(${l.x} ${l.y}) rotate(${l.rot}) scale(${l.scale})`}
        >
          <path
            className="animate-bloom-pop"
            d={LEAF_PATH}
            fill={l.color}
            style={{ ...LEAF_ORIGIN, animationDelay: `${l.delay}s` }}
          />
        </g>
      ))}

      {FLOWERS.map((f, i) => (
        <g
          key={`flower-${i}`}
          transform={`translate(${f.x} ${f.y}) scale(${f.scale})`}
        >
          {PETALS.map(([cx, cy, rx, ry], p) => (
            <ellipse
              key={p}
              className="animate-bloom-pop"
              cx={cx}
              cy={cy}
              rx={rx}
              ry={ry}
              fill={f.color}
              style={{
                ...BLOOM_ORIGIN,
                animationDelay: `${(f.delay + p * 0.07).toFixed(2)}s`,
              }}
            />
          ))}
          <circle
            className="animate-bloom-pop"
            cx={0}
            cy={0}
            r={4}
            fill="#E08AB0"
            style={{
              ...BLOOM_ORIGIN,
              animationDelay: `${(f.delay + 0.42).toFixed(2)}s`,
            }}
          />
        </g>
      ))}
    </svg>
  );
}
