import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';

type RoutingControlProps = {
  from: [number, number] | null;
  to: [number, number];
  /** Punto a evitar (obra / calle cerrada). Se añade un waypoint intermedio para rodearlo. */
  avoid?: [number, number];
};

const LWithRouting = L as typeof L & {
  Routing?: {
    control: (opts: { waypoints: L.LatLng[]; show?: boolean; addWaypoints?: boolean; routeWhileDragging?: boolean; lineOptions?: unknown }) => { addTo: (m: L.Map) => { remove: () => void }; remove: () => void };
  };
};

/** Calcula un punto "via" para rodear la obra: ~200m perpendicular al segmento obra→destino, del lado del origen */
export function getViaPointAround(
  start: [number, number],
  end: [number, number],
  avoid: [number, number],
  offsetDegrees = 0.002
): [number, number] {
  const [obLat, obLng] = avoid;
  const dLat = end[0] - obLat;
  const dLng = end[1] - obLng;
  const perpLng = -dLat;
  const perpLat = dLng;
  const len = Math.sqrt(perpLat * perpLat + perpLng * perpLng) || 1;
  const nL = perpLat / len;
  const nLn = perpLng / len;
  const side = (start[0] - obLat) * nL + (start[1] - obLng) * nLn;
  const sign = side >= 0 ? 1 : -1;
  return [
    obLat + sign * offsetDegrees * nL,
    obLng + sign * offsetDegrees * nLn,
  ];
}

export default function RoutingControl({ from, to, avoid }: RoutingControlProps) {
  const map = useMap();
  const controlRef = useRef<{ remove: () => void } | null>(null);

  useEffect(() => {
    if (!map || !to) return;
    if (!LWithRouting.Routing) return;

    const start = from ? L.latLng(from[0], from[1]) : L.latLng(to[0], to[1]);
    const end = L.latLng(to[0], to[1]);

    const waypoints: L.LatLng[] = [start];
    if (avoid && from) {
      const via = getViaPointAround(from, to, avoid);
      waypoints.push(L.latLng(via[0], via[1]));
    }
    waypoints.push(end);

    const routingControl = LWithRouting.Routing.control({
      waypoints,
      show: true,
      addWaypoints: false,
      routeWhileDragging: false,
      lineOptions: {
        extendToWaypoints: true,
        missingRouteTolerance: 0,
        styles: [
          { color: '#0ea5e9', weight: 10, opacity: 0.9 },
        ],
      },
    }).addTo(map);

    controlRef.current = routingControl;

    return () => {
      if (controlRef.current) {
        try {
          controlRef.current.remove();
        } catch (_) {
          /* ignore */
        }
        controlRef.current = null;
      }
    };
  }, [map, from?.[0], from?.[1], to[0], to[1], avoid?.[0], avoid?.[1]]);

  return null;
}
