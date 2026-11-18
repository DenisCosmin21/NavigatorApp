export interface PlacePrediction {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

export interface PlaceDetails {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

/**
 * Autocomplete folosind Places API (New) v1
 */
export async function fetchPlaceSuggestions(
  query: string,
  apiKey: string,
): Promise<PlacePrediction[]> {
  if (!query.trim()) return [];

  const url = 'https://places.googleapis.com/v1/places:autocomplete';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
    },
    body: JSON.stringify({
      input: query,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || 'Eroare la căutarea locațiilor');
  }

  if (!data.suggestions) return [];

  return data.suggestions
    .filter((item: any) => item.placePrediction)
    .map((item: any) => {
      const p = item.placePrediction;
      return {
        placeId: p.placeId,
        description: p.text?.text || '',
        mainText: p.structuredFormat?.mainText?.text || p.text?.text || '',
        secondaryText: p.structuredFormat?.secondaryText?.text || '',
      };
    });
}

/**
 * Preluare coordonate și detalii folosind Places API (New) v1
 */
export async function fetchPlaceDetails(
  placeId: string,
  apiKey: string,
): Promise<PlaceDetails> {
  const url = `https://places.googleapis.com/v1/places/${placeId}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'id,displayName,formattedAddress,location',
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || 'Eroare la preluarea coordonatelor');
  }

  if (!data.location) {
    throw new Error('Locația selectată nu are coordonate valide.');
  }

  return {
    name: data.displayName?.text || 'Locație selectată',
    address: data.formattedAddress || '',
    latitude: data.location.latitude,
    longitude: data.location.longitude,
  };
}
