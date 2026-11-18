
import {NativeModules, Platform} from 'react-native';
import type {Destination} from '../components/search/DestinationSearch';

export type PlaceSuggestion = {
  id: string;
  name: string;
};

type PlacesNativeModule = {
  searchPlaces(query: string): Promise<PlaceSuggestion[]>;
  getPlaceDetails(placeId: string): Promise<Destination>;
};

function getPlacesModule(): PlacesNativeModule {
  const module = NativeModules.PlacesModule as
    | PlacesNativeModule
    | undefined;

  if (Platform.OS !== 'android' || !module) {
    throw new Error(
      'Google Places nu este disponibil pe acest dispozitiv.',
    );
  }

  return module;
}

export function searchPlaces(
  query: string,
): Promise<PlaceSuggestion[]> {
  return getPlacesModule().searchPlaces(query);
}

export function getPlaceDetails(
  placeId: string,
): Promise<Destination> {
  return getPlacesModule().getPlaceDetails(placeId);
}
