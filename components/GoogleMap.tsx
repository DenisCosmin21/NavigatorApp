
import React, {useEffect, useRef, useState} from 'react';
import {
  Animated,
  Easing,
  NativeEventEmitter,
  NativeModules,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, {Marker, PROVIDER_GOOGLE} from 'react-native-maps';
import Geolocation from '@react-native-community/geolocation';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {
  DestinationSearch,
  type Destination,
} from './search/DestinationSearch';

const MIN_SPEED_KMH = 2;
const SPEED_HIDE_DELAY = 5000;
const ACCELERATION_THRESHOLD = 0.8;
const GYRO_THRESHOLD = 0.18;

type Coordinates = {
  latitude: number;
  longitude: number;
};

type PlaceSuggestion = {
  id: string;
  name: string;
};

type PlacesNativeModule = {
  searchPlaces(query: string): Promise<PlaceSuggestion[]>;
  getPlaceDetails(placeId: string): Promise<Destination>;
};

type MotionNativeModule = {
  addListener(eventName: string): void;
  removeListeners(count: number): void;
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

const MotionModule = NativeModules.MotionModule as
  | MotionNativeModule
  | undefined;

const DARK_MAP_STYLE = [
  {
    elementType: 'geometry',
    stylers: [{color: '#11213A'}],
  },
  {
    elementType: 'labels.text.fill',
    stylers: [{color: '#9BAFCE'}],
  },
  {
    elementType: 'labels.text.stroke',
    stylers: [{color: '#0B1830'}],
  },
  {
    featureType: 'administrative',
    elementType: 'geometry',
    stylers: [{color: '#263957'}],
  },
  {
    featureType: 'landscape',
    elementType: 'geometry',
    stylers: [{color: '#101E34'}],
  },
  {
    featureType: 'poi',
    elementType: 'geometry',
    stylers: [{color: '#172B44'}],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{color: '#123639'}],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{color: '#2A4061'}],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{color: '#315B94'}],
  },
  {
    featureType: 'road.local',
    elementType: 'geometry',
    stylers: [{color: '#263A56'}],
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{color: '#24405E'}],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{color: '#07152D'}],
  },
];

