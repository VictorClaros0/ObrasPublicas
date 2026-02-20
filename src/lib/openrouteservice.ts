/**
 * OpenRouteService Directions API - rutas en coche que siguen calles y sentido.
 * API key gratis: https://openrouteservice.org/dev/#/signup
 */

const API_URL = 'https://api.openrouteservice.org/v2/directions/driving-car/geojson';

/** Coordenadas en formato [lng, lat] para la API */
function toLngLat([lat, lng]: [number, number]): [number, number] {
  return [lng, lat];
}

/**
 * Crea un polígono rectángulo que cubre el tramo [a, b] con buffer lateral.
 * Los extremos del tramo NO se extienden: así inicioObra y finObra quedan
 * en el borde del polígono y ORS puede rutear hacia/desde ellos.
 * Formato ORS GeoJSON: [lng, lat], cerrado (primero = último).
 */
function polygonAroundSegment(
  a: [number, number],
  b: [number, number],
  bufferDeg = 0.0012   // ~130 m lateral
): number[][][] {
  const [lat1, lng1] = a;
  const [lat2, lng2] = b;

  // Dirección longitudinal normalizada
  const dLat = lat2 - lat1;
  const dLng = lng2 - lng1;
  const len = Math.sqrt(dLat * dLat + dLng * dLng) || 1;

  // Vector perpendicular (lateral)
  const nPerpLat = -dLng / len * bufferDeg;
  const nPerpLng = dLat / len * bufferDeg;

  // 4 esquinas: sólo buffer lateral, sin extensión en los extremos
  const p1 = [lng1 + nPerpLng, lat1 + nPerpLat];
  const p2 = [lng2 + nPerpLng, lat2 + nPerpLat];
  const p3 = [lng2 - nPerpLng, lat2 - nPerpLat];
  const p4 = [lng1 - nPerpLng, lat1 - nPerpLat];

  return [[p1, p2, p3, p4, p1]];
}

/**
 * Obtiene la geometría de la ruta en coche entre waypoints.
 * Si se pasa avoidSegment [inicio, fin], la ruta evita ese tramo (evita la obra).
 * @returns Array de [lat, lng] para Leaflet, o null si falla
 */
export async function getDrivingRoute(
  waypoints: [number, number][],
  apiKey: string,
  avoidSegment?: [number, number][] | null
): Promise<[number, number][] | null> {
  if (waypoints.length < 2 || !apiKey.trim()) return null;
  const coordinates = waypoints.map(toLngLat);
  const body: { coordinates: number[][]; options?: { avoid_polygons?: object } } = { coordinates };
  if (avoidSegment && avoidSegment.length >= 2) {
    // ORS espera un GeoJSON geometry object (Polygon o MultiPolygon)
    body.options = {
      avoid_polygons: {
        type: 'MultiPolygon',
        coordinates: [polygonAroundSegment(avoidSegment[0], avoidSegment[1])],
      },
    };
  }
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: apiKey,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      type?: string;
      features?: Array<{
        geometry?: { type?: string; coordinates?: number[][] };
      }>;
    };
    const coords = data?.features?.[0]?.geometry?.coordinates;
    if (!coords?.length) return null;
    return coords.map(([lng, lat]) => [lat, lng]) as [number, number][];
  } catch {
    return null;
  }
}
