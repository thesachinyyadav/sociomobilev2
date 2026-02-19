"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import DesktopGate from "@/components/DesktopGate";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import InstallPrompt from "@/components/InstallPrompt";
import CampusSelector from "@/components/CampusSelector";
import { useAuth } from "@/context/AuthContext";

const NO_SHELL = ["/auth", "/auth/callback", "/offline"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hide = NO_SHELL.some((p) => pathname.startsWith(p));
  const { userData, needsCampus, refreshUserData } = useAuth();
  const [campusDismissed, setCampusDismissed] = useState(false);

  const handleCampusComplete = (campus: string) => {
    if (campus) {
      // Successfully detected — refresh user data to pick up new campus
      refreshUserData();
    } else {
      // Skipped — dismiss for this session
      setCampusDismissed(true);
    }
  };

  return (
    <>
      <DesktopGate />
      {!hide && <TopBar />}
      <main>{children}</main>
      {!hide && <BottomNav />}
      {!hide && <InstallPrompt />}
      {needsCampus && !campusDismissed && userData && (
        <CampusSelector email={userData.email} onComplete={handleCampusComplete} />
      )}
    </>
  );
}
