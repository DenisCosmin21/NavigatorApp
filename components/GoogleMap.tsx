
import {openDirections} from '../services/navigationService';
import React, {useEffect, useRef, useState} from 'react';
import {
  Alert,
  Animated,
  NativeModules,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, {Marker, Polyline, PROVIDER_GOOGLE} from 'react-native-maps';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {DARK_MAP_STYLE} from './map/darkMapStyle';
import {LocatingScreen} from './map/LocatingScreen';
import {useLiveLocation} from './map/useLiveLocation';
import {useMotionSensors} from './map/useMotionSensors';
import {usePlaceSearch} from './map/usePlaceSearch';
import {useFavoriteLocations} from './map/useFavoriteLocations';
import {LocationDetails} from './LocationDetails';
import {FavoritesList} from './FavoritesList';
import {fetchRoute, type RouteData} from '../services/directionsService';
import type {FavoriteLocation} from '../services/favoritesService';
import {
  DestinationSearch,
  type Destination,
} from './search/DestinationSearch';

const MIN_SPEED_KMH = 2;

type Coordinates = {
  latitude: number;
  longitude: number;
};

type PlacesNativeModule = {
  getApiKey?(): Promise<string>;
};


type GoogleMapProps = {
  destination: Destination | null;
  onDestinationChange: (
    destination: Destination | null,
  ) => void;
  onOpenAccount: () => void;
};

const PlacesModule = NativeModules.PlacesModule as
  | PlacesNativeModule
  | undefined;


export function GoogleMap({
  destination,
  onDestinationChange,
  onOpenAccount,
}: GoogleMapProps) {
  const insets = useSafeAreaInsets();

  const mapRef = useRef<MapView>(null);
  const lastLocationRef = useRef<Coordinates | null>(null);
  const followLocationRef = useRef(destination === null);


  const toastOpacity =
    useRef(new Animated.Value(0)).current;

  const toastY =
    useRef(new Animated.Value(-10)).current;


  const {accelerating, rotating, heading} = useMotionSensors();

  const [mapRotated, setMapRotated] =
    useState(false);

  const {
    suggestions, searchError, searchLoading,
    cancelSearch, onQueryChange, resolveSuggestion,
  } = usePlaceSearch();

  const [searchKey, setSearchKey] =
    useState(0);

  const [focusSearch, setFocusSearch] =
    useState(0);

  const {favorites, favoritesLoading, isFavorite, toggleFavorite} =
    useFavoriteLocations();
  const [favoritesListVisible, setFavoritesListVisible] = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [route, setRoute] = useState<RouteData | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);



  const {
    initialLocation,
    currentLocation,
    locationAllowed,
    locationError,
    gpsToast,
    setGpsToast,
    speedKmh,
    retryLocation,
  } = useLiveLocation(next => {
    lastLocationRef.current = next;
    if (followLocationRef.current && mapRef.current) {
      mapRef.current.animateCamera({center: next}, {duration: 450});
    }
  });

  useEffect(() => {
    if (!gpsToast) {
      return;
    }

    toastOpacity.setValue(0);
    toastY.setValue(-10);

    const sequence = Animated.sequence([
      Animated.parallel([
        Animated.timing(toastOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),

        Animated.timing(toastY, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]),

      Animated.delay(1500),

      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
    ]);

    sequence.start(({finished}) => {
      if (finished) {
        setGpsToast(false);
      }
    });

    return () => sequence.stop();
  }, [gpsToast, toastOpacity, toastY]);



  const selectDestination = (
    next: Destination,
  ) => {
    followLocationRef.current = false;

    onDestinationChange(next);
    setRoute(null);
    setDetailsVisible(false);

    cancelSearch();

    mapRef.current?.animateCamera(
      {
        center: {
          latitude: next.latitude,
          longitude: next.longitude,
        },
        zoom: 15,
      },
      {duration: 550},
    );
  };

  const clearDestination = () => {
    onDestinationChange(null);
    setRoute(null);
    setDetailsVisible(false);

    cancelSearch();

    setSearchKey(value => value + 1);

    followLocationRef.current = true;

    if (lastLocationRef.current) {
      mapRef.current?.animateCamera(
        {
          center: lastLocationRef.current,
          zoom: 16,
        },
        {duration: 500},
      );
    }

  };

  const currentFavorite = isFavorite(destination);

  const handleToggleFavorite = async () => {
    if (!destination) return;
    try {
      await toggleFavorite(destination);
    } catch (error) {
      Alert.alert('Favorite', 'Nu am putut salva loca?ia.');
      console.warn('Favorites error:', error);
    }
  };

  const handleSelectFavorite = (favorite: FavoriteLocation) => {
    selectDestination({
      id: `favorite-${favorite.latitude}-${favorite.longitude}`,
      name: favorite.name,
      latitude: favorite.latitude,
      longitude: favorite.longitude,
    });
    setFavoritesListVisible(false);
    setDetailsVisible(true);
  };

  const handleGetDirections = async () => {
    if (!destination || !lastLocationRef.current) {
      Alert.alert(
        'Traseu',
        'Locația curentă nu este încă disponibilă.',
      );
      return;
    }

    setRouteLoading(true);

    try {
      await openDirections(
        lastLocationRef.current,
        {
          latitude: destination.latitude,
          longitude: destination.longitude,
        },
      );

      setDetailsVisible(false);
    } catch (error) {
      console.warn('Navigation error:', error);

      Alert.alert(
        'Traseu',
        'Nu am putut deschide Google Maps.',
      );
    } finally {
      setRouteLoading(false);
    }
  };


  const handleSuggestionSelect = async (place: Destination) => {
    const selected = await resolveSuggestion(place.id);
    if (selected) selectDestination(selected);
  };

  const recenter = () => {
    if (!lastLocationRef.current) {
      return;
    }

    followLocationRef.current = true;

    mapRef.current?.animateCamera(
      {
        center: lastLocationRef.current,
        zoom: 16,
      },
      {duration: 500},
    );
  };

  const toggleCompass = () => {
    const shouldRotate =
      !mapRotated && heading !== null;

    mapRef.current?.animateCamera(
      {
        heading: shouldRotate
          ? heading ?? 0
          : 0,
      },
      {duration: 350},
    );

    setMapRotated(shouldRotate);
  };

  const top =
    Math.max(insets.top, 18) + 12;

  const bottom =
    Math.max(insets.bottom, 12) + 12;

  if (initialLocation === null) {
    return (
      <LocatingScreen
        error={locationError}
        onRetry={retryLocation}
        onOpenAccount={onOpenAccount}
      />
    );
  }

  const initialCenter = destination
    ? {
        latitude: destination.latitude,
        longitude: destination.longitude,
      }
    : initialLocation;

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}

        customMapStyle={DARK_MAP_STYLE}
        initialRegion={{
          ...initialCenter,
          latitudeDelta: 0.017,
          longitudeDelta: 0.017,
        }}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
        onPanDrag={() => {
          followLocationRef.current = false;
        }}
        onPress={event => {
          const {
            latitude,
            longitude,
          } = event.nativeEvent.coordinate;

          selectDestination({
            id: `point-${latitude}-${longitude}`,
            name: 'Punct selectat pe hartă',
            latitude,
            longitude,
          });

          setSearchKey(value => value + 1);
        }}>

        {currentLocation && locationAllowed && (
          <Marker
            coordinate={currentLocation}
            anchor={{x: 0.5, y: 0.5}}
            tracksViewChanges={false}
            zIndex={5}
            title="Locația mea">

            <View style={styles.userHalo}>
              <View style={styles.userHaloInner}>
                <View style={styles.userDot} />
              </View>
            </View>

          </Marker>
        )}

        {route && route.coordinates.length > 1 && (
          <Polyline
            coordinates={route.coordinates}
            strokeColor="#3B82F6"
            strokeWidth={5}
          />
        )}

        {destination !== null && (
          <Marker
            coordinate={{
              latitude: destination.latitude,
              longitude: destination.longitude,
            }}
            title={destination.name}
            pinColor="#3B82F6"
            onPress={() => setDetailsVisible(true)}
          />
        )}
      </MapView>


      <View
        style={[
          styles.topRow,
          {top},
        ]}>

        <View style={styles.searchArea}>
          <DestinationSearch
            key={searchKey}
            suggestions={suggestions}
            loading={searchLoading}
            error={searchError}
            focusRequest={focusSearch}
            onQueryChange={onQueryChange}
            onSelectDestination={
              handleSuggestionSelect
            }
          />
        </View>

        <TouchableOpacity
          style={styles.accountButton}
          onPress={onOpenAccount}
          accessibilityLabel="Contul meu">

          <View style={styles.avatarHead} />
          <View style={styles.avatarBody} />

        </TouchableOpacity>
      </View>

      {gpsToast && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.gpsToast,
            {
              top: top + 70,
              opacity: toastOpacity,
              transform: [
                {translateY: toastY},
              ],
            },
          ]}>

          <View style={styles.checkCircle}>
            <Text style={styles.checkText}>
              ✓
            </Text>
          </View>

          <Text style={styles.toastText}>
            Locație detectată
          </Text>

        </Animated.View>
      )}

      {speedKmh >= MIN_SPEED_KMH && (
        <View
          style={[
            styles.speedCircle,
            {
              bottom: bottom + 104,
            },
          ]}>

          <Text style={styles.speedNumber}>
            {speedKmh}
          </Text>

          <Text style={styles.speedUnit}>
            km/h
          </Text>

          <View
            style={[
              styles.speedDot,
              accelerating &&
                styles.speedDotActive,
            ]}
          />
        </View>
      )}

      <View
        style={[
          styles.rightControls,
          {
            bottom: bottom + 106,
          },
        ]}>

        <TouchableOpacity
          style={[
            styles.roundButton,
            rotating && styles.roundActive,
          ]}
          onPress={toggleCompass}
          accessibilityLabel="Orientează harta">

          <Text style={styles.northLetter}>
            N
          </Text>

          <Text
            style={[
              styles.compassNeedle,
              {
                transform: [
                  {
                    rotate:
                      `${heading ?? 0}deg`,
                  },
                ],
              },
            ]}>
            ▲
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.roundButton}
          onPress={recenter}
          accessibilityLabel="Locația curentă">

          <Text style={styles.recenterIcon}>
            ◎
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.favoritesFloating, {bottom: bottom + 220}]}
        onPress={() => setFavoritesListVisible(true)}
        accessibilityLabel="Locații favorite">
        <Text style={styles.favoritesFloatingText}>★</Text>
        {favorites.length > 0 && (
          <View style={styles.favoriteCountBadge}>
            <Text style={styles.favoriteCountText}>{favorites.length}</Text>
          </View>
        )}
      </TouchableOpacity>

      {route && (
        <View style={[styles.routeBadge, {bottom: bottom + 95}]}>
          <Text style={styles.routeBadgeText}>
            {(route.distanceMeters / 1000).toFixed(1)} km · {Math.round(route.durationSeconds / 60)} min
          </Text>
        </View>
      )}

      {destination !== null && (
        <View
          style={[
            styles.destinationCard,
            {bottom},
          ]}>

          <View style={styles.destinationIcon}>
            <Text style={styles.destinationPin}>
              ⌖
            </Text>
          </View>

          <View style={styles.destinationDetails}>
            <Text style={styles.destinationTitle}>
              Destinație selectată
            </Text>

            <Text
              style={styles.destinationSubtitle}
              numberOfLines={1}>
              {destination.name}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.clearDestination}
            onPress={clearDestination}
            accessibilityLabel="Șterge destinația">

            <Text
              style={styles.clearDestinationText}>
              ×
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.destinationAction}
            onPress={() => setDetailsVisible(true)}
            accessibilityLabel="Detalii, favorite și traseu">

            <Text style={styles.destinationArrow}>
              ➜
            </Text>
          </TouchableOpacity>

        </View>
      )}

      {locationError !== '' && (
        <View
          style={[
            styles.errorBanner,
            {
              top: top + 75,
            },
          ]}>

          <Text style={styles.errorBannerText}>
            {locationError}
          </Text>

        </View>
      )}

      {destination !== null && (
        <LocationDetails
          name={destination.name}
          latitude={destination.latitude}
          longitude={destination.longitude}
          visible={detailsVisible}
          isFavorite={!!currentFavorite}
          loadingRoute={routeLoading}
          onToggleFavorite={handleToggleFavorite}
          onGetDirections={handleGetDirections}
          onClose={() => setDetailsVisible(false)}
        />
      )}

      <FavoritesList
        visible={favoritesListVisible}
        favorites={favorites}
        loading={favoritesLoading}
        onSelect={handleSelectFavorite}
        onClose={() => setFavoritesListVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#07142E',
  },

  map: {
    flex: 1,
  },


  topRow: {
    position: 'absolute',
    left: 15,
    right: 15,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    zIndex: 30,
  },

  searchArea: {
    flex: 1,
  },

  accountButton: {
    width: 55,
    height: 55,
    borderRadius: 28,
    backgroundColor: '#16437F',
    borderWidth: 1,
    borderColor: '#3E78C9',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },

  avatarHead: {
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
    marginBottom: 3,
  },

  avatarBody: {
    width: 25,
    height: 13,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    backgroundColor: '#FFFFFF',
  },

  gpsToast: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 25,
    paddingLeft: 9,
    paddingRight: 17,
    paddingVertical: 9,
    backgroundColor: '#082821',
    borderColor: '#27BC66',
    borderWidth: 1,
    elevation: 7,
    zIndex: 15,
  },

  checkCircle: {
    width: 27,
    height: 27,
    borderRadius: 14,
    marginRight: 9,
    backgroundColor: '#20C85A',
    alignItems: 'center',
    justifyContent: 'center',
  },

  checkText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },

  toastText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },

  userHalo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(31,106,255,0.19)',
  },

  userHaloInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(28,110,255,0.40)',
  },

  userDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#298BFF',
    borderColor: '#FFFFFF',
    borderWidth: 4,
  },

  speedCircle: {
    position: 'absolute',
    left: 15,
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: '#142C4E',
    borderColor: '#4D84D2',
    borderWidth: 2,
    elevation: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },

  speedNumber: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  speedUnit: {
    fontSize: 10,
    color: '#B8CDEE',
    marginTop: -3,
  },

  speedDot: {
    position: 'absolute',
    top: 8,
    right: 10,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4079C1',
  },

  speedDotActive: {
    backgroundColor: '#2DDD73',
  },

  rightControls: {
    position: 'absolute',
    right: 15,
    alignItems: 'center',
    gap: 12,
  },

  roundButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#142C4E',
    borderColor: '#4779BC',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
  },

  roundActive: {
    borderColor: '#52BFFF',
    borderWidth: 2,
  },

  northLetter: {
    fontSize: 11,
    color: '#FC6974',
    fontWeight: '900',
    lineHeight: 13,
  },

  compassNeedle: {
    fontSize: 19,
    lineHeight: 22,
    color: '#FFFFFF',
  },

  recenterIcon: {
    fontSize: 31,
    lineHeight: 36,
    color: '#FFFFFF',
  },

  destinationCard: {
    position: 'absolute',
    left: 14,
    right: 14,
    minHeight: 84,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 15,
    paddingRight: 13,
    borderRadius: 24,
    backgroundColor: '#102645',
    borderColor: '#345A91',
    borderWidth: 1,
    elevation: 8,
  },

  destinationIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#1B4B90',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  destinationPin: {
    fontSize: 28,
    color: '#FFFFFF',
    lineHeight: 35,
  },

  destinationDetails: {
    flex: 1,
  },

  destinationTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  destinationSubtitle: {
    color: '#B3C7E6',
    fontSize: 12,
    marginTop: 4,
  },

  clearDestination: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2D4669',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 5,
  },

  clearDestinationText: {
    fontSize: 21,
    lineHeight: 25,
    color: '#FFFFFF',
  },

  destinationAction: {
    width: 41,
    height: 41,
    borderRadius: 21,
    backgroundColor: '#1265F3',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  destinationArrow: {
    fontSize: 26,
    lineHeight: 31,
    color: '#FFFFFF',
  },

  errorBanner: {
    position: 'absolute',
    left: 20,
    right: 20,
    backgroundColor: '#502736',
    borderColor: '#E87C8E',
    borderWidth: 1,
    borderRadius: 12,
    padding: 11,
    zIndex: 25,
  },

  errorBannerText: {
    color: '#FFE4E8',
    fontSize: 12,

  },


  favoritesFloating: {
    position: 'absolute',
    right: 15,
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#4779BC',
    backgroundColor: '#142C4E',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
  favoritesFloatingText: {fontSize: 27, color: '#FFD36D'},
  favoriteCountBadge: {
    position: 'absolute',
    right: -5,
    top: -5,
    borderRadius: 10,
    paddingHorizontal: 5,
    backgroundColor: '#236DE6',
  },
  favoriteCountText: {color: '#FFFFFF', fontSize: 11, fontWeight: '700'},
  routeBadge: {
    position: 'absolute',
    alignSelf: 'center',
    borderRadius: 16,
    backgroundColor: '#142C4E',
    borderWidth: 1,
    borderColor: '#4779BC',
    paddingHorizontal: 15,
    paddingVertical: 9,
  },
  routeBadgeText: {color: '#FFFFFF', fontSize: 13, fontWeight: '700'},
});
