import { Share } from "@capacitor/share";
import { Capacitor } from "@capacitor/core";
import toast from "react-hot-toast";
import { APP_URL } from "./apiConfig";

interface ShareOptions {
  title: string;
  text: string;
  url: string;
}

/**
 * Shared utility to trigger native share or fallback to browser share/clipboard
 */
export async function shareEvent({ title, text, url }: ShareOptions) {
  try {
    // Ensure URL is absolute and points to production even in native environment
    let shareUrl = url;
    if (url.startsWith("/") || url.includes("localhost") || url.includes("127.0.0.1")) {
      const path = url.startsWith("/") ? url : new URL(url).pathname;
      shareUrl = `${APP_URL}${path}`;
    }

    if (Capacitor.isNativePlatform()) {
      await Share.share({
        title,
        text,
        url: shareUrl,
        dialogTitle: "Share Event",
      });
    } else if (navigator.share) {
      await navigator.share({
        title,
        text,
        url: shareUrl,
      });
    } else {
      // Fallback: Copy to clipboard
      await navigator.clipboard.writeText(`${title}\n${text}\n${shareUrl}`);
      toast.success("Link copied to clipboard!");
    }
  } catch (error: any) {
    // Ignore common cancellation messages
    const msg = error?.message?.toLowerCase() || "";
    if (msg.includes("canceled") || msg.includes("cancelled") || msg.includes("abort")) {
      return;
    }
    
    console.error("Error sharing:", error);
    toast.error("Failed to share");
  }
}

