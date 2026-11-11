import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  Keyboard,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { LocationDetails } from './LocationDetails';
import { FavoritesList } from './FavoritesList';
import { RouteHistoryList } from './RouteHistoryList';
import { getCurrentCoordinates, LatLng } from '../services/locationService';
import { fetchRoute, RouteData, TravelMode } from '../services/directionsService';
import {
  fetchPlaceSuggestions,
  fetchPlaceDetails,
  PlacePrediction,
} from '../services/placesService';
import {
  loadFavorites,
  addFavorite,
  removeFavorite,
  FavoriteLocation,
} from '../services/favoritesService';
import {
  loadSavedRoutes,
  saveRoute,
  removeRoute,
  toggleRouteFavorite,
  getRoutesByHistory,
  updateRouteLastUsed,
} from '../services/savedRoutesService';
import { SavedRoute } from '../services/savedRouteModel';

const DEFAULT_CENTER: LatLng = {
  latitude: 45.7489,
  longitude: 21.2087,
};


interface TargetLocation {
  name: string;
  latitude: number;
  longitude: number;
}

interface GoogleMapProps {
  googleApiKey: string;
  initialLatitude?: number;
  initialLongitude?: number;
  initialLocationName?: string;
  onFavoriteSave?: (location: TargetLocation, isFavorite: boolean) => void;
}

