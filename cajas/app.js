import { piezasCaja, validar, tramos, ensamblarCaja } from './geometria.js';
import { colocar } from './nesting.js';
import { construirDibujo, aSVG, aDXF } from './exportar.js';
import { prepararUnidades } from '../comun/unidades.js';

const MAQUINAS = {
  trotec: { nombre: 'Trotec Speedy 100', ancho: 600, alto: 300 },
  widlaser: { nombre: 'Widlaser 900', ancho: 1200, alto: 800 },
};

const $ = (id) => document.getElementById(id);
const form = $('formulario');
const fmt = (n, d = 1) => Number(n.toFixed(d)).toLocaleString('es-ES');

function leer() {
  const f = new FormData(form);
  const v = (k) => parseFloat(String(f.get(k)).replace(',', '.'));
  const maquina = f.get('maquina');
  const plancha = MAQUINAS[maquina] ?? { nombre: 'Plancha', ancho: v('planchaAncho'), alto: v('planchaAlto') };
  return {
    ancho: v('ancho'), fondo: v('fondo'), alto: v('alto'),
    grosor: v('grosor'), pestana: v('pestana'), kerf: v('kerf') || 0,
    separacion: Math.max(0, v('separacion') || 0),
    tapa: f.get('tapa') === 'si',
    etiquetas: f.get('etiquetas') === 'on',
    maquina, plancha,
  };
}

let archivos = []; // un {nombre, svg, dxf} por plancha
let ultimaCfg = null;
let visor = null; // se crea la primera vez que se abre la vista 3D

function actualizar() {
  const cfg = leer();
  $('plancha').hidden = cfg.maquina !== 'otra';

  const { errores, avisos } = validar(cfg);
  const mensajes = [];
  errores.forEach((m) => mensajes.push(['error', m]));

  const resumen = $('resumen');
  const lienzo = $('lienzo');
  const tabla = $('tabla');
  const boton = $('descargar');

  if (errores.length) {
    $('mensajes').innerHTML = mensajes.map(([c, m]) => `<li class="${c}">${m}</li>`).join('');
    resumen.innerHTML = '';
    lienzo.innerHTML = '';
    tabla.innerHTML = '';
    boton.disabled = true;
    $('descargarDXF').disabled = true;
    return;
  }

  const piezas = piezasCaja(cfg);
  ultimaCfg = cfg;
  if (visor) visor.mostrar(ensamblarCaja(cfg), { encuadrar: false });
  const disposicion = colocar(piezas, cfg.plancha.ancho, cfg.plancha.alto, 5, Math.max(cfg.separacion, cfg.kerf));
  const { planchas, noCaben } = disposicion;
  const medidaPlancha = `${cfg.plancha.ancho} × ${cfg.plancha.alto} mm`;
  avisos.forEach((m) => mensajes.push(['aviso', m]));
  if (noCaben.length) {
    const lista = noCaben.map((p) => `«${p.nombre}» (${fmt(p.w, 0)} × ${fmt(p.h, 0)} mm)`).join(', ');
    mensajes.push(['error', (noCaben.length === 1 ? `La pieza ${lista} es más grande` : `Las piezas ${lista} son más grandes`) +
      ` que la plancha de ${medidaPlancha} y no caben ni giradas, así que no salen en el archivo.` +
      (cfg.maquina === 'trotec' ? ' Prueba con la Widlaser 900.' : '')]);
  }
  if (planchas.length === 1 && !noCaben.length) {
    const r = planchas[0].retal;
    const pct = Math.round(planchas[0].aprovechamiento * 100);
    mensajes.push(['ok', `Las ${piezas.length} piezas caben en una plancha de ${medidaPlancha} (ocupan el ${pct} % de la plancha).` +
      (r && r.ancho > 20 && r.alto > 20 ? ` Queda libre un retal de ${fmt(r.ancho, 0)} × ${fmt(r.alto, 0)} mm.` : '')]);
  } else if (planchas.length > 1) {
    let sugerencia = '';
    if (cfg.maquina === 'trotec') {
      const w = MAQUINAS.widlaser;
      const enWidlaser = colocar(piezas, w.ancho, w.alto, 5, Math.max(cfg.separacion, cfg.kerf));
      if (enWidlaser.cabe) sugerencia = ' En la Widlaser 900 cabrían en una sola plancha.';
    }
    mensajes.push(['aviso', `No caben en una sola plancha: se reparten en ${planchas.length} planchas de ${medidaPlancha}` +
      ` (${planchas.map((pl) => pl.colocadas.length).join(' + ')} piezas). Al descargar sale un archivo por plancha.${sugerencia}`]);
  }
  $('mensajes').innerHTML = mensajes.map(([c, m]) => `<li class="${c}">${m}</li>`).join('');

  const t = cfg.grosor;
  const interior = [cfg.ancho - 2 * t, cfg.fondo - 2 * t, cfg.alto - (cfg.tapa ? 2 : 1) * t];
  resumen.innerHTML = `
    <div class="dato"><b>${fmt(cfg.ancho)} × ${fmt(cfg.fondo)} × ${fmt(cfg.alto)}</b><span>exterior (mm)</span></div>
    <div class="dato"><b>${interior.map((v) => fmt(v)).join(' × ')}</b><span>interior útil (mm)</span></div>
    <div class="dato"><b>${piezas.length}</b><span>piezas</span></div>`;

  const titulo = `Caja ${cfg.ancho}×${cfg.fondo}×${cfg.alto} mm, grosor ${cfg.grosor} mm, kerf ${cfg.kerf} mm`;
  const base = `caja_${cfg.ancho}x${cfg.fondo}x${cfg.alto}_e${cfg.grosor}${cfg.tapa ? '' : '_abierta'}`.replace(/,/g, '.');
  const n = planchas.length;
  archivos = planchas.map((pl, i) => {
    const dibujo = construirDibujo(cfg, pl);
    const sufijo = n > 1 ? `_plancha${i + 1}de${n}` : '';
    return {
      nombre: base + sufijo,
      svg: aSVG(dibujo, n > 1 ? `${titulo} · plancha ${i + 1} de ${n}` : titulo),
      dxf: aDXF(dibujo),
    };
  });
  const sinXml = (svg) => svg.replace(/^<\?xml[^>]*>\s*/, '');
  lienzo.innerHTML = n === 1
    ? sinXml(archivos[0].svg)
    : archivos.map((a, i) => `<figure class="plancha">
        <figcaption>Plancha ${i + 1} de ${n} · ${planchas[i].colocadas.map((c) => c.pieza.nombre).join(', ')}</figcaption>
        ${sinXml(a.svg)}
      </figure>`).join('');
  boton.disabled = !n;
  $('descargarDXF').disabled = !n;

  const pest = (L) => {
    const n = tramos(L, cfg.pestana);
    return `${n} × ${fmt(L / n)}`;
  };
  tabla.innerHTML = `
    <thead><tr><th>Pieza</th><th class="num">Medida (mm)</th><th class="num">Uds.</th></tr></thead>
    <tbody>
      <tr><td>${cfg.tapa ? 'Fondo y tapa' : 'Fondo'}</td><td class="num">${fmt(cfg.ancho)} × ${fmt(cfg.fondo)}</td><td class="num">${cfg.tapa ? 2 : 1}</td></tr>
      <tr><td>Frente y trasera</td><td class="num">${fmt(cfg.ancho)} × ${fmt(cfg.alto)}</td><td class="num">2</td></tr>
      <tr><td>Laterales</td><td class="num">${fmt(cfg.fondo)} × ${fmt(cfg.alto)}</td><td class="num">2</td></tr>
    </tbody>
    <tfoot><tr><td colspan="3" style="color:var(--suave);font-size:13px;padding-top:10px">
      Tramos de pestaña: ancho ${pest(cfg.ancho)} mm · fondo ${pest(cfg.fondo)} mm · alto ${pest(cfg.alto)} mm
    </td></tr></tfoot>`;
}

