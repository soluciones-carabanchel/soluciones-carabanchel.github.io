import { piezasCaja, validar, colocar, tramos } from './geometria.js';
import { construirDibujo, aSVG, aDXF } from './exportar.js';

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
    tapa: f.get('tapa') === 'si',
    etiquetas: f.get('etiquetas') === 'on',
    maquina, plancha,
  };
}

let ultimoSVG = '';
let ultimoDXF = '';
let ultimoNombre = 'caja';

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
  const disposicion = colocar(piezas, cfg.plancha.ancho, cfg.plancha.alto);
  avisos.forEach((m) => mensajes.push(['aviso', m]));
  if (disposicion.cabe) {
    mensajes.push(['ok', `Las ${piezas.length} piezas caben en una plancha de ${cfg.plancha.ancho} × ${cfg.plancha.alto} mm.`]);
  } else {
    const sugerencia = cfg.maquina === 'trotec' ? ' Prueba con la Widlaser 900 o divide el archivo en varias planchas.' : ' Divide el archivo en varias planchas.';
    mensajes.push(['error', `Las piezas ocupan ${fmt(disposicion.ancho, 0)} × ${fmt(disposicion.alto, 0)} mm y no caben en la plancha.${sugerencia}`]);
  }
  $('mensajes').innerHTML = mensajes.map(([c, m]) => `<li class="${c}">${m}</li>`).join('');

  const t = cfg.grosor;
  const interior = [cfg.ancho - 2 * t, cfg.fondo - 2 * t, cfg.alto - (cfg.tapa ? 2 : 1) * t];
  resumen.innerHTML = `
    <div class="dato"><b>${fmt(cfg.ancho)} × ${fmt(cfg.fondo)} × ${fmt(cfg.alto)}</b><span>exterior (mm)</span></div>
    <div class="dato"><b>${interior.map((v) => fmt(v)).join(' × ')}</b><span>interior útil (mm)</span></div>
    <div class="dato"><b>${piezas.length}</b><span>piezas</span></div>`;

  const dibujo = construirDibujo(cfg, disposicion);
  ultimoSVG = aSVG(dibujo, `Caja ${cfg.ancho}×${cfg.fondo}×${cfg.alto} mm, grosor ${cfg.grosor} mm, kerf ${cfg.kerf} mm`);
  ultimoDXF = aDXF(dibujo);
  ultimoNombre = `caja_${cfg.ancho}x${cfg.fondo}x${cfg.alto}_e${cfg.grosor}${cfg.tapa ? '' : '_abierta'}`.replace(/,/g, '.');
  lienzo.innerHTML = ultimoSVG.replace(/^<\?xml[^>]*>\s*/, '');
  boton.disabled = false;
  $('descargarDXF').disabled = false;

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

function descargar(contenido, tipo, extension) {
  const blob = new Blob([contenido], { type: tipo });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${ultimoNombre}.${extension}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

$('descargar').addEventListener('click', () => descargar(ultimoSVG, 'image/svg+xml', 'svg'));
$('descargarDXF').addEventListener('click', () => descargar(ultimoDXF, 'application/dxf', 'dxf'));

form.addEventListener('input', actualizar);
form.addEventListener('change', actualizar);
actualizar();
