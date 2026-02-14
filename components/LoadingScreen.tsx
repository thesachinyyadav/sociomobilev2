export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white gap-4">
      <div className="relative w-14 h-14">
        <div className="absolute inset-0 rounded-full border-[3px] border-[var(--color-primary-light)]" />
        <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-[var(--color-primary)] animate-spin" />
      </div>
      <span className="text-sm font-bold text-gradient">SOCIO</span>
    </div>
  );
}
