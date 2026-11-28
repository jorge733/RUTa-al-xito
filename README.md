# 🚀 RUTa al Éxito

**Tu empresa. Tus trámites. Tu paciencia.** 🇨🇱

Un simulador de emprendimiento en el que creas tu propia empresa en Chile: eliges un rubro, sobrevives a la burocracia para conseguir todos los permisos y después tienes que sacar el negocio adelante durante un año, pagando arriendo, sueldos e impuestos.

## Cómo jugar

No necesita instalación. Abre `index.html` en el navegador, o publícalo con **GitHub Pages** (Settings → Pages → Branch `main` / root).

### Instalarla como app (PWA)
Publicada en GitHub Pages (o cualquier sitio con HTTPS), se puede **instalar** en el celular o el computador y funciona **sin conexión**:

- **Android / Chrome / Edge:** botón **📲 Instalar la app** en la pantalla de inicio del juego (o "Instalar app" en el menú del navegador).
- **iPhone / iPad:** en Safari, **Compartir → Agregar a pantalla de inicio** (el botón del juego muestra estos pasos).

Se abre a pantalla completa con su propio ícono. Si cambias archivos del juego, sube `VERSION` en `sw.js` para que los jugadores reciban la actualización.

### Un mundo inmersivo en 3D
El juego ocurre a pantalla completa en una plaza de una ciudad chilena, con la cordillera al fondo.
- **Tercera persona:** caminas con **WASD** (Shift para correr), haces **clic** donde quieres ir y **arrastras** el mouse para mirar. **Q/R** giran la cámara y la rueda hace zoom.
- **En el celular:** un **joystick** abajo a la izquierda para caminar (empújalo hasta el borde para correr), **toca** donde quieras ir, **desliza** para mirar y **pellizca** para acercar. El botón azul de la derecha sirve para entrar, hablar e interactuar. Funciona en vertical y en horizontal.
- **Edificios por dentro:** entras al Registro Civil, al SII, al banco, a la municipalidad… En las oficinas públicas **sacas número en el tótem**, esperas a que la pantalla te llame ("A-68, módulo 2") y **hablas con el funcionario** en el módulo que te toca.
- **Reloj y día/noche:** el tiempo corre (1 segundo = 2 minutos). Las oficinas públicas atienden de **lunes a viernes de 9:00 a 14:00**. Si llegas tarde o se acaba el horario mientras esperas, vuelves mañana. Al atardecer se encienden los faroles y las ventanas, y a las 21:00 te vas a casa.
- **Sonido y voces:** ambiente de ciudad y de oficina, pasos, el "ding" de la pantalla de números y voces sintetizadas para los funcionarios (con el navegador). **M** silencia.
- **Tu negocio:** primero es un sitio con un letrero de "SE ARRIENDA". Cuando lo arriendas aparece el local, y al abrir se encienden las luces, tus trabajadores atienden y llegan clientes. Se gestiona desde la caja del local.
- **HUD:** el haz de luz amarilla marca tu próximo paso. **T** trámites, **N** negocio, **B** bitácora.

### Fase 1: la burocracia
- Elige entre 6 rubros: ☕ cafetería, 🥖 panadería, 🔧 taller mecánico, 💻 agencia de software, 🚚 food truck y 🛍️ tienda online.
- Recorre la ciudad (Registro Civil, SII, banco, municipalidad, SEREMI de Salud…) para hacer los trámites: Clave Única, constitución de la sociedad (EIRL, SpA o Ltda.), RUT e inicio de actividades, cuenta bancaria, arriendo, zonificación, resolución sanitaria, patente municipal y otros.
- Hay trámites que dependen de otros, oficinas que cierran el fin de semana y rechazos del tipo *"le falta una fotocopia"*. Cada rechazo te cuesta **paciencia**.
- Desde que arriendas el local, el arriendo se cobra todos los meses, así que conviene no demorarse.

### Fase 2: la operación
- Ajusta el precio y el marketing, y contrata o despide trabajadores (para contratar primero tienes que adherirte a una mutual).
- Cada mes declaras y pagas el **F29** (IVA débito − crédito + PPM) antes del día 20. Si no pagas hay multa, y si te atrasas mucho el SII te bloquea la facturación.
- Te van a tocar eventos aleatorios con decisiones: influencers, inspecciones sanitarias, competencia, cortes de luz, clientes virales, inversionistas…
- Si tu caja baja de −$3.000.000, quiebras. Si llegas a 52 semanas, se calcula el valor de tu empresa: **Quiebra, Sobreviviente, Pyme sólida o Magnate**.

La partida se guarda automáticamente en el navegador.

## Estructura

```
index.html        Página principal
manifest.webmanifest, sw.js, icons/   App instalable: manifiesto, caché sin conexión e íconos
css/styles.css    Estilos
js/data.js        Datos: rubros, lugares, trámites, sociedades, eventos
js/game.js        Lógica: tiempo, trámites, ventas, impuestos, final
js/ui.js          Interfaz y pantallas
js/pwa.js         Registro del service worker y botón "Instalar la app"
js/audio.js       Sonido procedural (Web Audio) y voces
js/3d/base.js     Texturas procedurales, materiales y modelos (personas, árboles, autos)
js/3d/exterior.js Plaza, edificios, ciudad, cordillera, cielo y ciclo día/noche
js/3d/interior.js Interiores: oficinas con fila, banco, punto digital, bodega, tu local
js/escena3d.js    Controlador: cámara, movimiento, entrar/salir, filas y reloj
js/vendor/        Three.js r128 (incluido para que funcione sin internet)
```

Para agregar rubros, trámites o eventos nuevos normalmente basta con editar `js/data.js`.

> Los montos, plazos y reglas tributarias son aproximados y simplificados para el juego. No es asesoría legal ni tributaria.
