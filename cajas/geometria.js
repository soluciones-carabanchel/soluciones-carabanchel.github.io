// Geometría de una caja con uniones de pestañas (finger joints) para corte láser.
// Todas las medidas en milímetros.
//
// Cada pieza se dibuja como su rectángulo exterior completo; en cada borde que
// une con otra pieza se alternan "pestañas" (material que llega al borde) y
// "huecos" (material retirado una profundidad igual al grosor). Los bordes que
// encajan entre sí usan el mismo número de tramos con el patrón invertido.
//
// Patrón "A": empieza y acaba en pestaña.  Patrón "B": empieza y acaba en hueco.
// Fondo y tapa llevan A en todos sus bordes (se quedan con las esquinas).
// Frente y trasera llevan A en los cantos verticales; los laterales, B.
// Los cantos inferior y superior de las paredes llevan B (o liso si la caja es abierta).

/** Número de tramos de un borde: impar y al menos 3. */
export function tramos(longitud, anchoPestana) {
  let n = Math.round(longitud / anchoPestana);
  if (n % 2 === 0) n += longitud / anchoPestana > n ? 1 : -1;
  return Math.max(3, n);
}

function patron(tipo, n) {
  if (tipo === 'liso') return [true];
  // true = pestaña (material hasta el borde), false = hueco
  return Array.from({ length: n }, (_, i) => (tipo === 'A' ? i % 2 === 0 : i % 2 === 1));
}

/**
 * Contorno de una pieza de ancho w y alto h.
 * bordes: { abajo, derecha, arriba, izquierda } cada uno { tipo: 'A'|'B'|'liso', n }
 * Devuelve una lista de puntos [x, y] en sentido antihorario (y hacia arriba).
 */
export function contornoPieza(w, h, t, bordes) {
  const lados = [
    { b: bordes.abajo, L: w, origen: [0, 0], dir: [1, 0], dentro: [0, 1] },
    { b: bordes.derecha, L: h, origen: [w, 0], dir: [0, 1], dentro: [-1, 0] },
    { b: bordes.arriba, L: w, origen: [w, h], dir: [-1, 0], dentro: [0, -1] },
    { b: bordes.izquierda, L: h, origen: [0, h], dir: [0, -1], dentro: [1, 0] },
  ].map((l) => ({ ...l, p: patron(l.b.tipo, l.b.n) }));

  const prof = (pestana) => (pestana ? 0 : t);
  const puntos = [];
  lados.forEach((l, k) => {
    const prev = lados[(k + 3) % 4];
    const next = lados[(k + 1) % 4];
    const dPrev = prof(prev.p[prev.p.length - 1]);
    const dNext = prof(next.p[0]);
    const n = l.p.length;
    const s = l.L / n;
    for (let i = 0; i < n; i++) {
      const a = i === 0 ? dPrev : i * s;
      const b = i === n - 1 ? l.L - dNext : (i + 1) * s;
      const d = prof(l.p[i]);
      for (const u of [a, b]) {
        puntos.push([
          l.origen[0] + l.dir[0] * u + l.dentro[0] * d,
          l.origen[1] + l.dir[1] * u + l.dentro[1] * d,
        ]);
      }
    }
  });
  return limpiar(puntos);
}

/** Quita puntos repetidos y alineados. */
function limpiar(pts) {
  const eps = 1e-9;
  let r = pts.filter((p, i) => {
    const q = pts[(i + pts.length - 1) % pts.length];
    return Math.abs(p[0] - q[0]) > eps || Math.abs(p[1] - q[1]) > eps;
  });
  let cambio = true;
  while (cambio && r.length > 3) {
    cambio = false;
    for (let i = 0; i < r.length; i++) {
      const a = r[(i + r.length - 1) % r.length];
      const b = r[i];
      const c = r[(i + 1) % r.length];
      const cruz = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
      if (Math.abs(cruz) < eps) {
        r.splice(i, 1);
        cambio = true;
        break;
      }
    }
  }
  return r;
}

/**
 * Compensa el kerf: desplaza el contorno (antihorario, ortogonal) hacia fuera k/2,
 * para que tras el corte la pieza tenga la medida exacta y las uniones ajusten.
 */
