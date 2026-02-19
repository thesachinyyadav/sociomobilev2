"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import DesktopGate from "@/components/DesktopGate";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import InstallPrompt from "@/components/InstallPrompt";
import BrowserNotificationPrompt from "@/components/BrowserNotificationPrompt";
import ChatbotSoonFab from "@/components/ChatbotSoonFab";
import CampusSelector, { isCampusDismissedRecently } from "@/components/CampusSelector";
import { useAuth } from "@/context/AuthContext";

const NO_SHELL = ["/auth", "/auth/callback", "/offline"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hide = NO_SHELL.some((p) => pathname.startsWith(p));
  const { userData, session, needsCampus, refreshUserData } = useAuth();
  const [campusDismissed, setCampusDismissed] = useState(false);

  useEffect(() => {
    setCampusDismissed(isCampusDismissedRecently());
  }, []);

  const handleCampusComplete = (campus: string) => {
    if (campus) refreshUserData();
  };

  const handleCampusDismiss = () => {
    setCampusDismissed(true);
  };

  return (
    <>
      <DesktopGate />
      {!hide && <TopBar />}
      <main>{children}</main>
      {!hide && <BottomNav />}
      {!hide && <InstallPrompt />}
      {!hide && <ChatbotSoonFab />}
      {!hide && userData && <BrowserNotificationPrompt />}
      {needsCampus && !campusDismissed && userData && (
        <CampusSelector
          email={userData.email}
          accessToken={session?.access_token ?? ""}
          onComplete={handleCampusComplete}
          onDismiss={handleCampusDismiss}
        />
      )}
    </>
  );
}
