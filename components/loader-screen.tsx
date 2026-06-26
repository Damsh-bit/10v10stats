export function LoaderScreen({ label = 'Cargando...' }: { label?: string }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5 px-4 py-12">
      {/* Sticker pulsante */}
      <div className="relative flex items-center justify-center">
        {/* Halo exterior */}
        <span
          className="absolute inline-flex h-44 w-44 rounded-full bg-primary/10 animate-ping"
          style={{ animationDuration: '2s' }}
        />
        {/* Halo interior */}
        <span className="absolute inline-flex h-36 w-36 rounded-full bg-primary/10" />
        <img
          src="/Sticker loader.png"
          alt="Cargando"
          width={150}
          height={150}
          className="relative z-10 select-none animate-pulse"
          style={{ animationDuration: '1.5s' }}
        />
      </div>
      <p className="font-mono text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </p>
    </main>
  )
}
