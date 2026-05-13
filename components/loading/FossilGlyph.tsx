"use client";

import React from "react";

export type FossilGlyphMode = "active" | "done";

interface FossilGlyphProps {
  mode?: FossilGlyphMode;
  scannerSafe?: boolean;
}

interface BoneSpec {
  d: string;
  len: number;
  delay: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
}

const BONES: BoneSpec[] = [
  // 1. Skull & Upper Spine (Geometric head to shoulders)
  {
    d: "M 36 94 L 70 90 L 92 84 L 140 84",
    len: 120,
    delay: 0,
  },
  // 2. Lower Jaw & Neck
  {
    d: "M 40 102 L 72 100 L 98 110 L 150 108",
    len: 120,
    delay: 1,
  },
  // 3. The Great Sail (Sweeping outer curve)
  {
    d: "M 140 84 C 160 30, 220 30, 240 84",
    len: 160,
    delay: 2,
  },
  // 4. Sail Ribs (Vertical struts)
  {
    d: "M 155 84 L 155 49 M 175 84 L 175 36 M 195 84 L 195 34 M 215 84 L 215 44",
    len: 180,
    delay: 3,
  },
  // 5. Upper Tail (Smooth taper)
  {
    d: "M 240 84 C 275 88, 310 96, 340 104",
    len: 110,
    delay: 4,
  },
  // 6. Belly & Lower Tail (Continuous bottom line)
  {
    d: "M 150 108 C 180 124, 220 124, 245 108 C 275 118, 310 116, 340 104",
    len: 200,
    delay: 5,
  },
  // 7. Front Arm (Angular geometric)
  {
    d: "M 150 108 L 158 135 L 148 152 L 156 152",
    len: 70,
    delay: 6,
  },
  // 8. Rear Leg (Digitigrade angular)
  {
    d: "M 245 106 L 232 136 L 246 162 L 264 162",
    len: 100,
    delay: 7,
  },
];

const PARTICLES: { cx: number; cy: number; r: number; delay: 1 | 2 | 3 | 4 | 5 | 6 }[] = [
  { cx: 34, cy: 28, r: 1.6, delay: 1 },
  { cx: 308, cy: 38, r: 1.8, delay: 2 },
  { cx: 56, cy: 168, r: 1.4, delay: 3 },
  { cx: 300, cy: 168, r: 1.6, delay: 4 },
  { cx: 180, cy: 22, r: 1.2, delay: 5 },
  { cx: 26, cy: 96, r: 1.2, delay: 6 },
];

export function FossilGlyph({ mode = "active", scannerSafe = false }: FossilGlyphProps) {
  return (
    <div className="bp-glyph" aria-hidden="true">
      <svg
        viewBox="0 0 360 200"
        className="bp-glyph-svg"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <pattern id="bp-dot-grid" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.6" className="bp-grid-bg" />
          </pattern>
          <radialGradient id="bp-glow-gradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#22B8FF" stopOpacity="0.55" />
            <stop offset="60%" stopColor="#22B8FF" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#22B8FF" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="bp-sweep-halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#22B8FF" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#22B8FF" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Grid background */}
        <rect x="0" y="0" width="360" height="200" fill="url(#bp-dot-grid)" />

        {/* Soft cyan underglow */}
        <ellipse
          className="bp-glow"
          cx="180"
          cy="120"
          rx="150"
          ry="34"
          fill="url(#bp-glow-gradient)"
        />

        {/* Skeleton bones */}
        <g className="bp-skeleton">
          {BONES.map((bone, idx) => (
            <path
              key={idx}
              className={`bp-bone bp-bone-d${bone.delay}`}
              d={bone.d}
              style={{ ["--bp-bone-len" as never]: bone.len } as React.CSSProperties}
            />
          ))}
          {/* Eye */}
          <circle className="bp-eye" cx="80" cy="88" r="1.6" />
          {/* Front knee + rear knee joints */}
          <circle className="bp-joint" cx="158" cy="135" r="1.4" />
          <circle className="bp-joint" cx="232" cy="136" r="1.4" />
        </g>

        {/* Floating blueprint particles */}
        <g>
          {PARTICLES.map((p, idx) => (
            <circle
              key={idx}
              className={`bp-particle bp-particle-d${p.delay}`}
              cx={p.cx}
              cy={p.cy}
              r={p.r}
            />
          ))}
        </g>

        {/* Horizontal scan sweep + glowing dot */}
        <g className="bp-sweep-group">
          <line className="bp-sweep-line" x1="0" y1="120" x2="360" y2="120" />
          <circle className="bp-sweep-halo" cx="360" cy="120" r="9" fill="url(#bp-sweep-halo)" />
          <circle className="bp-sweep-dot" cx="360" cy="120" r="3.5" />
        </g>

        {/* Success accent (kept subtle) */}
        {mode === "done" && (
          <circle cx="180" cy="120" r="22" fill="none" stroke="#10B981" strokeWidth="1.4" />
        )}

        {/* Scanner-safe hint (hidden visually; class on root handles motion gates) */}
        {scannerSafe && <desc>scanner-safe</desc>}
      </svg>
    </div>
  );
}
