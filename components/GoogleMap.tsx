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
import { getCurrentCoordinates, LatLng } from '../services/locationService';
import { fetchRoute, RouteData } from '../services/directionsService';
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

const DEFAULT_CENTER: LatLng = {
  latitude: 51.5074,
  longitude: -0.1278,
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

  // Routing and user position
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [route, setRoute] = useState<RouteData | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);

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
      );

      setRoute(routeData);
      setDetailsVisible(false);

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
  }, [targetLocation, googleApiKey]);

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

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialCamera={{
          center: {
            latitude: targetLocation.latitude,
            longitude: targetLocation.longitude,
          },
          pitch: 0,
          heading: 0,
          altitude: 1000,
          zoom: 13,
        }}
        showsUserLocation
        showsMyLocationButton={false}
      >
        <Marker
          coordinate={{
            latitude: targetLocation.latitude,
            longitude: targetLocation.longitude,
          }}
          title={targetLocation.name}
          onPress={() => setDetailsVisible(true)}
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

      {/* Distance and Duration Indicator */}
      {route && (
        <View style={styles.routeBadge}>
          <Text style={styles.routeBadgeText}>
            {(route.distanceMeters / 1000).toFixed(1)} km (
            {Math.round(route.durationSeconds / 60)} min)
          </Text>
        </View>
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
  routeBadge: {
    position: 'absolute',
    bottom: 40,
    left: 16,
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
});
