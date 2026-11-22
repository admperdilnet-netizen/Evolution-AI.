# Evolution AI

Plataforma web para orquestar generación de video con Google Veo, Wan y LTX Video.

## Arquitectura actual

- Interfaz React + Vite.
- API Node.js/Express en `server/index.js`.
- Los proveedores que tengan credenciales configuradas reciben una solicitud en paralelo.
- El navegador consulta el estado de los trabajos y muestra los enlaces de video cuando el proveedor los devuelve.
- Las claves permanecen en variables de entorno del servidor; nunca deben colocarse en React ni subirse al repositorio.

## Desarrollo local

1. Instala Node.js 20 o superior.
2. Ejecuta `npm install`.
3. Copia `.env.example` a `.env` y completa solamente los proveedores que tengas habilitados.
4. En una terminal ejecuta `npm run dev:api`.
5. En otra terminal ejecuta `npm run dev`.
6. Abre la dirección local que muestra Vite.

## Variables de proveedores

### Google Veo
Configura un proyecto de Google Cloud, habilita Vertex AI, crea un bucket de Cloud Storage y configura Application Default Credentials en el servidor. Completa `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION` y `GOOGLE_OUTPUT_GCS_URI`.

### Wan
Crea una clave de Alibaba Cloud Model Studio. La URL, el modelo y la clave deben pertenecer a la misma región. Para Wan 2.7 usa el endpoint de video-synthesis específico de tu Workspace y región en `WAN_API_URL`, y el modelo `wan2.7-t2v`.

### LTX Video
Crea una clave de API en el Developer Console de LTX y guárdala en `LTX_API_KEY`. La API es de pago por uso.

## Despliegue

Configura el servicio como aplicación Node:
- Build command: `npm install && npm run build`
- Start command: `npm start`
- Añade las variables del archivo `.env.example` desde el panel privado de variables del hosting.
- Para Google Veo, configura las credenciales de Google Cloud como identidad/credencial segura del servicio; no publiques el archivo de cuenta de servicio.

## Límites importantes

Los proveedores generan clips individuales con límites propios: Veo suele generar clips cortos, Wan 2.7 admite hasta 15 segundos por solicitud y LTX admite hasta 20 segundos por solicitud según el modelo. La selección de 30 o 60 segundos en la interfaz representa el objetivo del proyecto, pero la composición automática de varios clips, almacenamiento permanente y exportación final de 60 segundos todavía requieren la siguiente etapa del backend. Los enlaces temporales de los proveedores no deben tratarse como almacenamiento permanente.

## Estado

El backend y los adaptadores de envío/consulta están incorporados. La generación real no puede comenzar hasta configurar las credenciales y el almacenamiento de cada proveedor. La conexión de APIs puede generar cargos; revisa los precios y límites de cada proveedor antes de habilitarlos.
