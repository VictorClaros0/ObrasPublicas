# RutaFix – Demo gestión de desvíos por obras

Web app de demo para registrar obras viales en un mapa y compartir rutas de desvío mediante código QR.

## Stack

- **React 19** + **TypeScript** (Vite)
- **Tailwind CSS**
- **Leaflet** + **react-leaflet** (OpenStreetMap)
- **Leaflet Routing Machine** (rutas en coche)
- **Supabase** (backend)
- **qrcode.react** (códigos QR)

## Configuración

1. **Clonar e instalar**
   ```bash
   npm install
   ```

2. **Supabase**
   - Crea un proyecto en [Supabase](https://supabase.com).
   - En el **SQL Editor** ejecuta el script `supabase/obras.sql` para crear la tabla `obras` y las políticas RLS.

3. **Variables de entorno**
   - Copia `.env.example` a `.env`:
     ```bash
     cp .env.example .env
     ```
   - En `.env` pon tu URL y la clave anónima del proyecto:
     ```
     VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
     VITE_SUPABASE_ANON_KEY=tu-anon-key
     ```
   - **Opcional (recomendado):** para que la ruta de desvío siga calles reales y sentido de circulación, regístrate en [OpenRouteService](https://openrouteservice.org/dev/#/signup), obtén una API key gratis y añade en `.env`:
     ```
     VITE_OPENROUTESERVICE_KEY=tu-api-key
     ```
     Sin esta clave, la línea azul se dibuja en línea recta entre waypoints (respaldo).

4. **Arrancar en local**
   ```bash
   npm run dev
   ```

## Rutas

| Ruta | Descripción |
|------|-------------|
| `/` | Inicio con enlace al panel admin |
| `/admin` | Registrar obra y punto de desvío en el mapa, guardar en Supabase y obtener QR |
| `/obra/:id` | Ver obra por ID: mapa con marcador rojo, ruta hasta el desvío y tarjeta con título/fotos |

## Uso rápido

1. Entra en **Admin**.
2. Haz **clic en el mapa** donde está la obra (aparece marcador rojo).
3. Haz **segundo clic** donde está el punto de desvío (marcador verde).
4. Rellena **título** y opcionalmente descripción y URLs de fotos.
5. Pulsa **Guardar**. Se crea la fila en Supabase y se muestra un **código QR** con la URL de la obra.
6. En **/obra/:id** se muestra el mapa con la obra, la ruta desde tu ubicación hasta el desvío (Leaflet Routing Machine) y la tarjeta con título y fotos.

## Estructura SQL (Supabase)

La tabla `obras` incluye:

- `id` (uuid, PK)
- `titulo`, `descripcion`
- `lat_obra`, `lng_obra` (punto de la obra)
- `lat_desvio`, `lng_desvio` (punto de desvío)
- `fotos` (array de URLs)
- `created_at`

Ver `supabase/obras.sql` para el DDL completo y políticas RLS.
