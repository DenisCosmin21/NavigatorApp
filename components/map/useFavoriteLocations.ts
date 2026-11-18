
import {useEffect, useState} from 'react';

import {
  addFavorite,
  loadFavorites,
  removeFavorite,
  type FavoriteLocation,
} from '../../services/favoritesService';

import type {Destination} from '../search/DestinationSearch';

function favoriteKey(
  latitude: number,
  longitude: number,
): string {
  return `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
}

export function useFavoriteLocations() {
  const [favorites, setFavorites] =
    useState<FavoriteLocation[]>([]);

  const [favoritesLoading, setFavoritesLoading] =
    useState(true);

  useEffect(() => {
    let active = true;

    loadFavorites()
      .then(result => {
        if (active) {
          setFavorites(result.favorites);
        }
      })
      .catch(error => {
        console.warn('Favorites load:', error);
      })
      .finally(() => {
        if (active) {
          setFavoritesLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const isFavorite = (
    destination: Destination | null,
  ): boolean =>
    destination !== null &&
    favorites.some(
      favorite =>
        favoriteKey(
          favorite.latitude,
          favorite.longitude,
        ) ===
        favoriteKey(
          destination.latitude,
          destination.longitude,
        ),
    );

  const toggleFavorite = async (
    destination: Destination,
  ): Promise<void> => {
    if (isFavorite(destination)) {
      const updated = await removeFavorite(
        destination.latitude,
        destination.longitude,
      );

      setFavorites(updated);
    } else {
      const updated = await addFavorite({
        name: destination.name,
        latitude: destination.latitude,
        longitude: destination.longitude,
      });

      setFavorites(updated);
    }
  };

  return {
    favorites,
    favoritesLoading,
    isFavorite,
    toggleFavorite,
  };
}
