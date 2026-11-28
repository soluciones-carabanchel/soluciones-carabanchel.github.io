// Portada: en la ficha de cajas, una caja montada en gris que gira sola.
// No es interactiva. Usa el visor 3D común y la geometría real del generador.
// El dibujo SVG que ya hay en la ficha está oculto y solo se muestra si no hay
// WebGL o falla la carga (clase .sin3d), para que no asome antes de la caja 3D.

const contenedor = document.getElementById('caja3d');
const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;

const MEDIDAS = { ancho: 150, fondo: 100, alto: 80, grosor: 3, pestana: 10, kerf: 0, tapa: false };
const GRIS = '#b9b9b4';
const VUELTA = 16;   // segundos por vuelta
const CERCA = 1;     // distancia de la cámara respecto al encuadre del visor

async function arrancar() {
  const { crearVisor, hayWebGL } = await import('./comun/visor3d.js');
  if (!hayWebGL()) { contenedor.classList.add('sin3d'); return; }
  const { ensamblarCaja } = await import('./cajas/geometria.js');

  const marco = document.createElement('div');
  marco.className = 'lienzo-portada';
  marco.setAttribute('aria-hidden', 'true');
  contenedor.replaceChildren(marco);
  const visor = crearVisor(marco, { suelo: false, fondo: '#ffffff' });
  const { camara } = visor;

  visor.mostrar(ensamblarCaja(MEDIDAS).map((p) => ({ ...p, color: GRIS })), { encuadrar: true });
  const centro = { x: MEDIDAS.ancho / 2, y: MEDIDAS.fondo / 2, z: MEDIDAS.alto / 2 };
  const dx = (camara.position.x - centro.x) * CERCA;
  const dy = (camara.position.y - centro.y) * CERCA;
  const radio = Math.hypot(dx, dy);
  const altura = centro.z + (camara.position.z - centro.z) * CERCA;
  let angulo = Math.atan2(dy, dx);
  const colocar = () => camara.position.set(centro.x + radio * Math.cos(angulo), centro.y + radio * Math.sin(angulo), altura);
  colocar();
  if (quieto) return;

  let antes = performance.now();
  function paso(ahora) {
    angulo += (Math.min(0.1, (ahora - antes) / 1000) * 2 * Math.PI) / VUELTA;
    antes = ahora;
    colocar();
    requestAnimationFrame(paso);
  }
  requestAnimationFrame(paso);
}

if (contenedor) {
  arrancar().catch((e) => {
    contenedor.classList.add('sin3d');
    console.error('No se ha podido cargar la caja 3D de la portada', e);
  });
}
