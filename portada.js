// Portada: en la ficha de cajas, una caja montada que gira sola y va cambiando
// de medidas. No es interactiva. Usa el visor 3D común y la geometría real del
// generador, así que las pestañas se recalculan al crecer y menguar.
// Si no hay WebGL o falla la carga, se queda el dibujo SVG que ya hay.

const contenedor = document.getElementById('caja3d');
const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;

const MIN = { ancho: 70, fondo: 60, alto: 40 };
const MAX = { ancho: 190, fondo: 150, alto: 130 };
const VUELTA = 14;      // segundos por vuelta
const CAMBIO = 2.6;     // segundos entre medidas nuevas

const azar = (k) => MIN[k] + Math.random() * (MAX[k] - MIN[k]);
const suave = (x) => x * x * (3 - 2 * x);

async function arrancar() {
  const { crearVisor, hayWebGL } = await import('./comun/visor3d.js');
  if (!hayWebGL()) return;
  const { ensamblarCaja } = await import('./cajas/geometria.js');

  const marco = document.createElement('div');
  marco.className = 'lienzo-portada';
  marco.setAttribute('aria-hidden', 'true');
  contenedor.replaceChildren(marco);
  const visor = crearVisor(marco, { suelo: false, fondo: '#f2f2ee' });
  const { camara } = visor;

  const caja = (m) => ensamblarCaja({
    ancho: Math.round(m.ancho), fondo: Math.round(m.fondo), alto: Math.round(m.alto),
    grosor: 3, pestana: 10, kerf: 0, tapa: false,
  });

  // Encuadre fijo, pensado para la caja más grande.
  visor.mostrar(caja(MAX), { encuadrar: true });
  const centro = { x: MAX.ancho / 2, y: MAX.fondo / 2, z: MAX.alto / 2 };
  const CERCA = 0.7; // el encuadre del visor deja margen de sobra para una ficha
  const dx = (camara.position.x - centro.x) * CERCA;
  const dy = (camara.position.y - centro.y) * CERCA;
  const radio = Math.hypot(dx, dy);
  const altura = centro.z + (camara.position.z - centro.z) * CERCA;
  let angulo = Math.atan2(dy, dx);

  let desde = { ancho: 150, fondo: 100, alto: 80 };
  let hacia = { ancho: azar('ancho'), fondo: azar('fondo'), alto: azar('alto') };
  let inicioCambio = performance.now();
  let ultima = '';
  visor.mostrar(caja(desde), { encuadrar: false });
  if (quieto) return;

  let antes = performance.now();
  function paso(ahora) {
    const dt = Math.min(0.1, (ahora - antes) / 1000);
    antes = ahora;
    angulo += (dt * 2 * Math.PI) / VUELTA;
    camara.position.set(centro.x + radio * Math.cos(angulo), centro.y + radio * Math.sin(angulo), altura);

    let f = (ahora - inicioCambio) / (CAMBIO * 1000);
    if (f >= 1) {
      desde = hacia;
      hacia = { ancho: azar('ancho'), fondo: azar('fondo'), alto: azar('alto') };
      inicioCambio = ahora;
      f = 0;
    }
    const k = suave(f);
    const m = {};
    for (const d of ['ancho', 'fondo', 'alto']) m[d] = desde[d] + (hacia[d] - desde[d]) * k;
    const clave = `${Math.round(m.ancho)}x${Math.round(m.fondo)}x${Math.round(m.alto)}`;
    if (clave !== ultima) {
      visor.mostrar(caja(m), { encuadrar: false });
      ultima = clave;
    }
    requestAnimationFrame(paso);
  }
  requestAnimationFrame(paso);
}

if (contenedor) {
  arrancar().catch((e) => console.error('No se ha podido cargar la caja 3D de la portada', e));
}
