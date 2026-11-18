
import {useEffect, useRef, useState} from 'react';
import {
  getCurrentCoordinates,
  requestLocationPermission,
  watchCurrentCoordinates,
  type LatLng,
  type LiveCoordinates,
} from '../../services/locationService';

const MIN_SPEED_KMH = 2;
const SPEED_HIDE_DELAY = 5000;

export function useLiveLocation(
  onLocation: (location: LatLng) => void,
) {
  const callbackRef = useRef(onLocation);
  callbackRef.current = onLocation;

  const [initialLocation, setInitialLocation] =
    useState<LatLng | null>(null);

  const [currentLocation, setCurrentLocation] =
    useState<LatLng | null>(null);

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

  const gpsShownRef = useRef(false);

  const speedTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;
    let hasPosition = false;

    let unsubscribe: (() => void) | null = null;

    const handlePosition = (position: LiveCoordinates) => {
      if (!active) {
        return;
      }

      hasPosition = true;

      const next = {
        latitude: position.latitude,
        longitude: position.longitude,
      };

      setCurrentLocation(next);
      setInitialLocation(previous => previous ?? next);
      setLocationError('');

      if (!gpsShownRef.current) {
        gpsShownRef.current = true;
        setGpsToast(true);
      }

      const speed = position.speed;

      const kmh =
        speed != null &&
        Number.isFinite(speed) &&
        speed >= 0
          ? speed * 3.6
          : 0;

      if (kmh >= MIN_SPEED_KMH) {
        setSpeedKmh(Math.max(2, Math.round(kmh)));

        if (speedTimerRef.current !== null) {
          clearTimeout(speedTimerRef.current);
        }

        speedTimerRef.current = setTimeout(() => {
          if (active) {
            setSpeedKmh(0);
          }
        }, SPEED_HIDE_DELAY);
      }

      callbackRef.current(next);
    };

    const start = async () => {
      try {
        const allowed = await requestLocationPermission();

        if (!active) {
          return;
        }

        if (!allowed) {
          setLocationAllowed(false);
          setLocationError(
            'Permite localizarea precisă din setările telefonului.',
          );
          return;
        }

        setLocationAllowed(true);

        unsubscribe = watchCurrentCoordinates(
          handlePosition,
          message => {
            if (active) {
              setLocationError('Eroare GPS: ' + message);
              setSpeedKmh(0);
            }
          },
        );

        getCurrentCoordinates().then(
          coordinates => {
            if (active && !hasPosition) {
              handlePosition({
                ...coordinates,
                speed: null,
              });
            }
          },
          error => {
            if (active && !hasPosition) {
              setLocationError(
                'Nu am putut obține locația: ' +
                  error.message,
              );
            }
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
      unsubscribe?.();

      if (speedTimerRef.current !== null) {
        clearTimeout(speedTimerRef.current);
      }
    };
  }, [retryKey]);

  const retryLocation = () => {
    setLocationError('');
    setRetryKey(value => value + 1);
  };

  return {
    initialLocation,
    currentLocation,
    locationAllowed,
    locationError,
    gpsToast,
    setGpsToast,
    speedKmh,
    retryLocation,
  };
}
