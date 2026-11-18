import { LatLng } from './locationService';

export interface RouteData {
  coordinates: LatLng[];
  distanceMeters: number;
  durationSeconds: number;
}

/** Codifică puncte de coordonate în string polyline compact (format Google) */
export function encodePolyline(points: LatLng[]): string {
  let result = '';
  let prevLat = 0;
  let prevLng = 0;

  for (const point of points) {
    const lat = Math.round(point.latitude * 1e5);
    const lng = Math.round(point.longitude * 1e5);
    const dlat = lat - prevLat;
    const dlng = lng - prevLng;

    result += encodeSignedInteger(dlat);
    result += encodeSignedInteger(dlng);

    prevLat = lat;
    prevLng = lng;
  }

  return result;
}

function encodeSignedInteger(value: number): string {
  let sgn_value = value << 1;
  if (value < 0) {
    sgn_value = ~sgn_value;
  }
  let encoded = '';
  while (sgn_value >= 0x20) {
    encoded += String.fromCharCode((0x20 | (sgn_value & 0x1f)) + 63);
    sgn_value >>= 5;
  }
  encoded += String.fromCharCode(sgn_value + 63);
  return encoded;
}

/** Decodifică string-ul polyline returnat de Google în puncte de coordonate */
export function decodePolyline(encoded: string): LatLng[] {
  const points: LatLng[] = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }

  return points;
}

export type TravelMode = 'DRIVE' | 'WALK';

export async function fetchRoute(
  origin: LatLng,
  destination: LatLng,
  apiKey: string,
  travelMode: TravelMode = 'DRIVE',
): Promise<RouteData> {
  const url = 'https://routes.googleapis.com/directions/v2:computeRoutes';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      // FieldMask-ul este obligatoriu pentru Routes API; fără el cererea e respinsă
      'X-Goog-FieldMask':
        'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline',
    },
    body: JSON.stringify({
      origin: {
        location: {
          latLng: {
            latitude: origin.latitude,
            longitude: origin.longitude,
          },
        },
      },
      destination: {
        location: {
          latLng: {
            latitude: destination.latitude,
            longitude: destination.longitude,
          },
        },
      },
      travelMode,
    }),
  });

  const data = await response.json();

  if (!response.ok || !data.routes || data.routes.length === 0) {
    throw new Error(
      data.error?.message || 'Nu s-a putut calcula ruta către destinație.',
    );
  }

  const route = data.routes[0];

  // Durata vine sub formă de string ("1250s"), extragem valoarea numerică în secunde
  const durationSeconds = route.duration
    ? parseInt(route.duration.replace('s', ''), 10)
    : 0;

  return {
    coordinates: decodePolyline(route.polyline.encodedPolyline),
    distanceMeters: route.distanceMeters || 0,
    durationSeconds,
  };
}
