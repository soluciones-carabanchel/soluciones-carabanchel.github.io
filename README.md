# Soluciones Carabanchel

Herramientas libres para diseñadores de barrio.

Una colección de pequeñas aplicaciones que funcionan directamente en el navegador, pensadas para resolver problemas habituales de taller: cortar, grabar, imprimir y construir. Nacen de la experiencia de un FabLab de escuela de diseño, pero están abiertas a cualquiera.

Web: https://soluciones-carabanchel.github.io

## Herramientas

| Herramienta | Para qué sirve | Estado |
| --- | --- | --- |
| [Generador de cajas con pestañas](https://soluciones-carabanchel.github.io/cajas/) | Introduces las medidas y el grosor del material y descargas el despiece listo para corte láser | Primera versión |

## Principios

- **Sin instalar nada.** Todo funciona en el navegador, también en el móvil.
- **Pensado para el taller.** Los archivos salen listos para la máquina, con las convenciones de capas y colores que usamos en el FabLab.
- **Libre.** El código está bajo licencia MIT: puedes usarlo, copiarlo y adaptarlo.

## Hacer una herramienta nueva

Cada herramienta vive en su propia carpeta y usa los estilos comunes de `estilos.css`: cabecera, intro, panel de datos, campos con unidades, avisos, vista previa, leyenda de capas con los colores del FabLab, botones de descarga, tabla de piezas y notas plegables. Para empezar, copia la carpeta [`muestrario/`](https://soluciones-carabanchel.github.io/muestrario/), que enseña todas esas piezas, y en la página de la nueva herramienta deja solo los estilos que sean exclusivos de ella.

## Colaborar

¿Tienes una idea, encontraste un fallo o quieres proponer una herramienta? Abre un *issue* en este repositorio.

## Licencia

[MIT](LICENSE)
