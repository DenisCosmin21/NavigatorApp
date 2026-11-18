
import {Platform, PermissionsAndroid} from 'react-native';
import Geolocation from 'react-native-geolocation-service';

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface LiveCoordinates extends LatLng {
  speed: number | null;
}

export async function requestLocationPermission(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    const status = await Geolocation.requestAuthorization('whenInUse');
    return status === 'granted';
  }

  const permissions = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
  ]);

  return (
    permissions[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] ===
      PermissionsAndroid.RESULTS.GRANTED ||
    permissions[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] ===
      PermissionsAndroid.RESULTS.GRANTED
  );
}

export function getCurrentCoordinates(): Promise<LatLng> {
  return new Promise(async (resolve, reject) => {
    try {
      const hasPermission = await requestLocationPermission();

      if (!hasPermission) {
        reject(new Error('Location permission denied'));
        return;
      }

      Geolocation.getCurrentPosition(
        position => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        error => {
          let message = 'Unable to retrieve current location.';

          if (error.code === 1)
            message = 'Location permission was denied.';

          if (error.code === 2)
            message = 'Location provider disabled. Please turn on GPS.';

          if (error.code === 3)
            message = 'Location request timed out.';

          reject(new Error(message));
        },
        {
          enableHighAccuracy: Platform.OS === 'android',
          timeout: 20000,
          maximumAge: 10000,
          forceRequestLocation: true,
          showLocationDialog: true,
        },
      );
    } catch (error) {
      reject(error);
    }
  });
}

export function watchCurrentCoordinates(
  onLocation: (position: LiveCoordinates) => void,
  onError: (message: string) => void,
): () => void {
  const watchId = Geolocation.watchPosition(
    position => {
      onLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        speed: position.coords.speed ?? null,
      });
    },
    error => onError(error.message),
    {
      enableHighAccuracy: true,
      distanceFilter: 0,
      interval: 2000,
      fastestInterval: 1000,
    },
  );

  return () => Geolocation.clearWatch(watchId);
}
