# Web pública Murray DJs

La web promocional vive en `src/app/experiencia/`. El proyecto Vercel `murray-web` publica esa página en la raíz de `www.murraydjs.com`; `murraydjs.com` redirige a la dirección con `www`.

## Build

Ejecutar `pnpm build:public`. `scripts/build-public-site.mjs` prepara una aplicación Next.js estática en `.public-site/` a partir de la página original, sus estilos y una lista explícita de imágenes. No copia rutas de gestión, Server Actions, Prisma ni archivos de entorno. El resultado publicable está en `.public-site/out/`.

Configuración Vercel: Root Directory `marketing/public-site`, con acceso a fuentes fuera de esa carpeta habilitado; framework Other y Node.js 24. El `vercel.json` de esa carpeta instala y compila desde la raíz del repositorio y copia el export a `marketing/public-site/dist`. Así no hereda el build financiero del `vercel.json` raíz. No necesita variables de base de datos ni autenticación. El proyecto está conectado al repositorio `murraydjs1/murray-sistema`, rama de producción `main`.

La página incluye contacto por WhatsApp, Instagram, selección de música mediante reproductor Spotify, preguntas frecuentes, favicon, URL canónica, robots y sitemap. Revisar a 390 y 1440 px después de cambiar el diseño; comprobar imágenes, enlaces, desplegables y reproducción externa sin enviar mensajes de prueba.

El sistema de gestión conserva su propio proyecto y URL. Para cambios de marca o fotos, actualizar las fuentes existentes y la lista de assets del script si se agrega una imagen.
