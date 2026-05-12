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
        <div className={`native-fossil-scan-wrap${accentPulse ? " native-fossil-pulse" : ""}`}>
          <svg viewBox="0 0 360 220" className="native-fossil-svg" aria-hidden="true">
            {/* Concentric radar circles */}
            <circle className="native-radar-ring native-radar-ring-1" cx="180" cy="110" r="100" />
            <circle className="native-radar-ring native-radar-ring-2" cx="180" cy="110" r="70" />
            <circle className="native-radar-ring native-radar-ring-3" cx="180" cy="110" r="40" />
            
            {/* Crosshairs */}
            <line className="native-crosshair" x1="180" y1="0" x2="180" y2="220" />
            <line className="native-crosshair" x1="0" y1="110" x2="360" y2="110" />

            {/* Geometric Spinosaurus Silhouette */}
            <path
              className="native-fossil-path"
              d="M110 130 L130 100 L150 110 L160 80 L180 70 L200 80 L210 110 L230 100 L250 130 L220 150 L190 140 L170 140 L140 150 Z"
            />
            <path
              className="native-fossil-path native-fossil-delay"
              d="M180 70 L180 30 M160 80 L165 40 M200 80 L195 40 M140 90 L150 55 M220 90 L210 55"
            />
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
        <svg viewBox="0 0 60 40" className="native-micro-fossil" aria-hidden="true">
          <circle className="native-micro-radar" cx="30" cy="20" r="18" />
          <path
            className="native-micro-fossil-line"
            d="M20 25 L30 10 L40 25 L35 30 L25 30 Z"
          />
        </svg>
        <div className="native-micro-logo">SOCIO</div>
      </div>
    </div>
  );
}
