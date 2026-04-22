/* ==============================================================
   Integral Design — main interactions
   ============================================================== */

/* --------------------------------------------------------------
   HEADER scroll state
   -------------------------------------------------------------- */
const header = document.querySelector('.header');
const updateHeader = () => {
  if (window.scrollY > 40) header.classList.add('scrolled');
  else header.classList.remove('scrolled');
};
updateHeader();
window.addEventListener('scroll', updateHeader, { passive: true });

/* --------------------------------------------------------------
   NAV active-section indicator
   -------------------------------------------------------------- */
const navLinks = document.querySelectorAll('.navbar a[href^="#"]');
const sections = [...navLinks]
  .map(a => {
    const href = a.getAttribute('href');
    if (!href || href === '#' || href.length < 2) return null;
    try { return document.querySelector(href); } catch (e) { return null; }
  })
  .filter(Boolean);

const setActive = () => {
  const y = window.scrollY + 120;
  let current = null;
  sections.forEach(s => {
    if (s.offsetTop <= y) current = s;
  });
  navLinks.forEach(a => a.classList.remove('active'));
  if (current) {
    const link = document.querySelector(`.navbar a[href="#${current.id}"]`);
    if (link) link.classList.add('active');
  }
};
window.addEventListener('scroll', setActive, { passive: true });

/* --------------------------------------------------------------
   CAROUSEL — build track, drag support, infinite loop
   -------------------------------------------------------------- */
const carouselData = [
  { src: "media/Fotos/nautica.jpg",              tag: "Náutica" },
  { src: "media/Fotos/feria.jpg",             tag: "Feria" },
  { src: "media/Fotos/marine_audio.jpg",            tag: "Marine Audio" },
  { src: "media/Fotos/motos.jpg",              tag: "Motos" },
  { src: "media/Fotos/tablero.jpeg",           tag: "Electrónica" },
  { src: "media/Fotos/instalacion.jpeg",          tag: "Instalación" },
  { src: "media/Fotos/nautica_2.jpg",            tag: "Náutica" },
  { src: "media/Fotos/outdoor_cl.jpg",    tag: "Outdoor" },
  { src: "media/Fotos/outdoor_2.jpeg",             tag: "Outdoor" },
  { src: "media/Fotos/expedicion_2.jpg", tag: "Expedición" },
  { src: "media/Fotos/feria.jpg",            tag: "Feria" },
  { src: "media/Fotos/motos_2.jpg",              tag: "Expedición" },
];

const track = document.getElementById("track");
if (track) {
  const buildItem = (item, idx) => {
    const d = document.createElement('div');
    d.className = 'carousel-item';
    d.innerHTML = `
      <img src="${item.src}" alt="${item.tag}" loading="lazy">
      <div class="caption">
        <span class="tag">${item.tag}</span>
        <span class="num">${String(idx + 1).padStart(2, '0')}/${String(carouselData.length).padStart(2, '0')}</span>
      </div>
    `;
    return d;
  };

  carouselData.forEach((item, i) => track.appendChild(buildItem(item, i)));
  carouselData.forEach((item, i) => track.appendChild(buildItem(item, i))); // duplicate for seamless loop
}

/* --------------------------------------------------------------
   STEREO sticky reveal
   -------------------------------------------------------------- */
const stereoSection = document.querySelector('.stereo-section');
const stereoColor = document.querySelector('.stereo-color');

if (stereoSection && stereoColor) {
  const HEAD_START = 0.15;
  const EARLY_FINISH = 0.15;

  const onStereoScroll = () => {
    const rect = stereoSection.getBoundingClientRect();
    const sectionHeight = stereoSection.offsetHeight - window.innerHeight;
    if (sectionHeight <= 0) return;

    const rawProgress = -rect.top / sectionHeight;
    const adjusted = rawProgress / (1 - EARLY_FINISH);
    const clamped = Math.min(1, Math.max(0, adjusted * (1 - HEAD_START) + HEAD_START));

    const reveal = 100 - clamped * 100;
    stereoColor.style.clipPath = `inset(${reveal}% 0 0 0)`;
  };
  onStereoScroll();
  window.addEventListener('scroll', onStereoScroll, { passive: true });
}

/* --------------------------------------------------------------
   MARCAS — build both marquee rows
   -------------------------------------------------------------- */
const brands = [
  { src: "media/Marcas/Integraldesign.png",                 name: "Integral Design",   invert: false },
  { src: "media/Marcas/Integralaudio.png",                  name: "Integral Audio",    invert: false },
  { src: "media/Marcas/Alpine.png",                         name: "Alpine",            invert: false },
  { src: "media/Marcas/Fusion.png",                         name: "Fusion",            invert: false },
  { src: "media/Marcas/Garmin.png",                         name: "Garmin",            invert: true },
  { src: "media/Marcas/JLaudio.jpg",                        name: "JL Audio",          invert: true },
  { src: "media/Marcas/Audiopipe.jpg",                      name: "Audiopipe",         invert: true },
  { src: "media/Marcas/InstallationSolution.png",           name: "Pipeman",           invert: false },
  { src: "media/Marcas/Na.png",                             name: "NipponAmerica",     invert: false },
  { src: "media/Marcas/Saxon.png",                          name: "Saxon",             invert: false },
  { src: "media/Marcas/MamotoGear.png",                     name: "MaMoto Gear",       invert: false },
  { src: "media/Marcas/philips.png",                        name: "Philips",           invert: true },
];

const buildBrandTile = b => {
  const el = document.createElement('div');
  el.className = 'brand-tile';
  el.title = b.name;
  el.innerHTML = `<img src="${b.src}" alt="${b.name}" loading="lazy"${b.invert ? ' data-invert="1"' : ''}>`;
  return el;
};

const mq1 = document.getElementById('marquee-row-1');
const mq2 = document.getElementById('marquee-row-2');
if (mq1 && mq2) {
  const row1 = brands;                        // 12
  const row2 = [...brands].slice(6).concat([...brands].slice(0, 6)); // rotated 12
  [row1, row1].forEach(batch => batch.forEach(b => mq1.appendChild(buildBrandTile(b))));
  [row2, row2].forEach(batch => batch.forEach(b => mq2.appendChild(buildBrandTile(b))));
}

/* --------------------------------------------------------------
   Scroll-triggered reveals on grid items
   -------------------------------------------------------------- */
const io = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in');
      io.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('[data-reveal]').forEach(el => io.observe(el));
