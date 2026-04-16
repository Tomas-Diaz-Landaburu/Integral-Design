// CAROUSEL
const images = [
{ src: "media/fotos_carrusel/barco.jpg", label: "Imagen 1" },
{ src: "media/fotos_carrusel/estand.jpg", label: "Imagen 2" },
{ src: "media/fotos_carrusel/estand2.jpg", label: "Imagen 3" },
{ src: "media/fotos_carrusel/IMG_5597.jpeg", label: "Imagen 4" },
{ src: "media/fotos_carrusel/tablero.jpeg", label: "Imagen 5" },
{ src: "media/fotos_carrusel/lancha1.jpg", label: "Imagen 6" },
{ src: "media/fotos_carrusel/lancha2.jpg", label: "Imagen 7" },
// { src: "media/fotos_carrusel/lancha3.HEIC", label: "Imagen 8" },
// { src: "media/fotos_carrusel/lancha4.HEIC", label: "Imagen 9" },
{ src: "media/fotos_carrusel/moto1.jpg", label: "Imagen 10" },
// { src: "media/fotos_carrusel/moto2.JPG,", label: "Imagen 11" },
// { src: "media/fotos_carrusel/moto3.jpeg,", label: "Imagen 12" },
];

const track = document.getElementById("track");

function crearItem(item) {
    const div = document.createElement("div");
    div.className = "carousel-item";
    const img = document.createElement("img");
    img.src = item.src;
    img.alt = item.label;
    div.appendChild(img);
    return div;
}

images.forEach(item => track.appendChild(crearItem(item)));
images.forEach(item => track.appendChild(crearItem(item)));

window.addEventListener("load", () => {
    const totalItems = images.length;
    const itemWidth = 550 + 16;
    const totalWidth = totalItems * itemWidth;

    const style = document.createElement("style");
    style.textContent = `
        @keyframes scroll-left {
        0%   { transform: translateX(0px); }
        100% { transform: translateX(-${totalWidth}px); }
        }
    `;
    document.head.appendChild(style);

    let isDown = false;
    let startX = 0;
    let currentOffset = 0;

    track.addEventListener("mouseenter", () => {
        track.style.animationPlayState = "paused";
    });

    track.addEventListener("mouseleave", () => {
    isDown = false;
    track.style.cursor = "grab";
    track.style.animation = `scroll-left 40s linear infinite`;
    track.style.animationDelay = `${currentOffset / totalWidth * 40}s`;
    });

    track.addEventListener("mouseup", (e) => {
    if (!isDown) return;
    currentOffset += e.pageX - startX;
    isDown = false;
    track.style.cursor = "grab";
    });

    track.addEventListener("mousedown", (e) => {
    isDown = true;
    startX = e.pageX;
    track.style.cursor = "grabbing";

    // captura la posición visual actual antes de cancelar la animación
    const matrix = new DOMMatrix(getComputedStyle(track).transform);
    currentOffset = matrix.m41;

    track.style.animation = "none";
    track.style.transform = `translateX(${currentOffset}px)`;
    e.preventDefault();
    });

    track.addEventListener("mousemove", (e) => {
        if (!isDown) return;
        const diff = e.pageX - startX;
        let newOffset = currentOffset + diff;

        if (newOffset > 0) {
        newOffset = -totalWidth + newOffset;
        currentOffset = newOffset;
        startX = e.pageX;
        }

        if (newOffset < -totalWidth) {
        newOffset = newOffset + totalWidth;
        currentOffset = newOffset;
        startX = e.pageX;
        }

        track.style.transform = `translateX(${newOffset}px)`;
    });

    track.addEventListener("mouseup", (e) => {
        if (!isDown) return;
        currentOffset += e.pageX - startX;
        isDown = false;
        track.style.cursor = "grab";
    });
});


// ESTEREO
const stereoSection = document.querySelector(".stereo-section");
const stereoColor = document.querySelector(".stereo-color");

window.addEventListener("scroll", () => {
  const rect = stereoSection.getBoundingClientRect();
  const sectionHeight = stereoSection.offsetHeight - window.innerHeight;

  const scrolled = -rect.top / sectionHeight;
  const clamped = Math.min(1, Math.max(0, scrolled));

  // progreso normal (podés ajustarlo como antes)
  const progress = clamped;

  // de 100% (oculto) a 0% (visible)
  const reveal = 100 - progress * 100;

  stereoColor.style.clipPath = `inset(${reveal}% 0 0 0)`;
});
