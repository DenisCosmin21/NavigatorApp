import AsyncStorage from '@react-native-async-storage/async-storage';
import { SavedRoute } from './savedRouteModel';
import {
  fetchSavedRoutesFromApi,
  saveRouteToApi,
  updateRouteInApi,
  deleteRouteFromApi,
} from './savedRoutesApiService';

export interface LoadSavedRoutesResult {
  routes: SavedRoute[];
  error?: string;
}

const SAVED_ROUTES_KEY = '@navigator_app_saved_routes';

/** Load all saved routes from AsyncStorage */
async function loadLocalRoutes(): Promise<SavedRoute[]> {
  try {
    const stored = await AsyncStorage.getItem(SAVED_ROUTES_KEY);
    if (stored) {
      return JSON.parse(stored) as SavedRoute[];
    }
  } catch (error) {
    console.warn('[savedRoutesService] Error loading local routes:', error);
  }
  return [];
}

/** Save the full routes array to AsyncStorage */
async function saveLocalRoutes(routes: SavedRoute[]): Promise<void> {
  try {
    await AsyncStorage.setItem(SAVED_ROUTES_KEY, JSON.stringify(routes));
  } catch (error) {
    console.warn('[savedRoutesService] Error saving local routes:', error);
  }
}

/**
 * Merge two route lists, removing duplicates by ID.
 * API routes take priority; local-only routes are kept as well.
 */
function mergeRoutes(
  apiRoutes: SavedRoute[],
  localRoutes: SavedRoute[],
): SavedRoute[] {
  const merged = [...apiRoutes];

  for (const local of localRoutes) {
    const exists = merged.some(r => r.id === local.id);
    if (!exists) {
      merged.push(local);
    }
  }

  return merged;
}

/**
 * Load saved routes with API-first strategy and offline fallback.
 * 1. Load local routes first.
 * 2. Try to fetch from the API.
 * 3. If API succeeds, merge with local routes and save to local storage.
 * 4. If API fails (network error, timeout, etc.), return local routes with the error message.
 */
export async function loadSavedRoutes(): Promise<LoadSavedRoutesResult> {
  const localRoutes = await loadLocalRoutes();

  try {
    const apiRoutes = await fetchSavedRoutesFromApi();
    const merged = mergeRoutes(apiRoutes, localRoutes);

    // Save merged result locally so it's available offline next time
    await saveLocalRoutes(merged);

    console.log(
      `[savedRoutesService] Loaded ${apiRoutes.length} from API, ${localRoutes.length} local, ${merged.length} merged`,
    );
    return { routes: merged };
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Failed to load routes from server';
    console.warn('[savedRoutesService] API error, falling back to local:', error);
    return { routes: localRoutes, error: errorMessage };
  }
}

/**
 * Save a new route.
 * Saves locally first, then syncs to API in the background.
 */
export async function saveRoute(
  route: SavedRoute,
): Promise<SavedRoute[]> {
  // Save locally first for immediate UI update
  const localRoutes = await loadLocalRoutes();
  const updated = [...localRoutes, route];
  await saveLocalRoutes(updated);

  // Sync to API in the background (don't block UI)
  try {
    const created = await saveRouteToApi(route);
    // Update the local copy with the id returned from the API
    const index = updated.findIndex(r => r.id === route.id || (!r.id && !route.id));
    if (index !== -1 && created.id) {
      updated[index] = { ...updated[index], id: created.id };
      await saveLocalRoutes(updated);
    }
    console.log('[savedRoutesService] Route synced to API');
  } catch (error) {
    console.warn('[savedRoutesService] Failed to sync route to API:', error);
    // Local save already succeeded, so this is non-fatal
  }

  return updated;
}

/**
 * Toggle the favorite status of a saved route.
 */
export async function toggleRouteFavorite(
  id: string,
): Promise<SavedRoute[]> {
  const localRoutes = await loadLocalRoutes();
  const updated = localRoutes.map(r =>
    r.id === id ? { ...r, isFavorite: !r.isFavorite } : r,
  );
  await saveLocalRoutes(updated);

  // Sync to API in the background
  const route = updated.find(r => r.id === id);
  if (route?.id) {
    try {
      await updateRouteInApi(route.id, route);
      console.log('[savedRoutesService] Favorite toggle synced to API');
    } catch (error) {
      console.warn('[savedRoutesService] Failed to sync favorite toggle to API:', error);
    }
  }

  return updated;
}

/**
 * Update the lastUsedAt timestamp of a route.
 */
export async function updateRouteLastUsed(
  id: string,
): Promise<SavedRoute[]> {
  const localRoutes = await loadLocalRoutes();
  const updated = localRoutes.map(r =>
    r.id === id ? { ...r, lastUsedAt: new Date().toISOString() } : r,
  );
  await saveLocalRoutes(updated);

  // Sync to API in the background
  const route = updated.find(r => r.id === id);
  if (route?.id) {
    try {
      await updateRouteInApi(route.id, route);
      console.log('[savedRoutesService] Last used synced to API');
    } catch (error) {
      console.warn('[savedRoutesService] Failed to sync last used to API:', error);
    }
  }

  return updated;
}

/**
 * Remove a saved route.
 * Removes locally first, then syncs to API in the background.
 */
export async function removeRoute(
  id: string,
): Promise<SavedRoute[]> {
  // Remove locally first for immediate UI update
  const localRoutes = await loadLocalRoutes();
  const updated = localRoutes.filter(r => r.id !== id);
  await saveLocalRoutes(updated);

  // Sync to API in the background
  try {
    await deleteRouteFromApi(id);
    console.log('[savedRoutesService] Route removal synced to API');
  } catch (error) {
    console.warn('[savedRoutesService] Failed to sync removal to API:', error);
    // Local removal already succeeded, so this is non-fatal
  }

  return updated;
}

/**
 * Get routes sorted by lastUsedAt (most recent first).
 * Falls back to createdAt if lastUsedAt is not set.
 */
export function getRoutesByHistory(routes: SavedRoute[]): SavedRoute[] {
  return [...routes].sort((a, b) => {
    const aTime = a.lastUsedAt || a.createdAt;
    const bTime = b.lastUsedAt || b.createdAt;
    return new Date(bTime).getTime() - new Date(aTime).getTime();
  });
}

/**
 * Get only favorite routes.
 */
export function getFavoriteRoutes(routes: SavedRoute[]): SavedRoute[] {
  return routes.filter(r => r.isFavorite);
}
