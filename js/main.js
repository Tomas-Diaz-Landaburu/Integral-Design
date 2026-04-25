/* ==============================================================
   Integral Design — main interactions (optimizado)
   ============================================================== */

(() => {
  'use strict';

  const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* --------------------------------------------------------------
     SCROLL ÚNICO: header + nav active section
     Un solo listener + rAF throttle. Evita dos handlers compitiendo.
     -------------------------------------------------------------- */
  const header = document.querySelector('.header');
  const navLinks = [...document.querySelectorAll('.navbar a[href^="#"]')];
  const linkBySection = new Map();
  const sections = navLinks
    .map(a => {
      const id = a.getAttribute('href')?.slice(1);
      if (!id) return null;
      const sec = document.getElementById(id);
      if (sec) linkBySection.set(sec, a);
      return sec;
    })
    .filter(Boolean);

  let activeSection = null;
  let isScrolled = false;
  let ticking = false;

  const onScroll = () => {
    const y = window.scrollY;

    // Header scrolled state — solo togglea cuando cambia
    const shouldScrolled = y > 40;
    if (shouldScrolled !== isScrolled) {
      header?.classList.toggle('scrolled', shouldScrolled);
      isScrolled = shouldScrolled;
    }
    ticking = false;
  };

  addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(onScroll);
      ticking = true;
    }
  }, { passive: true });
  onScroll();

  /* Sección activa con IntersectionObserver (sin offsetTop ni reflows) */
  if (sections.length && 'IntersectionObserver' in window) {
    const sectionObs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          if (activeSection !== entry.target) {
            navLinks.forEach(a => a.classList.remove('active'));
            linkBySection.get(entry.target)?.classList.add('active');
            activeSection = entry.target;
          }
        }
      });
    }, { rootMargin: '-30% 0px -60% 0px', threshold: 0 });
    sections.forEach(s => sectionObs.observe(s));
  }

  /* --------------------------------------------------------------
     CAROUSEL — construido con DOM (sin innerHTML) para mejor perf
     -------------------------------------------------------------- */
  const carouselData = [
    { src: "media/Fotos/nautica.webp",      tag: "Náutica" },
    { src: "media/Fotos/feria.webp",        tag: "Feria" },
    { src: "media/Fotos/marine_audio.webp", tag: "Marine Audio" },
    { src: "media/Fotos/motos.webp",        tag: "Motos" },
    { src: "media/Fotos/tablero.webp",      tag: "Electrónica" },
    { src: "media/Fotos/instalacion.webp",  tag: "Instalación" },
    { src: "media/Fotos/nautica_2.webp",    tag: "Náutica" },
    { src: "media/Fotos/outdoor_cl.webp",   tag: "Outdoor" },
    { src: "media/Fotos/outdoor_2.webp",    tag: "Outdoor" },
    { src: "media/Fotos/expedicion_2.webp", tag: "Expedición" },
    { src: "media/Fotos/feria.webp",        tag: "Feria" },
    { src: "media/Fotos/motos_2.webp",      tag: "Expedición" },
  ];

  const track = document.getElementById("track");
  if (track) {
    const total = carouselData.length;
    const totalStr = String(total).padStart(2, '0');
    const frag = document.createDocumentFragment();

    const buildItem = (item, idx, eager) => {
      const d = document.createElement('div');
      d.className = 'carousel-item';

      const img = document.createElement('img');
      img.src = item.src;
      img.alt = item.tag;
      img.width = 380;
      img.height = 480;
      if (eager) {
        img.fetchPriority = 'high';
      } else {
        img.loading = 'lazy';
        img.decoding = 'async';
      }

      const cap = document.createElement('div');
      cap.className = 'caption';

      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.textContent = item.tag;

      const num = document.createElement('span');
      num.className = 'num';
      num.textContent = `${String(idx + 1).padStart(2, '0')}/${totalStr}`;

      cap.append(tag, num);
      d.append(img, cap);
      return d;
    };

    // Original: las primeras 3 eager, resto lazy
    carouselData.forEach((item, i) => frag.appendChild(buildItem(item, i, i < 3)));
    // Duplicado para loop infinito: todas lazy
    carouselData.forEach((item, i) => frag.appendChild(buildItem(item, i, false)));
    track.appendChild(frag);
  }

  /* --------------------------------------------------------------
     STEREO sticky reveal
     - rAF throttle
     - cachea offsetHeight (solo recalcula en resize)
     - solo trabaja cuando la sección está cerca del viewport
     -------------------------------------------------------------- */
  const stereoSection = document.querySelector('.stereo-section');
  const stereoColor = document.querySelector('.stereo-color');

  if (stereoSection && stereoColor && !prefersReducedMotion) {
    const HEAD_START = 0.15;
    const EARLY_FINISH = 0.15;

    let sectionHeight = 0;
    let sectionTop = 0;
    let inView = false;
    let stTicking = false;
    let lastReveal = -1;

    const measure = () => {
      sectionHeight = stereoSection.offsetHeight - innerHeight;
      sectionTop = stereoSection.getBoundingClientRect().top + window.scrollY;
    };

    const update = () => {
      if (sectionHeight <= 0) { stTicking = false; return; }
      const y = window.scrollY;
      const rawProgress = (y - sectionTop) / sectionHeight;
      const adjusted = rawProgress / (1 - EARLY_FINISH);
      const clamped = Math.min(1, Math.max(0, adjusted * (1 - HEAD_START) + HEAD_START));
      const reveal = Math.round((100 - clamped * 100) * 10) / 10;
      // Solo escribe al estilo si cambió (evita layout repetido)
      if (reveal !== lastReveal) {
        stereoColor.style.clipPath = `inset(${reveal}% 0 0 0)`;
        lastReveal = reveal;
      }
      stTicking = false;
    };

    // Solo activa el listener cuando la sección entra en viewport
    if ('IntersectionObserver' in window) {
      const stObs = new IntersectionObserver(entries => {
        inView = entries[0].isIntersecting;
      }, { rootMargin: '50% 0px 50% 0px' });
      stObs.observe(stereoSection);
    } else {
      inView = true;
    }

    const onStereoScroll = () => {
      if (!inView || stTicking) return;
      stTicking = true;
      requestAnimationFrame(update);
    };

    measure();
    update();
    addEventListener('scroll', onStereoScroll, { passive: true });
    addEventListener('resize', () => { measure(); update(); }, { passive: true });
  }

  /* --------------------------------------------------------------
     MARCAS — marquee con DOM
     -------------------------------------------------------------- */
  const brands = [
    { src: "media/Marcas/Integraldesign.webp",       name: "Integral Design",   invert: false },
    { src: "media/Marcas/Integralaudio.webp",        name: "Integral Audio",    invert: false },
    { src: "media/Marcas/Alpine.webp",               name: "Alpine",            invert: false },
    { src: "media/Marcas/Fusion.webp",               name: "Fusion",            invert: false },
    { src: "media/Marcas/Garmin.webp",               name: "Garmin",            invert: true  },
    { src: "media/Marcas/JLaudio.webp",              name: "JL Audio",          invert: true  },
    { src: "media/Marcas/Audiopipe.webp",            name: "Audiopipe",         invert: true  },
    { src: "media/Marcas/InstallationSolution.webp", name: "Pipeman",           invert: false },
    { src: "media/Marcas/Na.webp",                   name: "NipponAmerica",     invert: false },
    { src: "media/Marcas/Saxon.webp",                name: "Saxon",             invert: false },
    { src: "media/Marcas/MamotoGear.webp",           name: "MaMoto Gear",       invert: false },
    { src: "media/Marcas/philips.webp",              name: "Philips",           invert: true  },
  ];

  const buildBrandTile = b => {
    const el = document.createElement('div');
    el.className = b.invert ? 'brand-tile is-inverted' : 'brand-tile';
    el.title = b.name;
    const img = document.createElement('img');
    img.src = b.src;
    img.alt = b.name;
    img.loading = 'lazy';
    img.decoding = 'async';
    if (b.invert) img.dataset.invert = '1';
    el.appendChild(img);
    return el;
  };

  const fillRow = (rowEl, list) => {
    if (!rowEl) return;
    const frag = document.createDocumentFragment();
    // Duplicado para loop seamless del marquee
    list.forEach(b => frag.appendChild(buildBrandTile(b)));
    list.forEach(b => frag.appendChild(buildBrandTile(b)));
    rowEl.appendChild(frag);
  };

  fillRow(document.getElementById('marquee-row-1'), brands);
  fillRow(document.getElementById('marquee-row-2'), [...brands.slice(6), ...brands.slice(0, 6)]);

  /* --------------------------------------------------------------
     Scroll reveals
     -------------------------------------------------------------- */
  if (prefersReducedMotion) {
    document.querySelectorAll('[data-reveal]').forEach(el => el.classList.add('in'));
    document.querySelectorAll('[data-anim], [data-anim-group]').forEach(el => el.classList.add('is-visible'));
  } else if ('IntersectionObserver' in window) {
    const reveal = (cls) => new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add(cls);
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

    const a = reveal('in');
    const b = reveal('is-visible');
    document.querySelectorAll('[data-reveal]').forEach(el => a.observe(el));
    document.querySelectorAll('[data-anim], [data-anim-group]').forEach(el => b.observe(el));
  } else {
    // Fallback antiguo
    document.querySelectorAll('[data-reveal]').forEach(el => el.classList.add('in'));
    document.querySelectorAll('[data-anim], [data-anim-group]').forEach(el => el.classList.add('is-visible'));
  }

  /* --------------------------------------------------------------
     Pausar marquee cuando no está visible (ahorra GPU)
     -------------------------------------------------------------- */
  if ('IntersectionObserver' in window) {
    const marqueeObs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        entry.target.style.animationPlayState = entry.isIntersecting ? 'running' : 'paused';
      });
    }, { threshold: 0 });
    document.querySelectorAll('.marquee-track').forEach(t => marqueeObs.observe(t));
  }
})();
