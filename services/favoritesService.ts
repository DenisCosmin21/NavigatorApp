import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  fetchFavoritesFromApi,
  addFavoriteToApi,
  removeFavoriteFromApi,
} from './favoritesApiService';

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


/** Load all saved favorites from AsyncStorage */
async function loadLocalFavorites(): Promise<FavoriteLocation[]> {
  try {
    const stored = await AsyncStorage.getItem(FAVORITES_KEY);
    if (stored) {
      return JSON.parse(stored) as FavoriteLocation[];
    }
  } catch (error) {
    console.warn('[favoritesService] Error loading local favorites:', error);
  }
  return [];
}

/** Save the full favorites array to AsyncStorage */
async function saveLocalFavorites(favorites: FavoriteLocation[]): Promise<void> {
  try {
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  } catch (error) {
    console.warn('[favoritesService] Error saving local favorites:', error);
  }
}

/**
 * Merge two favorite lists, removing duplicates by coordinate proximity.
 * API favorites take priority; local-only favorites are kept as well.
 */
function mergeFavorites(
  apiFavorites: FavoriteLocation[],
  localFavorites: FavoriteLocation[],
): FavoriteLocation[] {
  const merged = [...apiFavorites];

  for (const local of localFavorites) {
    const exists = merged.some(
      f =>
        Math.abs(f.latitude - local.latitude) < 0.0001 &&
        Math.abs(f.longitude - local.longitude) < 0.0001,
    );
    if (!exists) {
      merged.push(local);
    }
  }

  return merged;
}

/**
 * Load favorites with API-first strategy and offline fallback.
 * 1. Load local favorites first.
 * 2. Try to fetch from the API.
 * 3. If API succeeds, merge with local favorites and save to local storage.
 * 4. If API fails (network error, timeout, etc.), return local favorites with the error message.
 */
export async function loadFavorites(): Promise<LoadFavoritesResult> {
  const localFavorites = await loadLocalFavorites();

  try {
    const apiFavorites = await fetchFavoritesFromApi();
    const merged = mergeFavorites(apiFavorites, localFavorites);

    // Save merged result locally so it's available offline next time
    await saveLocalFavorites(merged);

    console.log(
      `[favoritesService] Loaded ${apiFavorites.length} from API, ${localFavorites.length} local, ${merged.length} merged`,
    );
    return { favorites: merged };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to load favorites from server';
    console.warn('[favoritesService] API error, falling back to local:', error);
    return { favorites: localFavorites, error: errorMessage };
  }
}

/** Check if a location is already saved as a favorite */
export async function isFavorite(
  latitude: number,
  longitude: number,
): Promise<boolean> {
  const result = await loadFavorites();
  return result.favorites.some(
    f =>
      Math.abs(f.latitude - latitude) < 0.0001 &&
      Math.abs(f.longitude - longitude) < 0.0001,
  );
}

/**
 * Add a location to favorites.
 * Saves locally first, then syncs to API in the background.
 */
export async function addFavorite(
  location: FavoriteLocation,
): Promise<FavoriteLocation[]> {
  // Save locally first for immediate UI update
  const localFavorites = await loadLocalFavorites();
  const exists = localFavorites.some(
    f =>
      Math.abs(f.latitude - location.latitude) < 0.0001 &&
      Math.abs(f.longitude - location.longitude) < 0.0001,
  );

  if (exists) {
    return localFavorites;
  }

  const updated = [...localFavorites, location];
  await saveLocalFavorites(updated);

  // Sync to API in the background (don't block UI)
  try {
    const created = await addFavoriteToApi(location);
    // Update the local copy with the id returned from the API
    const index = updated.findIndex(
      f =>
        Math.abs(f.latitude - location.latitude) < 0.0001 &&
        Math.abs(f.longitude - location.longitude) < 0.0001,
    );
    if (index !== -1 && created.id) {
      updated[index] = { ...updated[index], id: created.id };
      await saveLocalFavorites(updated);
    }
    console.log('[favoritesService] Favorite synced to API');
  } catch (error) {
    console.warn('[favoritesService] Failed to sync favorite to API:', error);
    // Local save already succeeded, so this is non-fatal
  }

  return updated;
}

/**
 * Remove a location from favorites.
 * Removes locally first, then syncs to API in the background.
 */
export async function removeFavorite(
  latitude: number,
  longitude: number,
): Promise<FavoriteLocation[]> {
  // Remove locally first for immediate UI update
  const localFavorites = await loadLocalFavorites();
  const updated = localFavorites.filter(
    f =>
      !(
        Math.abs(f.latitude - latitude) < 0.0001 &&
        Math.abs(f.longitude - longitude) < 0.0001
      ),
  );

  await saveLocalFavorites(updated);

  // Sync to API in the background (don't block UI)
  // Find the id of the removed favorite to delete it from the API
  const removedFavorite = localFavorites.find(
    f =>
      Math.abs(f.latitude - latitude) < 0.0001 &&
      Math.abs(f.longitude - longitude) < 0.0001,
  );
  if (removedFavorite?.id) {
    try {
      await removeFavoriteFromApi(removedFavorite.id);
      console.log('[favoritesService] Favorite removal synced to API');
    } catch (error) {
      console.warn('[favoritesService] Failed to sync removal to API:', error);
      // Local removal already succeeded, so this is non-fatal
    }
  }

  return updated;
}
