
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface FavoriteLocation {
  id?: string;
  name: string;
  latitude: number;
  longitude: number;
}

export interface LoadFavoritesResult {
  favorites: FavoriteLocation[];
  error?: string;
}

const FAVORITES_KEY = '@navigator_app_favorites';

function sameLocation(
  a: FavoriteLocation,
  b: Pick<FavoriteLocation, 'latitude' | 'longitude'>,
): boolean {
  return (
    Math.abs(a.latitude - b.latitude) < 0.0001 &&
    Math.abs(a.longitude - b.longitude) < 0.0001
  );
}

async function readFavorites(): Promise<FavoriteLocation[]> {
  const stored = await AsyncStorage.getItem(FAVORITES_KEY);

  if (!stored) {
    return [];
  }

  const parsed: unknown = JSON.parse(stored);

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.filter(
    (item): item is FavoriteLocation =>
      item !== null &&
      typeof item === 'object' &&
      typeof item.name === 'string' &&
      typeof item.latitude === 'number' &&
      Number.isFinite(item.latitude) &&
      typeof item.longitude === 'number' &&
      Number.isFinite(item.longitude),
  );
}

async function saveFavorites(
  favorites: FavoriteLocation[],
): Promise<void> {
  await AsyncStorage.setItem(
    FAVORITES_KEY,
    JSON.stringify(favorites),
  );
}

export async function loadFavorites(): Promise<LoadFavoritesResult> {
  try {
    return {
      favorites: await readFavorites(),
    };
  } catch (error) {
    console.warn('Could not load favorites:', error);

    return {
      favorites: [],
      error: 'Nu am putut încărca favoritele.',
    };
  }
}

export async function isFavorite(
  latitude: number,
  longitude: number,
): Promise<boolean> {
  const favorites = await readFavorites();

  return favorites.some(item =>
    sameLocation(item, {latitude, longitude}),
  );
}

export async function addFavorite(
  location: FavoriteLocation,
): Promise<FavoriteLocation[]> {
  const favorites = await readFavorites();

  if (
    favorites.some(item => sameLocation(item, location))
  ) {
    return favorites;
  }

  const updated = [...favorites, location];

  await saveFavorites(updated);

  return updated;
}

export async function removeFavorite(
  latitude: number,
  longitude: number,
): Promise<FavoriteLocation[]> {
  const favorites = await readFavorites();

  const updated = favorites.filter(
    item => !sameLocation(item, {latitude, longitude}),
  );

  await saveFavorites(updated);

  return updated;
}
