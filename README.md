# 🚀 RUTa al Éxito

**Tu empresa. Tus trámites. Tu paciencia.** 🇨🇱

Un simulador de emprendimiento en el que creas tu propia empresa en Chile: eliges un rubro, sobrevives a la burocracia para conseguir todos los permisos y después tienes que sacar el negocio adelante durante un año, pagando arriendo, sueldos e impuestos.

## Cómo jugar

No necesita instalación. Abre `index.html` en el navegador, o publícalo con **GitHub Pages** (Settings → Pages → Branch `main` / root).

### Una ciudad en 3D
El juego ocurre en una plaza en 3D con todos los edificios de los trámites alrededor y el sitio donde estará tu negocio.
- **Clic o toque** en un edificio: tu personaje camina hasta allá y entra.
- **WASD / flechas** para caminar, **E** para entrar al edificio más cercano y **rueda del mouse** para el zoom.
- Los edificios con **!** tienen trámites disponibles y el SII muestra un **$** cuando debes el F29.
- Tu negocio empieza como un sitio con un letrero de "SE ARRIENDA". Cuando lo arriendas aparece el edificio, y al abrir se encienden las luces y llegan clientes.

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
css/styles.css    Estilos
js/data.js        Datos: rubros, lugares, trámites, sociedades, eventos
js/game.js        Lógica: tiempo, trámites, ventas, impuestos, final
js/ui.js          Interfaz y pantallas
js/escena3d.js    Ciudad en 3D (edificios, personaje, clientes, cámara)
js/vendor/        Three.js r128 (incluido para que funcione sin internet)
```

Para agregar rubros, trámites o eventos nuevos normalmente basta con editar `js/data.js`.

> Los montos, plazos y reglas tributarias son aproximados y simplificados para el juego. No es asesoría legal ni tributaria.
