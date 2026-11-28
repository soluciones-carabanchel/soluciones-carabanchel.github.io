// Colocación de piezas rectangulares en una o varias planchas (nesting).
//
// Usa el algoritmo MaxRects: cada plancha guarda su lista de huecos libres
// (rectángulos máximos) y cada pieza, girada o no, va al hueco que mejor encaja.
// Si una pieza no cabe en ninguna de las planchas abiertas, se abre otra plancha
// igual. Se prueban muchos órdenes de piezas y dos reglas de colocación, y se
// queda la solución que usa menos planchas; a igualdad, la que deja los retales
// aprovechables más grandes (franjas enteras de plancha) y ocupa menos superficie.

const EPS = 1e-6;
const MAX_PERMUTAR = 7; // con más piezas, en vez de todos los órdenes se prueban unos cuantos

const plancha = (W, H) => ({ libres: [{ x: 0, y: 0, w: W, h: H }], colocadas: [] });

/** Intenta poner una pieza en una plancha. Devuelve true si cabe (y la deja colocada). */
function meter(pl, it, regla) {
  let mejor = null;
  for (const f of pl.libres) {
    for (const girada of [false, true]) {
      const w = girada ? it.h : it.w;
      const h = girada ? it.w : it.h;
      if (w > f.w + EPS || h > f.h + EPS) continue;
      // regla 'filas': lo más arriba posible; 'columnas': lo más a la izquierda posible
      const k = regla === 'filas' ? [f.y + h, f.x] : [f.x + w, f.y];
      if (!mejor || k[0] < mejor.k[0] - EPS || (Math.abs(k[0] - mejor.k[0]) < EPS && k[1] < mejor.k[1])) {
        mejor = { k, x: f.x, y: f.y, w, h, girada };
      }
    }
  }
  if (!mejor) return false;
  pl.colocadas.push({ item: it, x: mejor.x, y: mejor.y, w: mejor.w, h: mejor.h, girada: mejor.girada });
  pl.libres = partir(pl.libres, mejor);
  return true;
}

/** Reparte las piezas en el orden dado: cada una va a la primera plancha donde quepa. */
function repartir(items, W, H, regla) {
  const planchas = [];
  for (const it of items) {
    if (planchas.some((pl) => meter(pl, it, regla))) continue;
    const nueva = plancha(W, H);
    meter(nueva, it, regla); // ya sabemos que cabe en una plancha vacía
    planchas.push(nueva);
  }
  return planchas;
}

/** Quita el rectángulo ocupado de los huecos libres y conserva solo los máximos. */
function partir(libres, r) {
  const nuevos = [];
  for (const f of libres) {
    const solapa = r.x < f.x + f.w - EPS && r.x + r.w > f.x + EPS && r.y < f.y + f.h - EPS && r.y + r.h > f.y + EPS;
    if (!solapa) { nuevos.push(f); continue; }
    if (r.x > f.x + EPS) nuevos.push({ x: f.x, y: f.y, w: r.x - f.x, h: f.h });
    if (r.x + r.w < f.x + f.w - EPS) nuevos.push({ x: r.x + r.w, y: f.y, w: f.x + f.w - (r.x + r.w), h: f.h });
    if (r.y > f.y + EPS) nuevos.push({ x: f.x, y: f.y, w: f.w, h: r.y - f.y });
    if (r.y + r.h < f.y + f.h - EPS) nuevos.push({ x: f.x, y: r.y + r.h, w: f.w, h: f.y + f.h - (r.y + r.h) });
  }
  return nuevos.filter((a, i) => !nuevos.some((b, j) => j !== i &&
    a.x >= b.x - EPS && a.y >= b.y - EPS && a.x + a.w <= b.x + b.w + EPS && a.y + a.h <= b.y + b.h + EPS &&
    (j < i || a.w !== b.w || a.h !== b.h || a.x !== b.x || a.y !== b.y)));
}

/** Todos los órdenes distintos (las piezas iguales no se permutan entre sí). */
function permutaciones(items) {
  const res = [];
  const usados = new Array(items.length).fill(false);
  const actual = [];
  const clave = (it) => `${it.w}x${it.h}`;
  (function rec() {
    if (actual.length === items.length) { res.push([...actual]); return; }
    const vistas = new Set();
    items.forEach((it, i) => {
      if (usados[i] || vistas.has(clave(it))) return;
      vistas.add(clave(it));
      usados[i] = true; actual.push(it);
      rec();
      usados[i] = false; actual.pop();
    });
  })();
  return res;
}

