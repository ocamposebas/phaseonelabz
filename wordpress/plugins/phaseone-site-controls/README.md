# Phase One Site Controls

Plugin de WordPress para controlar el countdown del hero y el modo de
mantenimiento del storefront Astro.

## Instalación

1. Sube `phaseone-site-controls-v1.0.0.zip` en **Plugins > Add New Plugin > Upload Plugin**.
2. Activa **Phase One Site Controls**.
3. Abre **Site Controls** en el menú de WordPress.
4. Configura y activa el countdown.
5. Copia el token mostrado en el panel a la variable
   `PHASEONE_SITE_CONTROL_TOKEN` del servidor Astro si deseas controlar el modo
   mantenimiento desde `/status`.

El endpoint público de lectura es `/wp-json/phaseone/v1/site-control`. El token
solo autoriza el cambio de modo mantenimiento y debe permanecer en el servidor.
