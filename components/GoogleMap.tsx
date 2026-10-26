import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';

const defaultLatitude = 51.5074;
const defaultLongitude = -0.1278;
const defaultZoomLevel = 12;
const minZoom = 1;
const maxZoom = 20;

/** Calculate region delta from a zoom level */
function getDeltaFromZoom(zoom: number): number {
  return 0.02 * Math.pow(2, 10 - zoom);
}

interface GoogleMapProps {
  /** Latitude to center the map on */
  latitude?: number;
  /** Longitude to center the map on */
  longitude?: number;
}

export function GoogleMap({ latitude, longitude }: GoogleMapProps) {
  const mapRef = useRef<MapView>(null);
  const [zoomLevel, setZoomLevel] = useState(defaultZoomLevel);

  const centerLat = latitude ?? defaultLatitude;
  const centerLng = longitude ?? defaultLongitude;
  const delta = getDeltaFromZoom(zoomLevel);

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 1, maxZoom));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 1, minZoom));
  };

  const handleMapReady = () => {
    console.log('[GoogleMap] Map is ready');
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: centerLat,
          longitude: centerLng,
          latitudeDelta: delta,
          longitudeDelta: delta,
        }}
        showsUserLocation
        showsCompass
        onMapReady={handleMapReady}
      />
      <View style={styles.zoomContainer}>
        <TouchableOpacity style={styles.zoomButton} onPress={handleZoomIn}>
          <Text style={styles.zoomText}>+</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.zoomButton} onPress={handleZoomOut}>
          <Text style={styles.zoomText}>−</Text>
        </TouchableOpacity>
      </View>
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
  zoomContainer: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    pointerEvents: 'box-none',
    paddingBottom: 40,
    paddingRight: 16,
  },
  zoomButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 3,
  },
  zoomText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
});
