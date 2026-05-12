"use client";

import React from "react";

interface NativeOnboardingOverlayProps {
  message: string;
  progress: number;
  showBrand: boolean;
  closing: boolean;
  accentPulse: boolean;
}

export function NativeOnboardingOverlay({
  message,
  progress,
  showBrand,
  closing,
  accentPulse,
}: NativeOnboardingOverlayProps) {
  return (
    <div className={`native-onboarding${closing ? " native-onboarding-closing" : ""}`} role="status" aria-live="polite">
      <div className="native-onboarding-bg" />

      <div className="native-onboarding-stage">
        <div className={`native-sketch-wrap${accentPulse ? " native-sketch-pulse" : ""}`}>
          <svg viewBox="0 0 360 220" className="native-rex-svg" aria-hidden="true">
            <path
              className="native-sketch-line"
              d="M52 162 C50 140, 64 114, 90 99 C106 89, 133 78, 154 76 C163 58, 177 42, 201 39 C228 37, 251 50, 265 70 C286 71, 303 80, 315 94 C327 109, 331 129, 324 145 C320 153, 313 161, 304 167 C292 176, 276 182, 257 184 C243 186, 233 185, 221 181 C207 194, 193 205, 171 206 C152 206, 139 196, 130 182 C118 186, 104 188, 92 186 C74 182, 59 173, 52 162 Z"
            />
            <path
              className="native-sketch-line native-sketch-delay"
              d="M178 84 C185 88, 189 95, 188 103 C184 112, 173 115, 165 110 C158 104, 157 93, 163 87 C167 84, 173 82, 178 84 Z"
            />
            <path
              className="native-sketch-line native-sketch-delay-2"
              d="M130 175 C131 186, 126 196, 116 203 M229 174 C231 186, 227 196, 217 203 M104 131 C118 136, 129 145, 134 156 M250 131 C263 133, 275 141, 282 152"
            />
            <circle className="native-eye" cx="173" cy="98" r="2.5" />
            <line className="native-eye-blink" x1="168" y1="98" x2="178" y2="98" />
          </svg>
        </div>

        <div className={`native-brand${showBrand ? " native-brand-show" : ""}`}>
          <div className="native-brand-logo">SOCIO</div>
          <div className="native-brand-sub">Campus Events, intentionally crafted.</div>
        </div>

        <div className="native-progress-wrap">
          <div className="native-progress-track">
            <div className="native-progress-fill" style={{ width: `${Math.max(6, Math.min(100, progress))}%` }} />
          </div>
          <p className="native-progress-message">{message}</p>
        </div>
      </div>
    </div>
  );
}

export function NativeMicroSplash() {
  return (
    <div className="native-micro-splash" aria-hidden="true">
      <div className="native-micro-logo">SOCIO</div>
    </div>
  );
}
