import { SavedRoute, SavedTravelMode } from './savedRouteModel';
import { LatLng } from './locationService';
import { encodePolyline, decodePolyline } from './directionsService';

// Raw structure returned by the API
// Coordinates are stored as an encoded polyline string to minimize payload size
interface ApiRouteResponse {
  id: string;
  name: string;
  data: {
    origin: LatLng;
    destination: LatLng;
    destinationName: string;
    polyline: string;
    distanceMeters: number;
    durationSeconds: number;
    travelMode: SavedTravelMode;
    isFavorite: boolean;
    createdAt: string;
    lastUsedAt?: string;
  };
}

// Mock API base URL — replace with your real backend URL later
const API_BASE_URL =
  'https://api.restful-api.dev/collections/routes/objects/';

/**
 * Fetch all saved routes from the API and transform to the app's SavedRoute format.
 */
export async function fetchSavedRoutesFromApi(): Promise<SavedRoute[]> {
  const response = await fetch(`${API_BASE_URL}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_TOKEN',
      'x-api-key': 'a7f08bf7-5048-4ceb-8d65-31eb2cdb134d',
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const rawResponses: ApiRouteResponse[] = await response.json();

  return rawResponses.map(item => ({
    id: item.id,
    name: item.name,
    origin: item.data.origin,
    destination: item.data.destination,
    destinationName: item.data.destinationName,
    coordinates: decodePolyline(item.data.polyline),
    distanceMeters: item.data.distanceMeters,
    durationSeconds: item.data.durationSeconds,
    travelMode: item.data.travelMode,
    isFavorite: item.data.isFavorite,
    createdAt: item.data.createdAt,
    lastUsedAt: item.data.lastUsedAt,
  }));
}

/**
 * Save a new route to the API.
 * Coordinates are encoded as a polyline string to minimize payload size.
 */
export async function saveRouteToApi(
  route: SavedRoute,
): Promise<SavedRoute> {
  const response = await fetch(`${API_BASE_URL}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_TOKEN',
      'x-api-key': 'a7f08bf7-5048-4ceb-8d65-31eb2cdb134d',
    },
    body: JSON.stringify({
      name: route.name,
      data: {
        origin: route.origin,
        destination: route.destination,
        destinationName: route.destinationName,
        polyline: encodePolyline(route.coordinates),
        distanceMeters: route.distanceMeters,
        durationSeconds: route.durationSeconds,
        travelMode: route.travelMode,
        isFavorite: route.isFavorite,
        createdAt: route.createdAt,
        lastUsedAt: route.lastUsedAt,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const created: ApiRouteResponse = await response.json();
  return {
    id: created.id,
    name: created.name,
    origin: created.data.origin,
    destination: created.data.destination,
    destinationName: created.data.destinationName,
    coordinates: decodePolyline(created.data.polyline),
    distanceMeters: created.data.distanceMeters,
    durationSeconds: created.data.durationSeconds,
    travelMode: created.data.travelMode,
    isFavorite: created.data.isFavorite,
    createdAt: created.data.createdAt,
    lastUsedAt: created.data.lastUsedAt,
  };
}

/**
 * Update an existing route in the API (e.g., toggle favorite, update lastUsedAt).
 * Coordinates are encoded as a polyline string to minimize payload size.
 */
export async function updateRouteInApi(
  id: string,
  route: SavedRoute,
): Promise<SavedRoute> {
  const response = await fetch(`${API_BASE_URL}/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_TOKEN',
      'x-api-key': 'a7f08bf7-5048-4ceb-8d65-31eb2cdb134d',
    },
    body: JSON.stringify({
      name: route.name,
      data: {
        origin: route.origin,
        destination: route.destination,
        destinationName: route.destinationName,
        polyline: encodePolyline(route.coordinates),
        distanceMeters: route.distanceMeters,
        durationSeconds: route.durationSeconds,
        travelMode: route.travelMode,
        isFavorite: route.isFavorite,
        createdAt: route.createdAt,
        lastUsedAt: route.lastUsedAt,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const updated: ApiRouteResponse = await response.json();
  return {
    id: updated.id,
    name: updated.name,
    origin: updated.data.origin,
    destination: updated.data.destination,
    destinationName: updated.data.destinationName,
    coordinates: decodePolyline(updated.data.polyline),
    distanceMeters: updated.data.distanceMeters,
    durationSeconds: updated.data.durationSeconds,
    travelMode: updated.data.travelMode,
    isFavorite: updated.data.isFavorite,
    createdAt: updated.data.createdAt,
    lastUsedAt: updated.data.lastUsedAt,
  };
}

/**
 * Delete a saved route from the API using its id.
 */
export async function deleteRouteFromApi(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_TOKEN',
      'x-api-key': 'a7f08bf7-5048-4ceb-8d65-31eb2cdb134d',
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
}
