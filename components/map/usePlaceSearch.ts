
import {useCallback, useEffect, useRef, useState} from 'react';
import {
  getPlaceDetails,
  searchPlaces,
} from '../../services/nativePlacesService';

import type {Destination} from '../search/DestinationSearch';

const SEARCH_DELAY_MS = 400;

export function usePlaceSearch() {
  const [suggestions, setSuggestions] =
    useState<Destination[]>([]);

  const [searchError, setSearchError] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);

  const requestRef = useRef(0);

  const timerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      requestRef.current++;

      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const cancelSearch = useCallback(() => {
    requestRef.current++;

    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = null;

    setSuggestions([]);
    setSearchError('');
    setSearchLoading(false);
  }, []);

  const onQueryChange = useCallback((query: string) => {
    requestRef.current++;
    const requestId = requestRef.current;

    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = null;
    setSearchError('');

    if (query.trim().length < 2) {
      setSuggestions([]);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);

    timerRef.current = setTimeout(async () => {
      try {
        const results = await searchPlaces(query.trim());

        if (
          !mountedRef.current ||
          requestId !== requestRef.current
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
      } catch (error) {
        if (
          !mountedRef.current ||
          requestId !== requestRef.current
        ) {
          return;
        }

        console.warn('Places search:', error);

        setSuggestions([]);
        setSearchError('Nu am putut căuta destinații.');
      } finally {
        if (
          mountedRef.current &&
          requestId === requestRef.current
        ) {
          setSearchLoading(false);
        }
      }
    }, SEARCH_DELAY_MS);
  }, []);

  const resolveSuggestion = useCallback(
    async (placeId: string): Promise<Destination | null> => {
      const requestId = requestRef.current;

      try {
        const selected = await getPlaceDetails(placeId);

        if (
          !mountedRef.current ||
          requestId !== requestRef.current
        ) {
          return null;
        }

        if (
          !selected ||
          !Number.isFinite(selected.latitude) ||
          !Number.isFinite(selected.longitude)
        ) {
          setSearchError(
            'Destinația nu are coordonate valide.',
          );
          return null;
        }

        return selected;
      } catch (error) {
        if (
          mountedRef.current &&
          requestId === requestRef.current
        ) {
          console.warn('Places details:', error);
          setSearchError(
            'Nu am putut încărca destinația.',
          );
        }

        return null;
      }
    },
    [],
  );

  return {
    suggestions,
    searchError,
    searchLoading,
    cancelSearch,
    onQueryChange,
    resolveSuggestion,
  };
}
