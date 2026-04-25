/* efecto sobre las marcas — solo marca el tile y el CSS hace el resto (sin reflows) */
document.querySelectorAll('.brand-tile img[data-invert="1"]').forEach(img => {
  img.closest('.brand-tile')?.classList.add('is-inverted');
});
