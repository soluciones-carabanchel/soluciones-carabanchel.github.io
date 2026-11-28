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
    // Flechas de subir y bajar al borde derecho, fuera de la cifra y de la unidad.
    if (input.type === 'number' && !caja.querySelector('.flechas')) {
      const flechas = document.createElement('span');
      flechas.className = 'flechas';
      for (const [signo, etiqueta] of [[1, 'Subir'], [-1, 'Bajar']]) {
        const b = document.createElement('button');
        b.type = 'button';
        b.tabIndex = -1; // con el teclado ya están las flechas arriba/abajo
        b.setAttribute('aria-label', `${etiqueta} ${input.closest('label')?.firstChild?.textContent?.trim() ?? ''}`.trim());
        b.textContent = signo > 0 ? '▲' : '▼';
        b.addEventListener('mousedown', (e) => e.preventDefault());
        b.addEventListener('click', () => {
          signo > 0 ? input.stepUp() : input.stepDown();
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        });
        flechas.append(b);
      }
      caja.append(flechas);
    }
    if (nativo) continue;
    const ajustar = () => { input.style.width = `${Math.max(1, input.value.length) + 0.5}ch`; };
    input.addEventListener('input', ajustar);
    ajustar();
  }
}
