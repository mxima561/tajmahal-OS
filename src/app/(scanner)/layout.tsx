export default function ScannerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-dvh bg-night-950 text-white">
      {children}
    </div>
  )
}
