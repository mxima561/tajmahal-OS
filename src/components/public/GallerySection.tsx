'use client'

const photos = [
  { src: '/images/Friday-Night-atTaj-Mahal-Club-Sharm-El-Sheikh.webp', label: 'Main Floor', featured: true },
  { src: '/images/landingpagecover.jpg', label: 'DJ Booth' },
  { src: '/images/Friday-Night-atTaj-Mahal-Club-Sharm-El-Sheikh.webp', label: 'Crowd' },
  { src: '/images/landingpagecover.jpg', label: 'VIP Area' },
  { src: '/images/Friday-Night-atTaj-Mahal-Club-Sharm-El-Sheikh.webp', label: 'Lights' },
]

export default function GallerySection() {
  return (
    <section id="gallery" className="relative py-20 md:py-32 overflow-hidden bg-taj-dark">
      <div className="container mx-auto px-4 md:px-8">
        {/* Header */}
        <div className="grid md:grid-cols-2 gap-8 md:gap-16 items-center mb-12">
          <div>
            <h2 className="font-display text-5xl md:text-8xl font-bold uppercase mb-6 leading-none">
              Inside <br /> <span className="text-taj-gold">Taj Mahal</span>
            </h2>
            <p className="text-lg text-gray-400 mb-8 max-w-md">
              Step into Sharm El Sheikh&apos;s most iconic nightlife destination. World-class
              sound, stunning visuals, and an atmosphere that keeps you coming back.
            </p>
            <a
              href="https://www.instagram.com/tajmahalssh"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white text-black font-bold uppercase px-8 py-4 rounded-full hover:bg-taj-gold transition-colors inline-block"
            >
              Explore Gallery
            </a>
          </div>
          <div className="hidden md:block text-right">
            <p className="text-9xl font-display font-bold text-white/5 uppercase leading-none">
              Since<br />2020
            </p>
          </div>
        </div>

        {/* Photo Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {photos.map((photo, i) => (
            <div
              key={i}
              className={`group overflow-hidden rounded-2xl relative ${
                photo.featured ? 'col-span-2 row-span-2 aspect-square' : 'aspect-square'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.src}
                alt={photo.label}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute bottom-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="bg-taj-gold text-black px-3 py-1 rounded-full text-xs font-bold uppercase">
                  {photo.label}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
