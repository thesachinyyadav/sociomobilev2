"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationContext";
import { Button } from "@/components/Button";
import { LogOutIcon, BellIcon } from "@/components/icons";

export default function SettingsPage() {
  const { userData, signOut } = useAuth();
  const router = useRouter();

  if (!userData) return null;

  return (
    <div className="pwa-page px-4 pb-[calc(var(--bottom-nav)+var(--safe-bottom)+96px)] pt-5 animate-fade-in">


      {/* Account Actions */}
      <div className="mb-4">
        <div className="card p-4">
          <h2 className="text-[15px] font-extrabold mb-3">Account</h2>
          <Button
            variant="danger"
            fullWidth
            onClick={async () => {
              await signOut();
              router.replace("/auth");
            }}
            leftIcon={<LogOutIcon size={16} />}
          >
            Sign out
          </Button>
        </div>
      </div>

    </div>
  );
}
