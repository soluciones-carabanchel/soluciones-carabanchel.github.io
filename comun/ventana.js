// Ventanita flotante dentro de un visor (p. ej. la vista 3D de la disposición D3).
// - Se mueve arrastrando su cabecera (.asa), sin salirse del visor.
// - Se puede minimizar (solo queda la cabecera) y ampliar (ocupa el visor).
// En móvil la ventanita no flota (ver estilos.css) y no se arrastra.
//
//   const v = prepararVentana(elemento, { alMinimizar(minima) {} });
//   v.ampliar(true | false); v.minimizar(true | false);

export function prepararVentana(ventana, { alMinimizar } = {}) {
  const asa = ventana.querySelector('.asa');
  const contenedor = ventana.offsetParent ?? ventana.parentElement;
  let sitio = null; // { left, top } en px dentro del contenedor, si se ha movido

  const flota = () => getComputedStyle(ventana).position === 'absolute';
  const limitar = (left, top) => {
    const maxX = contenedor.clientWidth - ventana.offsetWidth;
    const maxY = contenedor.clientHeight - ventana.offsetHeight;
    return { left: Math.max(0, Math.min(maxX, left)), top: Math.max(0, Math.min(maxY, top)) };
  };
  const aplicar = () => {
    if (sitio && !ventana.classList.contains('amplia')) {
      const { left, top } = limitar(sitio.left, sitio.top);
      Object.assign(ventana.style, { left: `${left}px`, top: `${top}px`, right: 'auto', bottom: 'auto' });
    } else {
      Object.assign(ventana.style, { left: '', top: '', right: '', bottom: '' });
    }
  };

  asa?.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || e.target.closest('button') || !flota() || ventana.classList.contains('amplia')) return;
    e.preventDefault();
    const inicio = { x: e.clientX, y: e.clientY, left: ventana.offsetLeft, top: ventana.offsetTop };
    ventana.classList.add('arrastrando');
    asa.setPointerCapture(e.pointerId);
    const mover = (ev) => {
      sitio = { left: inicio.left + ev.clientX - inicio.x, top: inicio.top + ev.clientY - inicio.y };
      aplicar();
    };
    const soltar = () => {
      ventana.classList.remove('arrastrando');
      asa.removeEventListener('pointermove', mover);
      asa.removeEventListener('pointerup', soltar);
      asa.removeEventListener('pointercancel', soltar);
    };
    asa.addEventListener('pointermove', mover);
    asa.addEventListener('pointerup', soltar);
    asa.addEventListener('pointercancel', soltar);
  });

  // Si cambia el tamaño del visor, que la ventanita siga dentro.
  new ResizeObserver(aplicar).observe(contenedor);

  return {
    ampliar(si) {
      if (si) ventana.classList.remove('minima');
      ventana.classList.toggle('amplia', si);
      aplicar();
    },
    minimizar(si) {
      ventana.classList.toggle('minima', si);
      alMinimizar?.(si);
      aplicar();
    },
  };
}
