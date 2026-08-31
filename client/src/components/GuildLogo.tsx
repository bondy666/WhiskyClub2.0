export function GuildLogo({ size = 40 }: { size?: number }) {
  return (
    <img
      src="/logo-source.png"
      width={size}
      height={size}
      alt="Ealing Whisky Guild"
      className="rounded-full object-contain"
      style={{ width: size, height: size }}
    />
  )
}
