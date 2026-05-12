"use client";

import React from "react";

export type NativeTransitionVariant = "full-intro" | "account-transition" | "micro-recovery";

interface NativeOnboardingOverlayProps {
  variant: NativeTransitionVariant;
  message: string;
  progress: number;
  showBrand: boolean;
  closing: boolean;
  accentPulse: boolean;
  isNative: boolean;
  scannerSafe?: boolean;
}

export function NativeOnboardingOverlay({
  variant,
  message,
  progress,
  showBrand,
  closing,
  accentPulse,
  isNative,
  scannerSafe = false,
}: NativeOnboardingOverlayProps) {
  const compact = variant === "micro-recovery";
  const variantClass =
    variant === "full-intro"
      ? "native-transition-full"
      : variant === "account-transition"
        ? "native-transition-account"
        : "native-transition-recovery";

  return (
    <div
      className={`native-transition ${variantClass}${isNative ? " native-transition-device-native" : " native-transition-device-web"}${closing ? " native-transition-closing" : ""}${compact ? " native-transition-compact" : ""}${scannerSafe ? " native-transition-scanner-safe" : ""}`}
      role="status"
      aria-live="polite"
    >
      {!compact && <div className="native-transition-bg" />}

      <div className="native-transition-stage">
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

        {variant !== "micro-recovery" && (
          <div className={`native-brand${showBrand ? " native-brand-show" : ""}`}>
            <div className="native-brand-logo">SOCIO</div>
            <div className="native-brand-sub">Campus Events, intentionally crafted.</div>
          </div>
        )}

        <div className="native-progress-wrap">
          {variant === "full-intro" && (
            <div className="native-progress-track">
              <div className="native-progress-fill" style={{ width: `${Math.max(6, Math.min(100, progress))}%` }} />
            </div>
          )}
          {variant === "account-transition" && (
            <div className="native-transition-pulse-track" aria-hidden="true">
              <span className="native-transition-pulse-dot" />
              <span className="native-transition-pulse-dot native-transition-pulse-dot-delay" />
              <span className="native-transition-pulse-dot native-transition-pulse-dot-delay-2" />
            </div>
          )}
          {variant === "micro-recovery" && (
            <div className="native-recovery-badge" aria-hidden="true">
              <span className="native-recovery-dot" />
              <span>SOCIO</span>
            </div>
          )}
          <p className="native-progress-message">{message}</p>
          {variant === "account-transition" && (
            <p className="native-transition-sub">Applying secure profile context…</p>
          )}
          {variant === "micro-recovery" && (
            <p className="native-transition-sub">Non-blocking recovery active</p>
          )}
          {variant === "full-intro" && showBrand && (
            <div className="native-progress-track native-progress-track-soft">
              <div className="native-progress-fill" style={{ width: "100%" }} />
            </div>
          )}
          {variant === "micro-recovery" && (
            <div className="native-progress-track native-progress-track-micro">
              <div className="native-progress-fill" style={{ width: "100%" }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function NativeMicroSplash({ isNative }: { isNative: boolean }) {
  return (
    <div className={`native-micro-splash${isNative ? " native-transition-device-native" : " native-transition-device-web"}`} aria-hidden="true">
      <div className="native-micro-logo-wrap">
        <svg viewBox="0 0 60 40" className="native-micro-rex" aria-hidden="true">
          <path
            className="native-micro-rex-line"
            d="M5 28 C6 20,12 14,20 12 C25 6,31 4,38 6 C44 8,49 13,52 19 C56 20,58 23,58 27 C56 31,52 34,46 34 C41 35,38 34,35 32 C30 36,24 37,20 35 C16 34,13 31,11 28 Z"
          />
        </svg>
        <div className="native-micro-logo">SOCIO</div>
      </div>
    </div>
  );
}
