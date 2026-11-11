export interface FavoriteLocation {
  id?: string;
  name: string;
  latitude: number;
  longitude: number;
}

// Raw structure returned by the API
interface ApiFavoriteResponse {
  id: string;
  name: string;
  data: {
    latitude: number;
    longitude: number;
  };
}

// Mock API base URL — replace with your real backend URL later
const API_BASE_URL =
  'https://api.restful-api.dev/collections/locations/objects/';

/**
 * Fetch favorites from the API and transform to the app's FavoriteLocation format.
 */
export async function fetchFavoritesFromApi(): Promise<FavoriteLocation[]> {

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

  const rawResponses: ApiFavoriteResponse[] = await response.json();

  // Transform API response to FavoriteLocation format
  return rawResponses.map(item => ({
    id: item.id,
    name: item.name,
    latitude: item.data.latitude,
    longitude: item.data.longitude,
  }));
}

/**
 * Add a favorite to the API.
 * Sends the same nested format the API returns: { id?, name, data: { latitude, longitude } }
 */
export async function addFavoriteToApi(
  location: FavoriteLocation,
): Promise<FavoriteLocation> {

  const response = await fetch(`${API_BASE_URL}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_TOKEN',
      'x-api-key': 'a7f08bf7-5048-4ceb-8d65-31eb2cdb134d',
    },
    body: JSON.stringify({
      name: location.name,
      data: {
        latitude: location.latitude,
        longitude: location.longitude,
      },
    }),
  });
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  const created: ApiFavoriteResponse = await response.json();
  return {
    id: created.id,
    name: created.name,
    latitude: created.data.latitude,
    longitude: created.data.longitude,
  };
}

/**
 * Remove a favorite from the API using its id.
 */
export async function removeFavoriteFromApi(
  id: string,
): Promise<void> {

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
