// Exportación del despiece a SVG y DXF. Medidas en milímetros.
//
// Capas según las plantillas del FabLab:
//   corte exterior   → verde   (SVG #00FF00, DXF color 3)
//   grabado vectorial → rojo    (SVG #FF0000, DXF color 1)
//   marco de plancha → magenta (SVG #FF00FF, DXF color 6)

export const CAPAS = {
  corte: { svg: 'corte-exterior', dxf: 'CORTE_EXTERIOR', color: '#00FF00', aci: 3 },
  grabado: { svg: 'grabado-vectorial', dxf: 'GRABADO_VECTORIAL', color: '#FF0000', aci: 1 },
  marco: { svg: 'marco', dxf: 'MARCO', color: '#FF00FF', aci: 6 },
};

import { textoATrazos, anchoTexto } from '../comun/fuente-trazo.js';

const num = (n) => Number(n.toFixed(3));

/**
 * Pasa las piezas colocadas a un dibujo neutro (y hacia abajo, origen arriba a la izquierda).
 * Devuelve { ancho, alto, marco: {ancho, alto}, cortes: [[x,y]...][], textos: [{x,y,tam,texto,trazos}] }
 * Los textos van en fuente de trazo único: `trazos` son polilíneas abiertas que el
 * láser graba en una sola pasada.
 */
export function construirDibujo(cfg, disposicion) {
  const ancho = Math.max(cfg.plancha.ancho, disposicion.ancho);
  const alto = Math.max(cfg.plancha.alto, disposicion.alto);
  const cortes = [];
  const textos = [];
  for (const { pieza: p, x, y, girada } of disposicion.colocadas) {
    const tr = girada
      ? ([px, py]) => [x + py, y + px]
      : ([px, py]) => [x + px, y + (p.h - py)];
    cortes.push(p.contorno.map(tr));
    if (cfg.etiquetas) {
      const w = girada ? p.h : p.w;
      const h = girada ? p.w : p.h;
      const tam = Math.max(3, Math.min(8, h / 7, (w * 0.8) / anchoTexto(p.nombre, 1)));
      const cx = x + w / 2;
      const cy = y + h / 2;
      textos.push({ x: cx, y: cy, tam, texto: p.nombre, trazos: textoATrazos(p.nombre, cx, cy, tam) });
    }
  }
  return { ancho, alto, marco: { ancho: cfg.plancha.ancho, alto: cfg.plancha.alto }, cortes, textos };
}

export function aSVG(d, titulo = '') {
  const trazo = 0.01; // línea fina (hairline) para que el láser la trate como vector
  const paths = d.cortes.map((c) => `<path d="${c.map(([x, y], i) => `${i ? 'L' : 'M'}${num(x)} ${num(y)}`).join('')}Z"/>`);
  const linea = (t) => t.map(([x, y], i) => `${i ? 'L' : 'M'}${num(x)} ${num(y)}`).join('');
  const textos = d.textos.map((t) => `<path data-texto="${t.texto}" d="${t.trazos.map(linea).join('')}"/>`);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${num(d.ancho)}mm" height="${num(d.alto)}mm" viewBox="0 0 ${num(d.ancho)} ${num(d.alto)}">
  <title>${titulo}</title>
  <g id="${CAPAS.marco.svg}" class="marco" fill="none" stroke="${CAPAS.marco.color}" stroke-width="${trazo}">
    <rect x="0" y="0" width="${num(d.marco.ancho)}" height="${num(d.marco.alto)}"/>
  </g>
  <g id="${CAPAS.grabado.svg}" class="grabado" fill="none" stroke="${CAPAS.grabado.color}" stroke-width="${trazo}" stroke-linecap="round" stroke-linejoin="round">
    ${textos.join('\n    ')}
  </g>
  <g id="${CAPAS.corte.svg}" class="corte" fill="none" stroke="${CAPAS.corte.color}" stroke-width="${trazo}" stroke-linejoin="miter">
    ${paths.join('\n    ')}
  </g>
</svg>`;
}

/**
 * DXF R12 (AC1009): el formato más compatible (Illustrator, Rhino, AutoCAD, LibreCAD,
 * software de los láseres). Cada tipo de línea va en su capa con su color, y las
 * entidades usan el color «por capa». Unidades: milímetros (y hacia arriba).
 */
export function aDXF(d) {
  const L = [];
  const g = (codigo, valor) => L.push(String(codigo), String(valor));
  const Y = (y) => num(d.alto - y);

  g(0, 'SECTION'); g(2, 'HEADER');
  g(9, '$ACADVER'); g(1, 'AC1009');
  g(9, '$INSBASE'); g(10, 0); g(20, 0); g(30, 0);
  g(9, '$EXTMIN'); g(10, 0); g(20, 0); g(30, 0);
  g(9, '$EXTMAX'); g(10, num(d.ancho)); g(20, num(d.alto)); g(30, 0);
  g(0, 'ENDSEC');

  g(0, 'SECTION'); g(2, 'TABLES');
  g(0, 'TABLE'); g(2, 'LTYPE'); g(70, 1);
  g(0, 'LTYPE'); g(2, 'CONTINUOUS'); g(70, 0); g(3, 'Solid line'); g(72, 65); g(73, 0); g(40, 0);
  g(0, 'ENDTAB');
  const capas = [CAPAS.corte, CAPAS.grabado, CAPAS.marco];
  g(0, 'TABLE'); g(2, 'LAYER'); g(70, capas.length);
  for (const c of capas) {
    g(0, 'LAYER'); g(2, c.dxf); g(70, 0); g(62, c.aci); g(6, 'CONTINUOUS');
  }
  g(0, 'ENDTAB');
  g(0, 'TABLE'); g(2, 'STYLE'); g(70, 1);
  g(0, 'STYLE'); g(2, 'STANDARD'); g(70, 0); g(40, 0); g(41, 1); g(50, 0); g(71, 0); g(42, 2.5); g(3, 'txt'); g(4, '');
  g(0, 'ENDTAB');
  g(0, 'ENDSEC');

  const polilinea = (capa, puntos, cerrada = true) => {
    g(0, 'POLYLINE'); g(8, capa); g(66, 1); g(10, 0); g(20, 0); g(30, 0); g(70, cerrada ? 1 : 0); // 70=1: cerrada
    for (const [x, y] of puntos) {
      g(0, 'VERTEX'); g(8, capa); g(10, num(x)); g(20, Y(y)); g(30, 0);
    }
    g(0, 'SEQEND'); g(8, capa);
  };

  g(0, 'SECTION'); g(2, 'ENTITIES');
  const m = d.marco;
  polilinea(CAPAS.marco.dxf, [[0, 0], [m.ancho, 0], [m.ancho, m.alto], [0, m.alto]]);
  for (const c of d.cortes) polilinea(CAPAS.corte.dxf, c);
  // Textos en trazo único: polilíneas abiertas, no entidades TEXT (que el láser rellenaría o
  // contornearía con la fuente del programa).
  for (const t of d.textos) for (const tr of t.trazos) polilinea(CAPAS.grabado.dxf, tr, false);
  g(0, 'ENDSEC');
  g(0, 'EOF');
  return L.join('\r\n') + '\r\n';
}
