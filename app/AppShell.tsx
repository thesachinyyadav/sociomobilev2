"use client";

import { usePathname } from "next/navigation";
import DesktopGate from "@/components/DesktopGate";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";

const NO_SHELL = ["/auth", "/auth/callback", "/offline"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hide = NO_SHELL.some((p) => pathname.startsWith(p));

  return (
    <>
      <DesktopGate />
      {!hide && <TopBar />}
      <main>{children}</main>
      {!hide && <BottomNav />}
    </>
  );
}
