# Piezas comunes

Código que comparten varias herramientas.

## Visor 3D (`visor3d.js`)

Muestra en 3D piezas planas, como las que salen del láser: cada pieza es su contorno 2D extruido a su grosor y colocado en el espacio. Usa [three.js](https://threejs.org), que va copiado en `vendor/three/` (ver abajo).

Prueba: [`prueba-visor3d.html`](https://soluciones-carabanchel.github.io/comun/prueba-visor3d.html) monta la caja del generador de cajas.

### Cómo usarlo en una herramienta

1. En el `<head>` de la página, antes de cualquier `<script type="module">`, declara dónde está three.js (rutas relativas a la página):

   ```html
   <script type="importmap">
     {
       "imports": {
         "three": "../comun/vendor/three/three.module.js",
         "three/addons/": "../comun/vendor/three/addons/"
       }
     }
   </script>
   ```

2. Carga el visor solo cuando haga falta, para que la página no pese más si nadie abre la vista 3D:

   ```js
   const { crearVisor } = await import('../comun/visor3d.js');
   const visor = crearVisor(document.getElementById('vista3d')); // un elemento con altura
   visor.mostrar(piezas);
   visor.despiece(0.5); // 0 montado, 1 muy separado
   visor.encuadrar();   // vuelve a la vista inicial
   visor.destruir();    // al quitarlo de la página
   ```

3. Cada pieza:

   ```js
   {
     nombre: 'Frente',
     contorno: [[x, y], ...],          // mm, el mismo contorno que va al láser (sin kerf)
     agujeros: [[[x, y], ...], ...],   // opcional
     grosor: 3,
     colocacion: {
       origen: [x, y, z],              // dónde cae el punto (0, 0) de la pieza
       u: [1, 0, 0],                   // hacia dónde apunta el eje x de la pieza
       v: [0, 0, 1],                   // hacia dónde apunta el eje y de la pieza
     },                                // el grosor crece en el sentido u × v
     color: '#c9a77c',                 // opcional (por defecto, DM)
   }
   ```

Unidades en milímetros y Z hacia arriba.

## three.js copiado (`vendor/three/`)

Versión **r187 (0.187.0)**, licencia MIT (`vendor/three/LICENSE`). Son los archivos oficiales del paquete `three` de npm, sin tocar:

| Aquí | En el paquete |
| --- | --- |
| `three.module.js`, `three.core.js` | `build/` |
| `addons/controls/OrbitControls.js` | `examples/jsm/controls/` |

Para actualizar: descarga la nueva versión (`npm pack three@X.Y.Z`), sustituye esos mismos archivos, cambia el número de versión de este README y comprueba la página de prueba. Hazlo en una PR aparte. Solo hace falta cuando una herramienta necesite algo nuevo o haya un fallo que corregir.
