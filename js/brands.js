/* efecto sobre las marcas */
window.addEventListener('load', () => {
    document.querySelectorAll('.brand-tile img[data-invert="1"]').forEach(img => {
        img.style.filter = 'brightness(0) invert(1) opacity(0.85)';
        img.addEventListener('mouseenter', () => { img.style.filter = 'none'; });
        // also on tile hover, reset
        const tile = img.closest('.brand-tile');
        if (tile) {
        tile.addEventListener('mouseenter', () => { img.style.filter = 'none'; });
        tile.addEventListener('mouseleave', () => { img.style.filter = 'brightness(0) invert(1) opacity(0.85)'; });
        }
    });
});