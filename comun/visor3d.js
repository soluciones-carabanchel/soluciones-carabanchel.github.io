// Visor 3D común de Soluciones Carabanchel, hecho con three.js.
// Muestra piezas planas (tableros cortados con láser) colocadas en el espacio.
//
// Unidades en milímetros y eje Z hacia arriba, como en el taller.
//
// Cada pieza se describe con su contorno 2D (el mismo que va al láser), su
// grosor y dónde se coloca:
//
//   {
//     nombre: 'Frente',
//     contorno: [[x, y], ...],          // en el plano de la pieza
//     agujeros: [[[x, y], ...], ...],   // opcional
//     grosor: 3,
//     colocacion: {                     // opcional; por defecto, tumbada en el suelo
//       origen: [x, y, z],              // dónde cae el punto (0, 0) de la pieza
//       u: [1, 0, 0],                   // hacia dónde apunta el eje x de la pieza
//       v: [0, 0, 1],                   // hacia dónde apunta el eje y de la pieza
//     },                                // el grosor crece en el sentido u × v
//     color: '#c9a77c',                 // opcional
//   }
//
// Uso:
//   const { crearVisor } = await import('../comun/visor3d.js');
//   const visor = crearVisor(document.getElementById('vista3d'));
//   visor.mostrar(piezas);
//   visor.despiece(0.5);   // separa las piezas (0 = montado, 1 = muy separado)
//
// La página tiene que declarar dónde está three.js con un importmap
// (ver comun/README.md).

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const COLOR_MATERIAL = '#c9a77c'; // DM crudo
const COLOR_ARISTA = '#3b2c1e';
const COLOR_FONDO = '#fffdf8';

/** ¿Puede este navegador mostrar 3D? */
export function hayWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

/**
 * Crea un visor dentro de `contenedor` (un elemento con tamaño en la página).
 * opciones: { fondo, aristas: true, suelo: true }
 */
export function crearVisor(contenedor, opciones = {}) {
  const { fondo = COLOR_FONDO, aristas = true, suelo = true } = opciones;

  if (!hayWebGL()) {
    contenedor.innerHTML = '<p class="visor3d-aviso">Este navegador no puede mostrar la vista 3D (WebGL desactivado o no disponible).</p>';
    return visorVacio();
  }

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.style.touchAction = 'none';
  contenedor.appendChild(renderer.domElement);

  const escena = new THREE.Scene();
  escena.background = new THREE.Color(fondo);

  const camara = new THREE.PerspectiveCamera(35, 1, 1, 100000);
  camara.up.set(0, 0, 1);

  escena.add(new THREE.HemisphereLight('#ffffff', '#8a7a66', 2.2));
  const sol = new THREE.DirectionalLight('#ffffff', 1.6);
  escena.add(sol);
  escena.add(sol.target);

  const controles = new OrbitControls(camara, renderer.domElement);
  controles.enableDamping = true;
  controles.dampingFactor = 0.12;
  controles.screenSpacePanning = true;

  const grupo = new THREE.Group();
  escena.add(grupo);
  let rejilla = null;

  const matArista = new THREE.LineBasicMaterial({ color: COLOR_ARISTA });
  const materiales = new Map();
  const material = (color) => {
    if (!materiales.has(color)) {
      materiales.set(color, new THREE.MeshStandardMaterial({
        color, roughness: 0.85, metalness: 0,
        polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
      }));
    }
    return materiales.get(color);
  };

  let objetos = []; // { obj, base: Vector3, dir: Vector3 }
  let escalaDespiece = 0;
  let factorDespiece = 0;
  let pendiente = true;
  let tocado = false; // la persona ha movido la cámara
  let sueloZ = 0;

  function redimensionar() {
    const w = contenedor.clientWidth || 1;
    const h = contenedor.clientHeight || 1;
    renderer.setSize(w, h, false);
    camara.aspect = w / h;
    camara.updateProjectionMatrix();
    if (!tocado && objetos.length) encuadrar();
    pendiente = true;
  }
  const observador = new ResizeObserver(redimensionar);
  observador.observe(contenedor);
  redimensionar();

  let animacion = 0;
  function bucle() {
    animacion = requestAnimationFrame(bucle);
    if (controles.update() || pendiente) {
      renderer.render(escena, camara);
      pendiente = false;
    }
  }
  bucle();
  controles.addEventListener('change', () => { pendiente = true; });
  controles.addEventListener('start', () => { tocado = true; });

  function limpiar() {
    for (const { obj } of objetos) {
      obj.traverse((o) => o.geometry?.dispose());
      grupo.remove(obj);
    }
    objetos = [];
  }

  /** Sustituye lo que se ve por estas piezas. encuadrar: true recoloca la cámara. */
  function mostrar(piezas, { encuadrar: recolocar = true } = {}) {
    limpiar();
    for (const p of piezas) {
      const obj = crearPieza(p, material(p.color ?? COLOR_MATERIAL), aristas ? matArista : null);
      grupo.add(obj);
      objetos.push({ obj, n: normalDe(p.colocacion) });
    }
    prepararDespiece();
    if (suelo) ponerSuelo();
    if (recolocar) encuadrar();
    aplicarDespiece();
    pendiente = true;
  }

  function prepararDespiece() {
    const total = new THREE.Box3();
    objetos.forEach(({ obj }) => { obj.position.set(0, 0, 0); total.expandByObject(obj); });
    const centro = total.getCenter(new THREE.Vector3());
    const tam = total.getSize(new THREE.Vector3());
    escalaDespiece = Math.max(tam.x, tam.y, tam.z) * 0.45;
    sueloZ = total.min.z;
    for (const o of objetos) {
      const c = new THREE.Box3().setFromObject(o.obj).getCenter(new THREE.Vector3());
      const hacia = c.sub(centro);
      // Se separa en la dirección de su grosor, hacia fuera del conjunto.
      let dir = o.n.clone();
      const d = dir.dot(hacia);
      if (Math.abs(d) > 1e-6) dir.multiplyScalar(Math.sign(d));
      else dir = hacia.lengthSq() > 1e-9 ? hacia.normalize() : new THREE.Vector3();
      o.dir = dir;
    }
  }

  function aplicarDespiece() {
    for (const o of objetos) o.obj.position.copy(o.dir).multiplyScalar(factorDespiece * escalaDespiece);
    // Lo que queda más abajo se apoya en el suelo; el resto se levanta.
    grupo.position.set(0, 0, 0);
    const caja = new THREE.Box3().setFromObject(grupo);
    if (!caja.isEmpty()) grupo.position.z = sueloZ - caja.min.z;
    pendiente = true;
  }

  /** Separa las piezas: 0 montado, 1 muy separado. */
  function despiece(f) {
    factorDespiece = Math.max(0, Math.min(1, Number(f) || 0));
    aplicarDespiece();
    if (!tocado) encuadrar(); // si no han movido la cámara, que siga viéndose todo
  }

  function ponerSuelo() {
    if (rejilla) { escena.remove(rejilla); rejilla.geometry.dispose(); rejilla.material.dispose(); }
    grupo.position.set(0, 0, 0);
    const caja = new THREE.Box3().setFromObject(grupo);
    if (caja.isEmpty()) return;
    const tam = caja.getSize(new THREE.Vector3());
    const lado = Math.ceil((Math.max(tam.x, tam.y) * 2.4) / 100) * 100 || 100;
    rejilla = new THREE.GridHelper(lado, lado / 10, '#d8cfc0', '#ece5d8');
    rejilla.rotation.x = Math.PI / 2; // al plano XY
    const c = caja.getCenter(new THREE.Vector3());
    rejilla.position.set(c.x, c.y, caja.min.z - 0.05);
    escena.add(rejilla);
  }

  /** Coloca la cámara para ver todo, en una vista tres cuartos. */
  function encuadrar() {
    const caja = new THREE.Box3().setFromObject(grupo);
    if (caja.isEmpty()) return;
    const esfera = caja.getBoundingSphere(new THREE.Sphere());
    const r = Math.max(esfera.radius, 1);
    const vfov = THREE.MathUtils.degToRad(camara.fov);
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camara.aspect);
    const dist = (r / Math.sin(Math.min(vfov, hfov) / 2)) * 1.05;
    const dir = new THREE.Vector3(0.9, -1.4, 0.95).normalize();
    camara.position.copy(esfera.center).addScaledVector(dir, dist);
    camara.near = dist / 100;
    camara.far = dist * 100;
    camara.updateProjectionMatrix();
    controles.target.copy(esfera.center);
    sol.position.copy(esfera.center).add(new THREE.Vector3(-0.6, -1, 1.6).multiplyScalar(r * 4));
    sol.target.position.copy(esfera.center);
    controles.update();
    tocado = false;
    pendiente = true;
  }

  /** Quita el visor de la página y libera la memoria. */
  function destruir() {
    cancelAnimationFrame(animacion);
    observador.disconnect();
    limpiar();
    controles.dispose();
    materiales.forEach((m) => m.dispose());
    matArista.dispose();
    if (rejilla) { rejilla.geometry.dispose(); rejilla.material.dispose(); }
    renderer.dispose();
    renderer.domElement.remove();
  }

  return { mostrar, despiece, encuadrar, destruir, renderer, escena, camara };
}

