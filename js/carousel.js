const images = [
{ src: "media/numeros/1.jpeg", label: "Imagen 1" },
{ src: "media/numeros/2.png", label: "Imagen 2" },
{ src: "media/numeros/3.png", label: "Imagen 3" },
{ src: "media/numeros/4.png", label: "Imagen 4" },
{ src: "media/numeros/5.png", label: "Imagen 5" },
{ src: "media/numeros/6.png", label: "Imagen 6" },
{ src: "media/numeros/7.png", label: "Imagen 7" },
{ src: "media/numeros/8.png", label: "Imagen 8" },
{ src: "media/numeros/9.png", label: "Imagen 9" },
{ src: "media/numeros/10.png", label: "Imagen 10" },
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
    const itemWidth = 300 + 16;
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