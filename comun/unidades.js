// Campos con unidad (<span class="unidad"><input></span>): la unidad se pinta
// justo detrás de la cifra. En los navegadores con `field-sizing: content` lo
// hace el CSS; en los demás, este módulo ajusta el ancho del input a lo escrito.
// Además, pulsar en cualquier parte de la caja pone el cursor en el campo.

export function prepararUnidades(raiz = document) {
  const nativo = typeof CSS !== 'undefined' && CSS.supports?.('field-sizing', 'content');
  for (const caja of raiz.querySelectorAll('.unidad')) {
    const input = caja.querySelector('input');
    if (!input) continue;
    caja.addEventListener('mousedown', (e) => {
      if (e.target === caja) { e.preventDefault(); input.focus(); }
    });
    if (nativo) continue;
    const ajustar = () => { input.style.width = `${Math.max(1, input.value.length) + 0.5}ch`; };
    input.addEventListener('input', ajustar);
    ajustar();
  }
}
