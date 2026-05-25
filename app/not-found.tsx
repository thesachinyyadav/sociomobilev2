import Link from "next/link";
import { CompassIcon } from "@/components/icons";

/**
 * 404 Not Found component for Next.js 15 App Router.
 */
export default function NotFound() {
  return (
    <div className="pwa-page-center bg-[var(--color-bg)] px-4">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-[var(--color-primary)]">
        <CompassIcon size={32} />
      </div>
      
      <h2 className="text-[18px] font-black tracking-tight text-[var(--color-text)]">
        Page Not Found
      </h2>
      
      <p className="mt-1.5 max-w-[240px] text-[12px] leading-relaxed text-[var(--color-text-muted)]">
        The page you are looking for doesn&apos;t exist or has been moved.
      </p>

      <div className="mt-6 w-full max-w-[220px]">
        <Link
          href="/"
          className="btn btn-primary flex w-full items-center justify-center gap-2"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
