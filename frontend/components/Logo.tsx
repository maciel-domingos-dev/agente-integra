import Image from "next/image";

export default function Logo({ size = 56, showName = true }: { size?: number; showName?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      {/* Fundo branco: a logo oficial é um JPG com fundo branco e precisa de contraste no dark mode */}
      <div className="overflow-hidden rounded-xl bg-white p-1 shadow-glow">
        <Image src="/logo.jpg" alt="Integra Consultoria" width={size} height={size} priority />
      </div>
      {showName && (
        <div className="leading-tight">
          <p className="text-sm font-bold tracking-wide text-white">INTEGRA</p>
          <p className="text-xs text-brand">Consultoria</p>
        </div>
      )}
    </div>
  );
}
