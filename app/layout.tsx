import type { Metadata, Viewport } from "next";
import { DM_Sans } from "next/font/google";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { EventProvider, type FetchedEvent } from "@/context/EventContext";
import { Toaster } from "react-hot-toast";
import { BottomNav } from "@/components/BottomNav";
import { TopBar } from "@/components/TopBar";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#154CB3",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "SOCIO",
  description: "University Event Platform — Discover, Register & Attend",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SOCIO",
  },
  icons: {
    icon: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

/* ── Server-side event prefetch ── */
async function prefetchEvents(): Promise<FetchedEvent[]> {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => {},
        },
      }
    );
    const { data } = await supabase
      .from("events")
      .select("*")
      .order("created_at", { ascending: false });
    return (data as FetchedEvent[]) ?? [];
  } catch {
    return [];
  }
}

export const revalidate = 300; // ISR 5 min

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const events = await prefetchEvents();

  return (
    <html lang="en" className={dmSans.variable}>
      <head>
        {/* PWA: register service worker */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if('serviceWorker' in navigator){
                window.addEventListener('load',()=>{
                  navigator.serviceWorker.register('/sw.js').catch(()=>{});
                });
              }
            `,
          }}
        />
      </head>
      <body className="font-[family-name:var(--font-dm-sans)] bg-[var(--color-bg)]">
        <AuthProvider>
          <EventProvider initialEvents={events}>
            <TopBar />
            <main className="pwa-page">{children}</main>
            <BottomNav />
            <Toaster
              position="top-center"
              toastOptions={{
                duration: 3000,
                style: {
                  borderRadius: "14px",
                  background: "#1e293b",
                  color: "#fff",
                  fontSize: "14px",
                  padding: "12px 18px",
                },
              }}
            />
          </EventProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