function LocatingScreen({
  error,
  onRetry,
  onOpenAccount,
}: {
  error: string;
  onRetry: () => void;
  onOpenAccount: () => void;
}) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 1700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    );

    animation.start();

    return () => animation.stop();
  }, [pulse]);

  return (
    <View style={styles.locatingScreen}>
      <TouchableOpacity
        style={styles.locatingAccount}
        onPress={onOpenAccount}>
        <Text style={styles.locatingAccountText}>
          Cont
        </Text>
      </TouchableOpacity>

      <View style={styles.radarContainer}>
        <Animated.View
          style={[
            styles.radarPulse,
            {
              opacity: pulse.interpolate({
                inputRange: [0, 1],
                outputRange: [0.9, 0],
              }),
              transform: [
                {
                  scale: pulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.65, 1.5],
                  }),
                },
              ],
            },
          ]}
        />

        <View style={styles.radarOuter}>
          <View style={styles.radarMiddle}>
            <View style={styles.radarCenter}>
              <Text style={styles.radarArrow}>
                ➤
              </Text>
            </View>
          </View>
        </View>
      </View>

      <Text style={styles.locatingTitle}>
        Detectăm locația...
      </Text>

      {error !== '' && (
        <>
          <Text style={styles.locatingError}>
            {error}
          </Text>

          <TouchableOpacity
            style={styles.retryButton}
            onPress={onRetry}>
            <Text style={styles.retryText}>
              Reîncearcă
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

export function GoogleMap({
  destination,
  onDestinationChange,
  onOpenAccount,
}: GoogleMapProps) {
  const insets = useSafeAreaInsets();

  const mapRef = useRef<MapView>(null);
  const lastLocationRef = useRef<Coordinates | null>(null);
  const followLocationRef = useRef(destination === null);
  const searchRequestRef = useRef(0);
  const gpsShownRef = useRef(false);

  const searchTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const speedTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const motionTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const gyroTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const toastOpacity =
    useRef(new Animated.Value(0)).current;

  const toastY =
    useRef(new Animated.Value(-10)).current;

  const [initialLocation, setInitialLocation] =
    useState<Coordinates | null>(null);

  const [currentLocation, setCurrentLocation] =
    useState<Coordinates | null>(null);

  const [locationAllowed, setLocationAllowed] =
    useState(false);

  const [locationError, setLocationError] =
    useState('');

  const [retryKey, setRetryKey] =
    useState(0);

  const [gpsToast, setGpsToast] =
    useState(false);

  const [speedKmh, setSpeedKmh] =
    useState(0);

  const [accelerating, setAccelerating] =
    useState(false);

  const [rotating, setRotating] =
    useState(false);

  const [heading, setHeading] =
    useState<number | null>(null);

  const [mapRotated, setMapRotated] =
    useState(false);

  const [suggestions, setSuggestions] =
    useState<Destination[]>([]);

  const [searchError, setSearchError] =
    useState('');

  const [searchLoading, setSearchLoading] =
    useState(false);

  const [searchKey, setSearchKey] =
    useState(0);

  const [focusSearch, setFocusSearch] =
    useState(0);

  useEffect(() => {
    let active = true;
    let watchId: number | null = null;

    const onPosition = (position: {
      coords: {
        latitude: number;
        longitude: number;
        speed?: number | null;
      };
    }) => {
      if (!active) {
        return;
      }

      const {
        latitude,
        longitude,
        speed,
      } = position.coords;

      const next = {
        latitude,
        longitude,
      };

      lastLocationRef.current = next;

      setCurrentLocation(next);

      setInitialLocation(
        previous => previous ?? next,
      );

      setLocationError('');

      if (!gpsShownRef.current) {
        gpsShownRef.current = true;
        setGpsToast(true);
      }

      const kmh =
        speed != null &&
        Number.isFinite(speed) &&
        speed >= 0
          ? speed * 3.6
          : 0;

      if (kmh >= MIN_SPEED_KMH) {
        setSpeedKmh(
          Math.max(2, Math.round(kmh)),
        );

        if (speedTimerRef.current !== null) {
          clearTimeout(speedTimerRef.current);
        }

        speedTimerRef.current = setTimeout(() => {
          if (active) {
            setSpeedKmh(0);
          }
        }, SPEED_HIDE_DELAY);
      }

      if (
        followLocationRef.current &&
        mapRef.current
      ) {
        mapRef.current.animateCamera(
          {
            center: next,
          },
          {
            duration: 450,
          },
        );
      }
    };

    const start = async () => {
      try {
        if (Platform.OS === 'android') {
          const result =
            await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS
                .ACCESS_FINE_LOCATION,
            );

          if (
            result !==
            PermissionsAndroid.RESULTS.GRANTED
          ) {
            if (active) {
              setLocationError(
                'Permite localizarea precisă din setările telefonului.',
              );
            }

            return;
          }
        }

        if (!active) {
          return;
        }

        setLocationAllowed(true);

        Geolocation.getCurrentPosition(
          onPosition,
          error => {
            if (
              active &&
              !lastLocationRef.current
            ) {
              setLocationError(
                'Nu am putut obține locația: ' +
                  error.message,
              );
            }
          },
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 2000,
          },
        );

        watchId = Geolocation.watchPosition(
          onPosition,
          error => {
            if (active) {
              setLocationError(
                'Eroare GPS: ' + error.message,
              );

              setSpeedKmh(0);
            }
          },
          {
            enableHighAccuracy: true,
            distanceFilter: 0,
            interval: 2000,
            fastestInterval: 1000,
          },
        );
      } catch {
        if (active) {
          setLocationError(
            'Localizarea nu a putut fi activată.',
          );
        }
      }
    };

    start();

    return () => {
      active = false;

      if (watchId !== null) {
        Geolocation.clearWatch(watchId);
      }

      if (speedTimerRef.current !== null) {
        clearTimeout(speedTimerRef.current);
      }
    };
  }, [retryKey]);

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

  useEffect(() => {
    if (
      !MotionModule ||
      typeof MotionModule.addListener !== 'function' ||
      typeof MotionModule.removeListeners !== 'function'
    ) {
      return;
    }

    let active = true;

    const emitter =
      new NativeEventEmitter(MotionModule);

    const motion = emitter.addListener(
      'MotionUpdate',
      (...args: readonly Object[]) => {
        const event = args[0] as
          | {magnitude?: unknown}
          | undefined;

        const magnitude =
          typeof event?.magnitude === 'number'
            ? event.magnitude
            : 0;

        if (
          !active ||
          !Number.isFinite(magnitude) ||
          magnitude < ACCELERATION_THRESHOLD
        ) {
          return;
        }

        setAccelerating(true);

        if (motionTimerRef.current !== null) {
          clearTimeout(motionTimerRef.current);
        }

        motionTimerRef.current = setTimeout(() => {
          if (active) {
            setAccelerating(false);
          }
        }, 1200);
      },
    );

    const gyro = emitter.addListener(
      'GyroscopeUpdate',
      (...args: readonly Object[]) => {
        const event = args[0] as
          | {magnitude?: unknown}
          | undefined;

        const magnitude =
          typeof event?.magnitude === 'number'
            ? event.magnitude
            : 0;

        if (
          !active ||
          !Number.isFinite(magnitude) ||
          magnitude < GYRO_THRESHOLD
        ) {
          return;
        }

        setRotating(true);

        if (gyroTimerRef.current !== null) {
          clearTimeout(gyroTimerRef.current);
        }

        gyroTimerRef.current = setTimeout(() => {
          if (active) {
            setRotating(false);
          }
        }, 900);
      },
    );

    const orientation = emitter.addListener(
      'OrientationUpdate',
      (...args: readonly Object[]) => {
        const event = args[0] as
          | {heading?: unknown}
          | undefined;

        const value =
          typeof event?.heading === 'number'
            ? event.heading
            : null;

        if (
          active &&
          value !== null &&
          Number.isFinite(value)
        ) {
          setHeading(value);
        }
      },
    );

    return () => {
      active = false;

      motion.remove();
      gyro.remove();
      orientation.remove();

      if (motionTimerRef.current !== null) {
        clearTimeout(motionTimerRef.current);
      }

      if (gyroTimerRef.current !== null) {
        clearTimeout(gyroTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      searchRequestRef.current++;

      if (searchTimerRef.current !== null) {
        clearTimeout(searchTimerRef.current);
      }
    };
  }, []);

  const cancelSearch = () => {
    searchRequestRef.current++;

    if (searchTimerRef.current !== null) {
      clearTimeout(searchTimerRef.current);
    }

    searchTimerRef.current = null;

    setSuggestions([]);
    setSearchError('');
    setSearchLoading(false);
  };

  const selectDestination = (
    next: Destination,
  ) => {
    followLocationRef.current = false;

    onDestinationChange(next);

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

  const handleQueryChange = (
    query: string,
  ) => {
    if (searchTimerRef.current !== null) {
      clearTimeout(searchTimerRef.current);
    }

    searchTimerRef.current = null;

    const requestId =
      ++searchRequestRef.current;

    setSearchError('');

    if (query.trim().length < 2) {
      setSuggestions([]);
      setSearchLoading(false);
      return;
    }

    if (!PlacesModule) {
      setSuggestions([]);
      setSearchLoading(false);

      setSearchError(
        'Google Places nu este disponibil.',
      );

      return;
    }

    setSearchLoading(true);

    searchTimerRef.current = setTimeout(
      async () => {
        try {
          const results =
            await PlacesModule.searchPlaces(
              query.trim(),
            );

          if (
            requestId !==
            searchRequestRef.current
          ) {
            return;
          }

          setSuggestions(
            results.map(place => ({
              id: place.id,
              name: place.name,
              latitude: 0,
              longitude: 0,
            })),
          );

          setSearchLoading(false);
        } catch (error) {
          console.warn(
            'Places search:',
            error,
          );

          if (
            requestId !==
            searchRequestRef.current
          ) {
            return;
          }

          setSuggestions([]);
          setSearchLoading(false);

          setSearchError(
            'Nu am putut căuta destinații.',
          );
        }
      },
      400,
    );
  };

  const handleSuggestionSelect = async (
    place: Destination,
  ) => {
    cancelSearch();

    if (!PlacesModule) {
      return;
    }

    const requestId =
      searchRequestRef.current;

    try {
      const selected =
        await PlacesModule.getPlaceDetails(
          place.id,
        );

      if (
        requestId !==
        searchRequestRef.current
      ) {
        return;
      }

      if (
        !selected ||
        !Number.isFinite(selected.latitude) ||
        !Number.isFinite(selected.longitude)
      ) {
        setSearchError(
          'Destinația nu are coordonate valide.',
        );

        return;
      }

      selectDestination(selected);
    } catch (error) {
      if (
        requestId ===
        searchRequestRef.current
      ) {
        console.warn(
          'Places details:',
          error,
        );

        setSearchError(
          'Nu am putut încărca destinația.',
        );
      }
    }
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
        onRetry={() => {
          setLocationError('');

          setRetryKey(
            value => value + 1,
          );
        }}
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

        {destination !== null && (
          <Marker
            coordinate={{
              latitude: destination.latitude,
              longitude: destination.longitude,
            }}
            title={destination.name}
            pinColor="#3B82F6"
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
            onQueryChange={handleQueryChange}
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
            onPress={() =>
              mapRef.current?.animateCamera(
                {
                  center: {
                    latitude: destination.latitude,
                    longitude: destination.longitude,
                  },
                  zoom: 15,
                },
                {duration: 500},
              )
            }
            accessibilityLabel="Centrează harta pe destinație">

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

  locatingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#07142E',
    paddingHorizontal: 24,
  },

  locatingAccount: {
    position: 'absolute',
    top: 45,
    right: 20,
    padding: 12,
  },

  locatingAccountText: {
    color: '#90C6FF',
    fontWeight: '700',
  },

  radarContainer: {
    width: 245,
    height: 245,
    alignItems: 'center',
    justifyContent: 'center',
  },

  radarPulse: {
    position: 'absolute',
    width: 205,
    height: 205,
    borderRadius: 103,
    borderWidth: 2,
    borderColor: '#2E95FF',
    backgroundColor: 'rgba(20,105,242,0.14)',
  },

  radarOuter: {
    width: 205,
    height: 205,
    borderRadius: 103,
    borderWidth: 2,
    borderColor: '#204C87',
    alignItems: 'center',
    justifyContent: 'center',
  },

  radarMiddle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: '#2B69B1',
    alignItems: 'center',
    justifyContent: 'center',
  },

  radarCenter: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#135FCB',
    borderColor: '#399FFF',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  radarArrow: {
    fontSize: 48,
    color: '#FFFFFF',
    transform: [{rotate: '-45deg'}],
  },

  locatingTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 12,
  },

  locatingError: {
    fontSize: 12,
    color: '#FFD0D0',
    marginTop: 20,
    textAlign: 'center',
  },

  retryButton: {
    marginTop: 18,
    borderRadius: 12,
    paddingHorizontal: 22,
    paddingVertical: 12,
    backgroundColor: '#236DE6',
  },

  retryText: {
    color: '#FFFFFF',
    fontWeight: '700',
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
});
