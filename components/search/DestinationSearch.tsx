
import React, {useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export type Destination = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
};

type Props = {
  suggestions: Destination[];
  onQueryChange: (query: string) => void;
  onSelectDestination: (destination: Destination) => void;
  loading?: boolean;
  error?: string;
  focusRequest?: number;
};

export function DestinationSearch({
  suggestions,
  onQueryChange,
  onSelectDestination,
  loading = false,
  error = '',
  focusRequest = 0,
}: Props) {
  const inputRef = useRef<React.ComponentRef<typeof TextInput>>(null);
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (focusRequest > 0) {
      inputRef.current?.focus();
    }
  }, [focusRequest]);

  const update = (text: string) => {
    setQuery(text);
    onQueryChange(text);
  };

  const clear = () => {
    setQuery('');
    onQueryChange('');
    inputRef.current?.focus();
  };

  const select = (place: Destination) => {
    setQuery(place.name);
    setFocused(false);
    Keyboard.dismiss();
    onSelectDestination(place);
  };

  const showList = focused && query.trim().length >= 2;

  return (
    <View style={styles.root}>
      <View style={[styles.bar, focused && styles.barFocused]}>
        <View style={styles.searchIcon}>
          <View style={styles.lens} />
          <View style={styles.handle} />
        </View>

        <TextInput
          ref={inputRef}
          style={styles.input}
          value={query}
          onChangeText={update}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Unde vrei să ajungi?"
          placeholderTextColor="#B4C4DC"
          autoCapitalize="sentences"
          autoCorrect={false}
          returnKeyType="search"
        />

        {loading && (
          <ActivityIndicator
            size="small"
            color="#76B9FF"
          />
        )}

        {query.length > 0 && !loading && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={clear}
            accessibilityLabel="Șterge căutarea">
            <Text style={styles.clearText}>×</Text>
          </TouchableOpacity>
        )}
      </View>

      {showList && (
        suggestions.length > 0 ||
        error !== '' ||
        loading
      ) && (
        <View style={styles.dropdown}>
          {suggestions.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>
                DESTINAȚII
              </Text>

              <FlatList
                data={suggestions}
                keyExtractor={item => item.id}
                keyboardShouldPersistTaps="always"
                nestedScrollEnabled
                style={styles.list}
                renderItem={({item}) => (
                  <TouchableOpacity
                    style={styles.result}
                    onPress={() => select(item)}>

                    <View style={styles.pinCircle}>
                      <Text style={styles.pin}>⌖</Text>
                    </View>

                    <Text
                      style={styles.resultName}
                      numberOfLines={2}>
                      {item.name}
                    </Text>

                    <Text style={styles.resultArrow}>
                      ›
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </>
          )}

          {error !== '' && (
            <Text style={styles.error}>
              {error}
            </Text>
          )}

          {loading && suggestions.length === 0 && (
            <Text style={styles.hint}>
              Căutăm destinații...
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
  },

  bar: {
    height: 56,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 17,
    paddingRight: 13,
    backgroundColor: 'rgba(23,45,82,0.97)',
    borderWidth: 1,
    borderColor: '#385783',
    elevation: 7,
  },

  barFocused: {
    borderColor: '#66A8FF',
  },

  searchIcon: {
    width: 25,
    height: 26,
    marginRight: 9,
  },

  lens: {
    position: 'absolute',
    top: 4,
    left: 2,
    width: 15,
    height: 15,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E6F0FF',
  },

  handle: {
    position: 'absolute',
    top: 19,
    left: 14,
    width: 10,
    height: 2,
    borderRadius: 2,
    backgroundColor: '#E6F0FF',
    transform: [{rotate: '45deg'}],
  },

  input: {
    flex: 1,
    height: 55,
    paddingVertical: 0,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },

  clearButton: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: '#2A4570',
  },

  clearText: {
    color: '#E5F0FF',
    fontSize: 24,
    lineHeight: 27,
  },

  dropdown: {
    marginTop: 9,
    backgroundColor: '#142947',
    borderColor: '#304D76',
    borderWidth: 1,
    borderRadius: 18,
    padding: 10,
    elevation: 8,
  },

  sectionLabel: {
    fontSize: 10,
    color: '#86A7D2',
    fontWeight: '800',
    letterSpacing: 1,
    marginLeft: 8,
    marginBottom: 5,
  },

  list: {
    maxHeight: 280,
  },

  result: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 9,
    minHeight: 53,
  },

  pinCircle: {
    width: 35,
    height: 35,
    borderRadius: 12,
    backgroundColor: '#214579',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  pin: {
    color: '#90C2FF',
    fontSize: 25,
  },

  resultName: {
    flex: 1,
    fontSize: 13,
    color: '#F3F7FF',
    fontWeight: '600',
  },

  resultArrow: {
    fontSize: 22,
    color: '#91B7E4',
    marginLeft: 6,
  },

  error: {
    color: '#FFB3B3',
    fontSize: 12,
    padding: 9,
  },

  hint: {
    color: '#A7BBD8',
    fontSize: 12,
    padding: 9,
  },
});
