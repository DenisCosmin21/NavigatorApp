
import {Linking} from 'react-native';

type Coordinates = {
  latitude: number;
  longitude: number;
};

export async function openDirections(
  origin: Coordinates,
  destination: Coordinates,
): Promise<void> {
  const originCoords =
    `${origin.latitude},${origin.longitude}`;

  const destinationCoords =
    `${destination.latitude},${destination.longitude}`;

  const url =
    'https://www.google.com/maps/dir/?api=1' +
    `&origin=${encodeURIComponent(originCoords)}` +
    `&destination=${encodeURIComponent(destinationCoords)}` +
    '&travelmode=driving';

  await Linking.openURL(url);
}