export function compensarKerf(pts, kerf) {
  const o = kerf / 2;
  if (!o) return pts;
  const n = pts.length;
  const normal = (a, b) => {
    const dx = Math.sign(b[0] - a[0]);
    const dy = Math.sign(b[1] - a[1]);
    return [dy, -dx]; // normal exterior para recorrido antihorario
  };
  return pts.map((p, i) => {
    const a = pts[(i + n - 1) % n];
    const c = pts[(i + 1) % n];
    const n1 = normal(a, p);
    const n2 = normal(p, c);
    return [p[0] + (n1[0] + n2[0]) * o, p[1] + (n1[1] + n2[1]) * o];
  });
}

/**
 * Calcula las piezas de una caja a partir de sus medidas EXTERIORES.
 * opciones: { ancho, fondo, alto, grosor, pestana, kerf, tapa: true|false }
 */
export function piezasCaja({ ancho, fondo, alto, grosor: t, pestana, kerf = 0, tapa = true }) {
  const nx = tramos(ancho, pestana);
  const ny = tramos(fondo, pestana);
  const nz = tramos(alto, pestana);
  const A = (n) => ({ tipo: 'A', n });
  const B = (n) => ({ tipo: 'B', n });
  const arribaPared = (n) => (tapa ? B(n) : { tipo: 'liso', n: 1 });

  const defs = [
    { nombre: 'Fondo', w: ancho, h: fondo, bordes: { abajo: A(nx), derecha: A(ny), arriba: A(nx), izquierda: A(ny) } },
    { nombre: 'Frente', w: ancho, h: alto, bordes: { abajo: B(nx), derecha: A(nz), arriba: arribaPared(nx), izquierda: A(nz) } },
    { nombre: 'Trasera', w: ancho, h: alto, bordes: { abajo: B(nx), derecha: A(nz), arriba: arribaPared(nx), izquierda: A(nz) } },
    { nombre: 'Lateral izq.', w: fondo, h: alto, bordes: { abajo: B(ny), derecha: B(nz), arriba: arribaPared(ny), izquierda: B(nz) } },
    { nombre: 'Lateral der.', w: fondo, h: alto, bordes: { abajo: B(ny), derecha: B(nz), arriba: arribaPared(ny), izquierda: B(nz) } },
  ];
  if (tapa) {
    defs.push({ nombre: 'Tapa', w: ancho, h: fondo, bordes: { abajo: A(nx), derecha: A(ny), arriba: A(nx), izquierda: A(ny) } });
  }
  return defs.map((d) => ({
    nombre: d.nombre,
    w: d.w,
    h: d.h,
    contorno: compensarKerf(contornoPieza(d.w, d.h, t, d.bordes), kerf),
  }));
}

/** Comprueba medidas y devuelve una lista de avisos/errores legibles. */
export function validar({ ancho, fondo, alto, grosor, pestana, kerf }) {
  const errores = [];
  const avisos = [];
  for (const [k, v] of Object.entries({ ancho, fondo, alto, grosor, pestana })) {
    if (!(v > 0)) errores.push(`Falta un valor válido para «${k}».`);
  }
  if (errores.length) return { errores, avisos };
  if (Math.min(ancho, fondo, alto) < 4 * grosor) errores.push('La caja es demasiado pequeña para ese grosor (cada medida debe ser al menos 4 veces el grosor).');
  if (pestana < 2 * grosor) avisos.push('Pestañas muy estrechas para este grosor: pueden romperse. Prueba con al menos el doble del grosor.');
  if (kerf < 0 || kerf > 1) avisos.push('El kerf suele estar entre 0 y 0,5 mm. Revisa el valor.');
  for (const [nombre, L] of [['ancho', ancho], ['fondo', fondo], ['alto', alto]]) {
    const s = L / tramos(L, pestana);
    if (s < 1.5 * grosor) avisos.push(`En el ${nombre}, las pestañas salen de ${s.toFixed(1)} mm: quizá demasiado finas.`);
  }
  return { errores, avisos };
}
