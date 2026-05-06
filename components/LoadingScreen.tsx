export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white">
      <div className="relative">
        {/* Main Logo with Pulse */}
        <span className="text-2xl font-black tracking-tighter text-gradient animate-pulse-slow">
          SOCIO
        </span>
        
        {/* Subtle Progress Track */}
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-12 h-[2px] bg-slate-100 overflow-hidden rounded-full">
          <div className="h-full bg-[var(--color-primary)] animate-loading-bar" />
        </div>
      </div>
      
      {/* Decorative Blur */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[var(--color-primary)]/5 blur-[100px] rounded-full -z-10" />
    </div>
  );
}
