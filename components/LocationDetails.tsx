import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
} from 'react-native';

interface LocationDetailsProps {
  name: string;
  latitude: number;
  longitude: number;
  visible: boolean;
  isFavorite: boolean;
  loadingRoute?: boolean;
  onToggleFavorite: () => void;
  onGetDirections: () => void;
  onClose: () => void;
}

export function LocationDetails({
  name,
  latitude,
  longitude,
  visible,
  isFavorite,
  loadingRoute = false,
  onToggleFavorite,
  onGetDirections,
  onClose,
}: LocationDetailsProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.headerTextContainer}>
              <Text style={styles.title} numberOfLines={1}>
                {name}
              </Text>
              <Text style={styles.coordinatesText}>
                {latitude.toFixed(5)}, {longitude.toFixed(5)}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Draw Route In-App */}
          <TouchableOpacity
            style={styles.directionsButton}
            onPress={onGetDirections}
            disabled={loadingRoute}
            activeOpacity={0.8}
          >
            {loadingRoute ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.directionsButtonText}>Get Directions</Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Favorite Toggle */}
          <TouchableOpacity
            style={[
              styles.favoriteButton,
              isFavorite && styles.favoriteButtonActive,
            ]}
            onPress={onToggleFavorite}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.favoriteButtonText,
                isFavorite && styles.favoriteButtonTextActive,
              ]}
            >
              {isFavorite ? '★ Saved in Favorites' : '☆ Save to Favorites'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.dismissButton} onPress={onClose}>
            <Text style={styles.dismissText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerTextContainer: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  coordinatesText: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  closeButton: {
    padding: 6,
  },
  closeText: {
    fontSize: 18,
    color: '#8E8E93',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E5EA',
    marginVertical: 12,
  },
  directionsButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  directionsButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  favoriteButton: {
    backgroundColor: '#F9F9FB',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  favoriteButtonActive: {
    backgroundColor: '#FFFBEA',
    borderColor: '#F5A623',
  },
  favoriteButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#48484A',
  },
  favoriteButtonTextActive: {
    color: '#D48806',
  },
  dismissButton: {
    marginTop: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  dismissText: {
    fontSize: 15,
    color: '#8E8E93',
  },
});