export function GoogleMap({
  googleApiKey,
  initialLatitude = DEFAULT_CENTER.latitude,
  initialLongitude = DEFAULT_CENTER.longitude,
  initialLocationName = 'Selected Location',
  onFavoriteSave,
}: GoogleMapProps) {
  const mapRef = useRef<MapView>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);

  // Selected target destination
  const [targetLocation, setTargetLocation] = useState<TargetLocation>({
    name: initialLocationName,
    latitude: initialLatitude,
    longitude: initialLongitude,
  });

  // Modal and favorites state
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [favorites, setFavorites] = useState<FavoriteLocation[]>([]);
  const [favoriteKeys, setFavoriteKeys] = useState<Set<string>>(new Set());
  const [favoritesListVisible, setFavoritesListVisible] = useState(false);
  const [loadingFavorites, setLoadingFavorites] = useState(true);

  // Saved routes state
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([]);
  const [routeHistoryVisible, setRouteHistoryVisible] = useState(false);
  const [loadingRoutes, setLoadingRoutes] = useState(true);

  // Routing and user position
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [route, setRoute] = useState<RouteData | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [travelMode, setTravelMode] = useState<TravelMode>('DRIVE');
  const [showingDirections, setShowingDirections] = useState(false);
  const [navigationActive, setNavigationActive] = useState(false);

  const handleSearchTextChange = async (text: string) => {
    setSearchQuery(text);
    if (text.trim().length < 2) {
      setPredictions([]);
      return;
    }

    try {
      const results = await fetchPlaceSuggestions(text, googleApiKey);
      setPredictions(results);
    } catch (error) {
      console.warn('Place search error:', error);
    }
  };

  const handleSelectPrediction = async (prediction: PlacePrediction) => {
    Keyboard.dismiss();
    setPredictions([]);
    setSearchQuery(prediction.mainText);

    try {
      const details = await fetchPlaceDetails(prediction.placeId, googleApiKey);
      const newTarget: TargetLocation = {
        name: details.name,
        latitude: details.latitude,
        longitude: details.longitude,
      };

      setTargetLocation(newTarget);
      setRoute(null); // Clear previous polyline route

      mapRef.current?.animateCamera({
        center: { latitude: details.latitude, longitude: details.longitude },
        zoom: 15,
      });

      setDetailsVisible(true);
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.message || 'Unable to retrieve location details.',
      );
    }
  };

  // Load saved favorites on mount
  useEffect(() => {
    setLoadingFavorites(true);
    loadFavorites().then(result => {
      setFavorites(result.favorites);
      const keys = new Set(
        result.favorites.map(
          f =>
            `${f.latitude.toFixed(4)},${f.longitude.toFixed(4)}`,
        ),
      );
      setFavoriteKeys(keys);
      setLoadingFavorites(false);

      // Show error alert if API failed but local favorites are available
      if (result.error) {
        Alert.alert(
          'Connection Error',
          `Unable to sync favorites with server: ${result.error}\n\nShowing ${result.favorites.length} locally saved favorite(s).`,
          [{ text: 'OK' }],
        );
      }
    });
  }, []);

  // Load saved routes on mount
  useEffect(() => {
    setLoadingRoutes(true);
    loadSavedRoutes().then(result => {
      const sorted = getRoutesByHistory(result.routes);
      setSavedRoutes(sorted);
      setLoadingRoutes(false);
    });
  }, []);

  const handleZoom = async (delta: number) => {
    if (!mapRef.current) return;
    const camera = await mapRef.current.getCamera();
    if (camera.zoom !== undefined) {
      mapRef.current.animateCamera({
        zoom: Math.min(Math.max(camera.zoom + delta, 2), 20),
      });
    }
  };

  const handleGetDirections = useCallback(async () => {
    setLoadingRoute(true);
    try {
      const origin = await getCurrentCoordinates();
      setUserLocation(origin);

      const routeData = await fetchRoute(
        origin,
        {
          latitude: targetLocation.latitude,
          longitude: targetLocation.longitude,
        },
        googleApiKey,
        travelMode,
      );

      setRoute(routeData);
      setDetailsVisible(false);
      setShowingDirections(true);

      // Guard against empty coordinate arrays that cause native crashes
      if (routeData.coordinates && routeData.coordinates.length > 1) {
        setTimeout(() => {
          mapRef.current?.fitToCoordinates(routeData.coordinates, {
            edgePadding: { top: 80, right: 40, bottom: 80, left: 40 },
            animated: true,
          });
        }, 300);
      }
    } catch (error: any) {
      Alert.alert(
        'Route Error',
        error.message || 'Failed to calculate directions.',
      );
    } finally {
      setLoadingRoute(false);
    }
  }, [targetLocation, googleApiKey, travelMode, saveRoute, getRoutesByHistory]);

  // Close the current directions view and clear the route
  const handleCloseDirections = () => {
    setRoute(null);
    setShowingDirections(false);
    setNavigationActive(false);
  };

  // Lock the travel mode - user cannot change between car/foot anymore
  const handleStartNavigation = () => {
    setNavigationActive(true);
  };

  // Cancel navigation mode and close directions
  const handleCancelNavigation = () => {
    setNavigationActive(false);
    setRoute(null);
    setShowingDirections(false);
  };

  // Save the currently displayed route to history manually
  const handleSaveRoute = async () => {
    if (!route || !userLocation) return;

    const savedRoute: SavedRoute = {
      name: targetLocation.name,
      origin: userLocation,
      destination: {
        latitude: targetLocation.latitude,
        longitude: targetLocation.longitude,
      },
      destinationName: targetLocation.name,
      coordinates: route.coordinates,
      distanceMeters: route.distanceMeters,
      durationSeconds: route.durationSeconds,
      travelMode,
      isFavorite: false,
      createdAt: new Date().toISOString(),
    };

    const updatedRoutes = await saveRoute(savedRoute);
    setSavedRoutes(getRoutesByHistory(updatedRoutes));
  };

  // Favorite toggle handling
  const locationKey = `${targetLocation.latitude.toFixed(
    4,
  )},${targetLocation.longitude.toFixed(4)}`;
  const isCurrentTargetFavorite = favoriteKeys.has(locationKey);

  const handleToggleFavorite = async () => {
    const nextFavoriteState = !isCurrentTargetFavorite;

    if (nextFavoriteState) {
      // Add to favorites
      const updated = await addFavorite({
        name: targetLocation.name,
        latitude: targetLocation.latitude,
        longitude: targetLocation.longitude,
      });
      setFavorites(updated);
      setFavoriteKeys(prev => new Set(prev).add(locationKey));
    } else {
      // Remove from favorites
      const updated = await removeFavorite(
        targetLocation.latitude,
        targetLocation.longitude,
      );
      setFavorites(updated);
      setFavoriteKeys(prev => {
        const next = new Set(prev);
        next.delete(locationKey);
        return next;
      });
    }

    onFavoriteSave?.(targetLocation, nextFavoriteState);
  };

  // Handle selecting a favorite from the list
  const handleSelectFavorite = (favorite: FavoriteLocation) => {
    const newTarget: TargetLocation = {
      name: favorite.name,
      latitude: favorite.latitude,
      longitude: favorite.longitude,
    };

    setTargetLocation(newTarget);
    setRoute(null);

    mapRef.current?.animateCamera({
      center: { latitude: favorite.latitude, longitude: favorite.longitude },
      zoom: 15,
    });

    setDetailsVisible(true);
  };

  // Handle selecting a saved route from history
  const handleSelectSavedRoute = (savedRoute: SavedRoute) => {
    // Update the last used timestamp
    if (savedRoute.id) {
      updateRouteLastUsed(savedRoute.id).then(updated => {
        setSavedRoutes(getRoutesByHistory(updated));
      });
    }

    const newTarget: TargetLocation = {
      name: savedRoute.name || savedRoute.destinationName,
      latitude: savedRoute.destination.latitude,
      longitude: savedRoute.destination.longitude,
    };

    setTargetLocation(newTarget);
    
    // Display the saved route polyline on the map
    const routeData: RouteData = {
      coordinates: savedRoute.coordinates,
      distanceMeters: savedRoute.distanceMeters,
      durationSeconds: savedRoute.durationSeconds,
    };
    setRoute(routeData);
    setShowingDirections(true);

    // Set user location to the origin of the saved route
    setUserLocation(savedRoute.origin);

    // Fit the map to show the entire route
    if (savedRoute.coordinates && savedRoute.coordinates.length > 1) {
      setTimeout(() => {
        mapRef.current?.fitToCoordinates(savedRoute.coordinates, {
          edgePadding: { top: 80, right: 40, bottom: 80, left: 40 },
          animated: true,
        });
      }, 300);
    }
  };

  // Handle toggling favorite for a saved route
  const handleToggleRouteFavorite = async (id: string) => {
    const updated = await toggleRouteFavorite(id);
    setSavedRoutes(getRoutesByHistory(updated));
  };

  // Handle deleting a saved route
  const handleDeleteRoute = async (id: string) => {
    const updated = await removeRoute(id);
    setSavedRoutes(getRoutesByHistory(updated));
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: DEFAULT_CENTER.latitude,
          longitude: DEFAULT_CENTER.longitude,
          latitudeDelta: 0.08,
          longitudeDelta: 0.08,
        }}

        onPress={event => {
          // Prevent iOS from firing onPress at the same time as onPoiClick
          if ((event.nativeEvent as any).action === 'poi-click') return;

          // Don't allow changing location while directions are showing
          if (showingDirections) return;

          const { latitude, longitude } = event.nativeEvent.coordinate;

          setTargetLocation({
            name: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
            latitude,
            longitude,
          });

          setRoute(null);
          setDetailsVisible(true);
        }}
        onPoiClick={event => {
          // Don't allow changing location while directions are showing
          if (showingDirections) return;

          const { coordinate, name } = event.nativeEvent;
          setTargetLocation({
            name:
              name ||
              `${coordinate.latitude.toFixed(
                4,
              )}, ${coordinate.longitude.toFixed(4)}`,
            latitude: coordinate.latitude,
            longitude: coordinate.longitude,
          });

          setRoute(null);
          setDetailsVisible(true);
        }}
      >
        <Marker
          coordinate={{
            latitude: targetLocation.latitude,
            longitude: targetLocation.longitude,
          }}
          title={targetLocation.name}
          onPress={() => {
            if (!showingDirections) {
              setDetailsVisible(true);
            }
          }}
        />

        {userLocation && route && (
          <Marker
            coordinate={userLocation}
            title="Your Location"
            pinColor="#007AFF"
          />
        )}

        {route && (
          <Polyline
            coordinates={route.coordinates}
            strokeWidth={4}
            strokeColor="#007AFF"
          />
        )}
      </MapView>

      {/* Autocomplete Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search location or address..."
          placeholderTextColor="#8E8E93"
          value={searchQuery}
          onChangeText={handleSearchTextChange}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />

        {predictions.length > 0 && (
          <View style={styles.dropdown}>
            <FlatList
              data={predictions}
              keyExtractor={item => item.placeId}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => handleSelectPrediction(item)}
                >
                  <Text style={styles.mainPlaceText}>{item.mainText}</Text>
                  {!!item.secondaryText && (
                    <Text style={styles.secondaryPlaceText} numberOfLines={1}>
                      {item.secondaryText}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        )}
      </View>

      <View style={styles.zoomContainer}>
        <TouchableOpacity
          style={styles.zoomButton}
          onPress={() => handleZoom(1)}
          activeOpacity={0.7}
        >
          <Text style={styles.zoomText}>+</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.zoomButton}
          onPress={() => handleZoom(-1)}
          activeOpacity={0.7}
        >
          <Text style={styles.zoomText}>−</Text>
        </TouchableOpacity>
      </View>

      {/* Distance and Duration Indicator - only visible when showing directions */}
      {showingDirections && route && (
        <View style={styles.routeBadgeContainer}>
          <View style={styles.routeBadge}>
            <Text style={styles.routeBadgeText}>
              {(route.distanceMeters / 1000).toFixed(1)} km (
              {Math.round(route.durationSeconds / 60)} min)
            </Text>
          </View>
          {!navigationActive && (
            <>
              <TouchableOpacity
                style={styles.saveRouteButton}
                onPress={handleSaveRoute}
                activeOpacity={0.7}
              >
                <Text style={styles.saveRouteButtonText}>💾</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.startNavigationButton}
                onPress={handleStartNavigation}
                activeOpacity={0.7}
              >
                <Text style={styles.startNavigationButtonText}>▶</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.closeDirectionsButton}
                onPress={handleCloseDirections}
                activeOpacity={0.7}
              >
                <Text style={styles.closeDirectionsButtonText}>✕</Text>
              </TouchableOpacity>
            </>
          )}
          {navigationActive && (
            <TouchableOpacity
              style={styles.cancelNavigationButton}
              onPress={handleCancelNavigation}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelNavigationButtonText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Travel Mode Toggle Button - only visible when showing directions and navigation is NOT active */}
      {showingDirections && !navigationActive && (
        <TouchableOpacity
          style={styles.travelModeButton}
          onPress={() => {
            const newMode = travelMode === 'DRIVE' ? 'WALK' : 'DRIVE';
            setTravelMode(newMode);
            // Reload directions with the new mode
            handleGetDirections();
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.travelModeButtonText}>{travelMode === 'DRIVE' ? '🚗' : '🚶'}</Text>
        </TouchableOpacity>
      )}

      {/* Favorites Button */}
      <TouchableOpacity
        style={styles.favoritesButton}
        onPress={() => setFavoritesListVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.favoritesButtonText}>★</Text>
        {favorites.length > 0 && (
          <View style={styles.favoritesBadge}>
            <Text style={styles.favoritesBadgeText}>{favorites.length}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Route History Button */}
      <TouchableOpacity
        style={styles.routeHistoryButton}
        onPress={() => setRouteHistoryVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.routeHistoryButtonText}>🕐</Text>
        {savedRoutes.length > 0 && (
          <View style={styles.routeHistoryBadge}>
            <Text style={styles.routeHistoryBadgeText}>{savedRoutes.length}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Location Details Sheet */}
      <LocationDetails
        name={targetLocation.name}
        latitude={targetLocation.latitude}
        longitude={targetLocation.longitude}
        visible={detailsVisible}
        isFavorite={isCurrentTargetFavorite}
        loadingRoute={loadingRoute}
        onToggleFavorite={handleToggleFavorite}
        onGetDirections={handleGetDirections}
        onClose={() => setDetailsVisible(false)}
      />

      {/* Favorites List Modal */}
      <FavoritesList
        visible={favoritesListVisible}
        favorites={favorites}
        loading={loadingFavorites}
        onSelect={handleSelectFavorite}
        onClose={() => setFavoritesListVisible(false)}
      />

      {/* Route History Modal */}
      <RouteHistoryList
        visible={routeHistoryVisible}
        routes={savedRoutes}
        loading={loadingRoutes}
        onSelect={handleSelectSavedRoute}
        onToggleFavorite={handleToggleRouteFavorite}
        onDelete={handleDeleteRoute}
        onClose={() => setRouteHistoryVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  searchContainer: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    zIndex: 10,
  },
  searchInput: {
    height: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#1C1C1E',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  dropdown: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: 6,
    maxHeight: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 6,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  mainPlaceText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1C1C1E',
  },
  secondaryPlaceText: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  zoomContainer: {
    position: 'absolute',
    right: 16,
    bottom: 40,
    zIndex: 5,
  },
  zoomButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  zoomText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1C1C1E',
    lineHeight: 24,
  },
  routeBadgeContainer: {
    position: 'absolute',
    bottom: 40,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  routeBadge: {
    backgroundColor: '#1C1C1E',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 5,
  },
  routeBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  saveRouteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 5,
  },
  saveRouteButtonText: {
    fontSize: 18,
  },
  startNavigationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 5,
  },
  startNavigationButtonText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  cancelNavigationButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 5,
  },
  cancelNavigationButtonText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  closeDirectionsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 5,
  },
  closeDirectionsButtonText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  favoritesButton: {
    position: 'absolute',
    top: 50,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  favoritesButtonText: {
    fontSize: 22,
    color: '#F5A623',
  },
  favoritesBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  favoritesBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  routeHistoryButton: {
    position: 'absolute',
    top: 106,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  routeHistoryButtonText: {
    fontSize: 22,
  },
  routeHistoryBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#007AFF',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  routeHistoryBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  travelModeButton: {
    position: 'absolute',
    top: 162,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  travelModeButtonText: {
    fontSize: 22,
  },
});