function descargar(contenido, tipo, nombre) {
  const blob = new Blob([contenido], { type: tipo });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** Descarga un archivo por plancha, con una pausa para que el navegador no se salte ninguno. */
function descargarTodo(formato, tipo) {
  archivos.forEach((a, i) => setTimeout(() => descargar(a[formato], tipo, `${a.nombre}.${formato}`), i * 400));
}

$('descargar').addEventListener('click', () => descargarTodo('svg', 'image/svg+xml'));
$('descargarDXF').addEventListener('click', () => descargarTodo('dxf', 'application/dxf'));

// Vista 3D en la ventanita: three.js solo se descarga si alguien la abre.
let cargando = null;
function abrir3D() {
  if (cargando) return cargando;
  const contenedor = $('vista3d');
  cargando = (async () => {
    $('abrir3d').remove();
    try {
      const { crearVisor } = await import('../comun/visor3d.js');
      visor = crearVisor(contenedor, { fondo: '#f2f2ee' });
    } catch (e) {
      contenedor.innerHTML = '<p class="visor3d-aviso">No se ha podido cargar la vista 3D.</p>';
      console.error(e);
      return;
    }
    if (ultimaCfg) {
      visor.mostrar(ensamblarCaja(ultimaCfg), { encuadrar: true });
      visor.despiece($('despiece').value);
    }
  })();
  return cargando;
}

async function ampliar3D(amplia) {
  $('ventana3d').classList.toggle('amplia', amplia);
  $('ampliar3d').setAttribute('aria-expanded', String(amplia));
  $('ampliar3d').textContent = amplia ? '⤡ Reducir' : '⤢ Ampliar';
  await abrir3D();
  // El visor se redimensiona solo; encuadramos para que la caja llene el nuevo tamaño.
  requestAnimationFrame(() => visor?.encuadrar());
}

$('abrir3d').addEventListener('click', abrir3D);
$('ampliar3d').addEventListener('click', () => ampliar3D(!$('ventana3d').classList.contains('amplia')));
$('despiece').addEventListener('input', (e) => visor?.despiece(e.target.value));
$('encuadrar').addEventListener('click', () => visor?.encuadrar());
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && $('ventana3d').classList.contains('amplia')) ampliar3D(false);
});

prepararUnidades(form);
form.addEventListener('input', actualizar);
form.addEventListener('change', actualizar);
actualizar();