function visorVacio() {
  const nada = () => {};
  return { mostrar: nada, despiece: nada, encuadrar: nada, destruir: nada };
}

function normalDe(colocacion) {
  const u = new THREE.Vector3(...(colocacion?.u ?? [1, 0, 0])).normalize();
  const v = new THREE.Vector3(...(colocacion?.v ?? [0, 1, 0])).normalize();
  return new THREE.Vector3().crossVectors(u, v).normalize();
}

/** Construye la malla de una pieza: el contorno extruido a su grosor y colocado. */
function crearPieza(p, mat, matArista) {
  const forma = new THREE.Shape(p.contorno.map(([x, y]) => new THREE.Vector2(x, y)));
  for (const a of p.agujeros ?? []) forma.holes.push(new THREE.Path(a.map(([x, y]) => new THREE.Vector2(x, y))));
  const geom = new THREE.ExtrudeGeometry(forma, { depth: p.grosor, bevelEnabled: false, curveSegments: 24 });

  // Matriz con columnas u, v, n y el origen: lleva el plano de la pieza a su sitio.
  const c = p.colocacion ?? {};
  const u = new THREE.Vector3(...(c.u ?? [1, 0, 0])).normalize();
  const v = new THREE.Vector3(...(c.v ?? [0, 1, 0])).normalize();
  const n = new THREE.Vector3().crossVectors(u, v).normalize();
  const o = new THREE.Vector3(...(c.origen ?? [0, 0, 0]));
  geom.applyMatrix4(new THREE.Matrix4().makeBasis(u, v, n).setPosition(o));

  const malla = new THREE.Mesh(geom, mat);
  malla.name = p.nombre ?? '';
  const obj = new THREE.Group();
  obj.name = malla.name;
  obj.add(malla);
  if (matArista) obj.add(new THREE.LineSegments(new THREE.EdgesGeometry(geom, 20), matArista));
  return obj;
}
