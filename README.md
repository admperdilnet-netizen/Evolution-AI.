# Evolution AI

Plataforma web de generación de video con una integración centralizada a fal.ai.

## Motores disponibles

La aplicación incluye adaptadores configurables para:
- Google Veo 3.1 Fast
- Kling 3.0 Standard
- Wan 2.7
- ByteDance Seedance 2.0 Fast
- LTX 2.3

Todos se llaman mediante la misma API de fal.ai y su cola de trabajos. El servidor puede enviar la misma idea a varios modelos en paralelo, consultar sus estados y devolver las URLs de los videos terminados.

## Seguridad y control de costes

- La única clave necesaria para activar estos modelos es `FAL_KEY`.
- La clave se guarda únicamente en variables privadas del servidor; nunca en React, en el navegador ni en GitHub.
- Por precaución, `FAL_MAX_MODELS=1` por defecto. Se puede subir a 3 o 5 después de revisar el saldo y el precio de cada modelo.
- El endpoint de generación tiene un límite de solicitudes por hora.
- Los proveedores cobran por uso. En particular, Veo y Kling pueden cobrar por segundo de video; ejecutar varios modelos en paralelo multiplica el coste.

## Desarrollo local

1. Instala Node.js 20 o superior.
2. Ejecuta `npm install`.
3. Copia `.env.example` a `.env`.
4. Añade tu clave fal en `FAL_KEY` solo en el archivo local privado.
5. Ejecuta `npm run dev:api` en una terminal.
6. Ejecuta `npm run dev` en otra terminal y abre la dirección que indique Vite.

## Modelos configurables

Usa `FAL_MODELS` para seleccionar endpoints disponibles separados por comas. IDs integrados:
- `fal-ai/veo3.1/fast`
- `fal-ai/kling-video/v3/standard/text-to-video`
- `fal-ai/wan/v2.7/text-to-video`
- `bytedance/seedance-2.0/fast/text-to-video`
- `fal-ai/ltx-2.3-22b/text-to-video`

El número máximo efectivo de modelos simultáneos se limita mediante `FAL_MAX_MODELS` (1 a 5).

## Despliegue

Configura el hosting como servicio Node:
- Build: `npm install && npm run build`
- Start: `npm start`
- Añade `FAL_KEY`, `FAL_MAX_MODELS`, `FAL_MODELS`, `GENERATION_LIMIT_PER_HOUR`, `APP_ORIGIN` y `NODE_ENV=production` como variables privadas.

No hay que publicar la clave API en el repositorio.

## Estado y límites actuales

La interfaz, backend, catálogo multimotor, envío paralelo y consulta de la cola están incorporados. La generación real se activa al configurar FAL_KEY.

Cada modelo produce clips cortos con límites propios (por ejemplo, Veo 3.1 produce hasta 8 segundos por generación; Kling, Wan y Seedance admiten clips de hasta 15 segundos según el endpoint). La selección de 30 o 60 segundos expresa la duración objetivo del proyecto, pero el montaje automático de varias escenas en un MP4 final de 30/60 segundos, el almacenamiento permanente y la edición de audio/subtítulos son etapas pendientes. No se debe anunciar un video de 60 segundos terminado hasta implementar y probar ese montaje.
