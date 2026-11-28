// Campos con unidad (<span class="unidad"><input></span>): la unidad se pinta
// justo detrás de la cifra. En los navegadores con `field-sizing: content` lo
// hace el CSS; en los demás, este módulo ajusta el ancho del input a lo escrito.
// Añade flechas propias de subir y bajar al borde derecho (las del navegador
// quedarían encima de la unidad). Pulsar en la caja pone el cursor en el campo.

export function prepararUnidades(raiz = document) {
  const nativo = typeof CSS !== 'undefined' && CSS.supports?.('field-sizing', 'content');
  for (const caja of raiz.querySelectorAll('.unidad')) {
    const input = caja.querySelector('input');
    if (!input) continue;
    caja.addEventListener('mousedown', (e) => {
      if (e.target === caja) { e.preventDefault(); input.focus(); }
    });
    // En las celdas (.campos) las flechas van junto al nombre: lo envolvemos para
    // dejarles sitio sin que se monten encima.
    const etiqueta = caja.closest('label');
    if (caja.closest('.campos') && etiqueta?.firstChild?.nodeType === Node.TEXT_NODE && etiqueta.firstChild.textContent.trim()) {
      const nombre = document.createElement('span');
      nombre.className = 'nombre-campo';
      nombre.textContent = etiqueta.firstChild.textContent.trim();
      etiqueta.firstChild.replaceWith(nombre);
    }
    // Flechas de subir y bajar al borde derecho, fuera de la cifra y de la unidad.
    if (input.type === 'number' && !caja.querySelector('.flechas')) {
      const flechas = document.createElement('span');
      flechas.className = 'flechas';
      for (const [signo, texto] of [[1, 'Subir'], [-1, 'Bajar']]) {
        const b = document.createElement('button');
        b.type = 'button';
        b.tabIndex = -1; // con el teclado ya están las flechas arriba/abajo
        b.setAttribute('aria-label', `${texto} ${etiqueta?.textContent?.trim().split('\n')[0] ?? ''}`.trim());
        b.textContent = signo > 0 ? '▲' : '▼';
        // Mantener pulsado repite, cada vez más rápido, como las flechas del navegador.
        let espera = 0;
        const paso = () => {
          signo > 0 ? input.stepUp() : input.stepDown();
          input.dispatchEvent(new Event('input', { bubbles: true }));
        };
        const parar = () => {
          if (!espera) return;
          clearTimeout(espera);
          espera = 0;
          input.dispatchEvent(new Event('change', { bubbles: true }));
        };
        b.addEventListener('pointerdown', (e) => {
          if (e.button !== 0) return;
          e.preventDefault();
          b.setPointerCapture?.(e.pointerId);
          paso();
          let ritmo = 70;
          const repetir = () => {
            paso();
            ritmo = Math.max(20, ritmo * 0.93);
            espera = setTimeout(repetir, ritmo);
          };
          espera = setTimeout(repetir, 400);
        });
        for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(ev, parar);
        b.addEventListener('contextmenu', (e) => e.preventDefault());
        flechas.append(b);
      }
      caja.append(flechas);
    }
    // Cifras largas (p. ej. 1200,5): letra algo más pequeña para que quepan.
    const largo = () => caja.classList.toggle('largo', input.value.length > 4);
    input.addEventListener('input', largo);
    largo();
    if (nativo) continue;
    const ajustar = () => { input.style.width = `${Math.max(1, input.value.length) + 0.5}ch`; };
    input.addEventListener('input', ajustar);
    ajustar();
  }
}
