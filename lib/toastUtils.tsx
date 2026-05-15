import React from "react";
import toast, { Toast } from "react-hot-toast";
import { Capacitor } from "@capacitor/core";
import { CheckIcon, AlertTriangleIcon, XIcon, InfoIcon } from "lucide-react";

export type ToastOptions = {
  title: string;
  message?: string;
};

// Easing for smooth animations
const TOAST_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";

// Inject global styles for mobile toast container positioning
if (typeof window !== "undefined") {
  const style = document.createElement('style');
  style.innerHTML = `
    @media (max-width: 768px) {
      div[style*="z-index: 9999"] {
        top: calc(env(safe-area-inset-top) + 78px) !important;
      }
    }
  `;
  document.head.appendChild(style);
}

// Check if we are on mobile/PWA
const isMobileOrPwa = () => {
  if (typeof window === "undefined") return false;
  return Capacitor.isNativePlatform() || window.innerWidth < 768;
};

// ── Mobile Toast Component ──
const MobileToastContent = ({
  t,
  type,
  title,
  message,
}: {
  t: Toast;
  type: "success" | "warning" | "error" | "info";
  title: string;
  message?: string;
}) => {
  // Styles based on type
  let bgClass = "";
  let borderClass = "";
  let titleClass = "";
  let messageClass = "";
  let iconCircleClass = "";
  let closeBtnClass = "";
  let IconComponent = CheckIcon;

  switch (type) {
    case "success":
      bgClass = "bg-gradient-to-br from-[#011F7B] to-[#022B9A]";
      borderClass = "border-transparent";
      titleClass = "text-white";
      messageClass = "text-white/80";
      iconCircleClass = "bg-[#10B981] text-white";
      closeBtnClass = "text-white/80 hover:text-white";
      IconComponent = CheckIcon;
      break;
    case "warning":
      bgClass = "bg-[#FFF9EC]";
      borderClass = "border-[rgba(245,158,11,0.18)]";
      titleClass = "text-[#0F172A]";
      messageClass = "text-[#64748B]";
      iconCircleClass = "bg-[#F59E0B] text-white";
      closeBtnClass = "text-[#64748B] hover:text-[#0F172A]";
      IconComponent = AlertTriangleIcon;
      break;
    case "error":
      bgClass = "bg-[#FFF4F4]";
      borderClass = "border-[rgba(239,68,68,0.18)]";
      titleClass = "text-[#0F172A]";
      messageClass = "text-[#64748B]";
      iconCircleClass = "bg-[#EF4444] text-white";
      closeBtnClass = "text-[#64748B] hover:text-[#0F172A]";
      IconComponent = XIcon;
      break;
    case "info":
      bgClass = "bg-[#F4F7FF]";
      borderClass = "border-[rgba(37,99,235,0.16)]";
      titleClass = "text-[#0F172A]";
      messageClass = "text-[#64748B]";
      iconCircleClass = "bg-[#2563EB] text-white";
      closeBtnClass = "text-[#64748B] hover:text-[#0F172A]";
      IconComponent = InfoIcon;
      break;
  }

  // Animation states based on react-hot-toast 't.visible'
  // react-hot-toast automatically adds/removes to stack, we just animate entering/leaving.
  const animationStyle = {
    opacity: t.visible ? 1 : 0,
    transform: t.visible ? "translateY(0)" : "translateY(-16px)",
    transition: `all 180ms ${TOAST_EASING}`,
  };

  return (
    <div
      className={`flex items-start justify-between w-full max-w-[420px] rounded-[18px] p-[14px_16px] min-h-[64px] shadow-[0_10px_28px_rgba(15,23,42,0.16)] border ${bgClass} ${borderClass}`}
      style={{
        width: "calc(100vw - 32px)",
        pointerEvents: "auto",
        ...animationStyle,
      }}
    >
      <div className="flex gap-3 min-w-0 flex-1">
        {/* Icon Circle */}
        <div
          className={`shrink-0 w-[20px] h-[20px] rounded-full flex items-center justify-center mt-0.5 ${iconCircleClass}`}
        >
          <IconComponent size={12} strokeWidth={3} />
        </div>

        {/* Content */}
        <div className="flex flex-col min-w-0 flex-1">
          <h4 className={`text-[15px] font-semibold tracking-tight m-0 leading-snug truncate ${titleClass}`}>
            {title}
          </h4>
          {message && (
            <p className={`text-[13px] font-normal m-0 mt-0.5 leading-snug line-clamp-2 ${messageClass}`}>
              {message}
            </p>
          )}
        </div>
      </div>

      {/* Dismiss Button */}
      <button
        onClick={() => toast.dismiss(t.id)}
        className={`shrink-0 p-1 -mt-1 -mr-1 rounded-full transition-colors active:scale-95 ${closeBtnClass}`}
        aria-label="Dismiss notification"
      >
        <XIcon size={16} strokeWidth={2} />
      </button>
    </div>
  );
};

// ── Shared Wrapper to handle Custom Positioning for Mobile ──
// We wrap the custom component in a container that adjusts positioning.
// However, react-hot-toast's Toaster already handles stacking. 
// We will just return the mobile toast content.
const renderMobileToast = (
  t: Toast,
  type: "success" | "warning" | "error" | "info",
  options: ToastOptions
) => {
  return <MobileToastContent t={t} type={type} title={options.title} message={options.message} />;
};

// ── Public API ──

export const showSuccessToast = (options: ToastOptions) => {
  if (isMobileOrPwa()) {
    toast.custom((t) => renderMobileToast(t, "success", options), { duration: 3000, position: "top-center" });
  } else {
    toast.success(options.title + (options.message ? ` - ${options.message}` : ""), { duration: 3000 });
  }
};

export const showWarningToast = (options: ToastOptions) => {
  if (isMobileOrPwa()) {
    toast.custom((t) => renderMobileToast(t, "warning", options), { duration: 4000, position: "top-center" });
  } else {
    toast.error(options.title + (options.message ? ` - ${options.message}` : ""), {
      icon: "⚠️",
      duration: 4000,
      style: { background: "#FFF9EC", color: "#b45309" },
    });
  }
};

export const showErrorToast = (options: ToastOptions) => {
  if (isMobileOrPwa()) {
    toast.custom((t) => renderMobileToast(t, "error", options), { duration: 5000, position: "top-center" });
  } else {
    toast.error(options.title + (options.message ? ` - ${options.message}` : ""), { duration: 5000 });
  }
};

export const showInfoToast = (options: ToastOptions) => {
  if (isMobileOrPwa()) {
    toast.custom((t) => renderMobileToast(t, "info", options), { duration: 4000, position: "top-center" });
  } else {
    toast(options.title + (options.message ? ` - ${options.message}` : ""), {
      icon: "ℹ️",
      duration: 4000,
    });
  }
};
