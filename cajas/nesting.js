// Colocación de piezas rectangulares en la plancha (nesting).
//
// Usa el algoritmo MaxRects: guarda la lista de huecos libres (rectángulos
// máximos) y coloca cada pieza, girada o no, en el hueco que mejor encaja.
// Como las piezas de una caja son pocas (5 o 6), se prueban todos los órdenes
// posibles y dos reglas de colocación, y se queda la solución que deja el
// retal aprovechable más grande (una franja entera de la plancha) y, a igualdad,
// la que ocupa menos superficie.

const EPS = 1e-6;

/** Coloca las piezas en el orden dado. Devuelve null si alguna no cabe. */
function maxRects(items, W, H, regla) {
  let libres = [{ x: 0, y: 0, w: W, h: H }];
  const colocadas = [];
  for (const it of items) {
    let mejor = null;
    for (const f of libres) {
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
    if (!mejor) return null;
    colocadas.push({ item: it, x: mejor.x, y: mejor.y, w: mejor.w, h: mejor.h, girada: mejor.girada });
    libres = partir(libres, mejor);
  }
  return colocadas;
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

/**
 * Coloca las piezas sobre una plancha.
 * Devuelve { colocadas: [{pieza, x, y, girada}], ancho, alto, cabe, retal, aprovechamiento }.
 * ancho/alto: zona ocupada (incluido el margen). retal: {ancho, alto} del mayor sobrante entero.
 */
export function colocar(piezas, planchaAncho, planchaAlto, margen = 5, separacion = 3) {
  // Cada pieza ocupa su tamaño más la separación a derecha y abajo; el área útil
  // se amplía en una separación para que la última pieza pueda tocar el margen.
  const items = piezas.map((p) => ({ pieza: p, w: p.w + separacion, h: p.h + separacion }));
  const W = planchaAncho - 2 * margen + separacion;
  const H = planchaAlto - 2 * margen + separacion;
  const ordenes = permutaciones(items);

  const evaluar = (colocadas, Wp, Hp) => {
    const usadoX = Math.max(...colocadas.map((c) => c.x + c.w)) - separacion + 2 * margen;
    const usadoY = Math.max(...colocadas.map((c) => c.y + c.h)) - separacion + 2 * margen;
    const retalDerecha = Math.max(0, Wp - usadoX) * Hp;
    const retalAbajo = Math.max(0, Hp - usadoY) * Wp;
    return { usadoX, usadoY, retal: Math.max(retalDerecha, retalAbajo), area: usadoX * usadoY };
  };

  const buscar = (Wb, Hb, Wp, Hp, porRetal = true) => {
    let mejor = null;
    for (const orden of ordenes) {
      for (const regla of ['filas', 'columnas']) {
        const c = maxRects(orden, Wb, Hb, regla);
        if (!c) continue;
        const e = evaluar(c, Wp, Hp);
        const mejora = porRetal
          ? e.retal > mejor?.e.retal + EPS || (Math.abs(e.retal - mejor?.e.retal) < EPS && e.area < mejor.e.area - EPS)
          : e.area < mejor?.e.area - EPS;
        if (!mejor || mejora) {
          mejor = { c, e };
        }
      }
    }
    return mejor;
  };

  let mejor = buscar(W, H, planchaAncho, planchaAlto);
  let cabe = true;
  if (!mejor) {
    // No cabe: lo colocamos con el ancho de la plancha y altura libre para enseñar cuánto ocupa.
    cabe = false;
    mejor = buscar(W, 1e6, planchaAncho, planchaAlto, false) ?? buscar(1e6, 1e6, planchaAncho, planchaAlto, false);
  }

  const { c, e } = mejor;
  const areaPiezas = piezas.reduce((s, p) => s + p.w * p.h, 0);
  const retalDerecha = planchaAncho - e.usadoX;
  const retalAbajo = planchaAlto - e.usadoY;
  const retal = !cabe ? null
    : retalDerecha * planchaAlto >= retalAbajo * planchaAncho
      ? { ancho: Math.max(0, retalDerecha), alto: planchaAlto }
      : { ancho: planchaAncho, alto: Math.max(0, retalAbajo) };

  return {
    colocadas: c.map((k) => ({ pieza: k.item.pieza, x: k.x + margen, y: k.y + margen, girada: k.girada })),
    ancho: e.usadoX,
    alto: e.usadoY,
    cabe: cabe && e.usadoX <= planchaAncho + EPS && e.usadoY <= planchaAlto + EPS,
    retal,
    aprovechamiento: areaPiezas / (planchaAncho * planchaAlto),
  };
}
