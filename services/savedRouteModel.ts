import { LatLng } from './locationService';

export type SavedTravelMode = 'DRIVE' | 'WALK';

/**
 * A saved route that stores the full polyline coordinates.
 * This allows replaying exact custom directions and displaying
 * historical routes (similar to Strava activity history).
 */
export interface SavedRoute {
  id?: string;
  name: string;                  // User-friendly label ("Morning Run", "Custom Route to Gym")
  origin: LatLng;                // Starting point coordinates
  destination: LatLng;           // Destination coordinates
  destinationName: string;       // Human-readable destination name
  coordinates: LatLng[];         // Full polyline coordinates - the exact path taken
  distanceMeters: number;        // Total distance in meters
  durationSeconds: number;       // Total duration in seconds
  travelMode: SavedTravelMode;   // How the route was traveled (driving or walking)
  isFavorite: boolean;           // Whether it's bookmarked as a favorite
  createdAt: string;             // ISO timestamp when the route was saved
  lastUsedAt?: string;           // ISO timestamp of last use
}