/** Órdenes a probar: todos si son pocas piezas; si no, unas cuantas ordenaciones típicas. */
function ordenes(items) {
  if (items.length <= MAX_PERMUTAR) return permutaciones(items);
  const por = (f) => [...items].sort((a, b) => f(b) - f(a));
  return [
    por((it) => it.w * it.h),
    por((it) => Math.max(it.w, it.h)),
    por((it) => it.h),
    por((it) => it.w),
    por((it) => it.w + it.h),
  ];
}

/**
 * Coloca las piezas en tantas planchas iguales como haga falta.
 * Devuelve {
 *   planchas: [{ colocadas: [{pieza, x, y, girada}], ancho, alto, retal, aprovechamiento }],
 *   noCaben: [pieza],   // piezas más grandes que la plancha (ni giradas caben)
 *   cabe,               // true si todo va en una sola plancha
 * }
 * ancho/alto de cada plancha: zona ocupada (incluido el margen). retal: {ancho, alto}
 * del mayor sobrante entero de esa plancha.
 */
export function colocar(piezas, planchaAncho, planchaAlto, margen = 5, separacion = 3) {
  // Cada pieza ocupa su tamaño más la separación a derecha y abajo; el área útil
  // se amplía en una separación para que la última pieza pueda tocar el margen.
  const W = planchaAncho - 2 * margen + separacion;
  const H = planchaAlto - 2 * margen + separacion;
  const items = [];
  const noCaben = [];
  for (const p of piezas) {
    const it = { pieza: p, w: p.w + separacion, h: p.h + separacion };
    const entra = (it.w <= W + EPS && it.h <= H + EPS) || (it.h <= W + EPS && it.w <= H + EPS);
    if (entra) items.push(it);
    else noCaben.push(p);
  }

  const medir = (pl) => {
    const usadoX = Math.max(...pl.colocadas.map((c) => c.x + c.w)) - separacion + 2 * margen;
    const usadoY = Math.max(...pl.colocadas.map((c) => c.y + c.h)) - separacion + 2 * margen;
    const retalDerecha = Math.max(0, planchaAncho - usadoX);
    const retalAbajo = Math.max(0, planchaAlto - usadoY);
    const retal = retalDerecha * planchaAlto >= retalAbajo * planchaAncho
      ? { ancho: retalDerecha, alto: planchaAlto }
      : { ancho: planchaAncho, alto: retalAbajo };
    return { usadoX, usadoY, retal, areaRetal: retal.ancho * retal.alto, area: usadoX * usadoY };
  };

  let mejor = null;
  if (items.length) {
    for (const orden of ordenes(items)) {
      for (const regla of ['filas', 'columnas']) {
        const pls = repartir(orden, W, H, regla);
        const medidas = pls.map(medir);
        const e = {
          n: pls.length,
          retal: medidas.reduce((s, m) => s + m.areaRetal, 0),
          area: medidas.reduce((s, m) => s + m.area, 0),
        };
        const mejora = !mejor || e.n < mejor.e.n ||
          (e.n === mejor.e.n && (e.retal > mejor.e.retal + EPS ||
            (Math.abs(e.retal - mejor.e.retal) < EPS && e.area < mejor.e.area - EPS)));
        if (mejora) mejor = { pls, medidas, e };
      }
    }
  }

  const planchas = mejor ? mejor.pls.map((pl, i) => {
    const m = mejor.medidas[i];
    const areaPiezas = pl.colocadas.reduce((s, c) => s + c.item.pieza.w * c.item.pieza.h, 0);
    return {
      colocadas: pl.colocadas.map((k) => ({ pieza: k.item.pieza, x: k.x + margen, y: k.y + margen, girada: k.girada })),
      ancho: m.usadoX,
      alto: m.usadoY,
      retal: m.retal,
      aprovechamiento: areaPiezas / (planchaAncho * planchaAlto),
    };
  }) : [];

  return { planchas, noCaben, cabe: planchas.length <= 1 && noCaben.length === 0 };
}
