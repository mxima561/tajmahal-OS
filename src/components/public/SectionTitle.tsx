interface SectionTitleProps {
  title: string
}

export default function SectionTitle({ title }: SectionTitleProps) {
  return (
    <div className="sticky top-0 z-0 h-[60vh] flex items-center justify-center pointer-events-none">
      <h2 className="text-[15vw] leading-none font-display font-bold uppercase text-white tracking-tighter opacity-20 select-none">
        {title}
      </h2>
    </div>
  )
}
