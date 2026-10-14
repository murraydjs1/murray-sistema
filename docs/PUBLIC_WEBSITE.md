# Web pública Murray DJs

La web promocional vive en `src/app/experiencia/`. El proyecto Vercel `murray-web` publica esa página en la raíz de `www.murraydjs.com`; `murraydjs.com` redirige a la dirección con `www`.

## Build

Ejecutar `pnpm build:public`. `scripts/build-public-site.mjs` prepara una aplicación Next.js estática en `.public-site/` a partir de la página original, sus estilos y una lista explícita de imágenes. No copia rutas de gestión, Server Actions, Prisma ni archivos de entorno. El resultado publicable está en `.public-site/out/`.

Configuración Vercel: framework Other, instalación `pnpm install --frozen-lockfile`, build `pnpm build:public`, output `.public-site/out`, Node.js 24. No necesita variables de base de datos ni autenticación. El proyecto está conectado al repositorio `murraydjs1/murray-sistema`, rama de producción `main`.

La página incluye contacto por WhatsApp, Instagram, selección de música mediante reproductor Spotify, preguntas frecuentes, favicon, URL canónica, robots y sitemap. Revisar a 390 y 1440 px después de cambiar el diseño; comprobar imágenes, enlaces, desplegables y reproducción externa sin enviar mensajes de prueba.

El sistema de gestión conserva su propio proyecto y URL. Para cambios de marca o fotos, actualizar las fuentes existentes y la lista de assets del script si se agrega una imagen.
