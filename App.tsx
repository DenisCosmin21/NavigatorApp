
import React, {useEffect, useRef, useState} from 'react';
import {
  Animated,
  Easing,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {GoogleMap} from './components/GoogleMap';
import {AuthScreen} from './components/auth/AuthScreen';
import type {Destination} from './components/search/DestinationSearch';

function App() {
  const [showAuth, setShowAuth] = useState(false);
  const [destination, setDestination] = useState<Destination | null>(null);
  const [showSplash, setShowSplash] = useState(true);

  const splashFade = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(0.7)).current;
  const logoTurn = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0.6)).current;
  const ringFade = useRef(new Animated.Value(0.8)).current;
  const dotsPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const dots = Animated.loop(
      Animated.sequence([
        Animated.timing(dotsPulse, {
          toValue: 1,
          duration: 550,
          useNativeDriver: true,
        }),
        Animated.timing(dotsPulse, {
          toValue: 0,
          duration: 550,
          useNativeDriver: true,
        }),
      ]),
    );
    dots.start();

    const entrance = Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 6,
        tension: 55,
        useNativeDriver: true,
      }),
      Animated.timing(logoTurn, {
        toValue: 1,
        duration: 820,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(ringScale, {
        toValue: 1.7,
        duration: 1250,
        useNativeDriver: true,
      }),
      Animated.timing(ringFade, {
        toValue: 0,
        duration: 1250,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(1450),
        Animated.timing(splashFade, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }),
      ]),
    ]);

    entrance.start(({finished}) => {
      if (finished) {
        setShowSplash(false);
      }
    });

    return () => {
      entrance.stop();
      dots.stop();
    };
  }, [dotsPulse, logoScale, logoTurn, ringFade, ringScale, splashFade]);

  const rotation = logoTurn.interpolate({
    inputRange: [0, 1],
    outputRange: ['-35deg', '0deg'],
  });

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      <View style={styles.root}>
        {showAuth ? (
          <AuthScreen onBack={() => setShowAuth(false)} />
        ) : (
          <GoogleMap
            destination={destination}
            onDestinationChange={setDestination}
            onOpenAccount={() => setShowAuth(true)}
          />
        )}

        {showSplash && (
          <Animated.View
            pointerEvents="auto"
            style={[styles.splash, {opacity: splashFade}]}>
            <View style={styles.routeOne} />
            <View style={styles.routeTwo} />
            <View style={styles.splashGlow} />

            <View style={styles.brandCenter}>
              <Animated.View
                style={[
                  styles.expandingRing,
                  {
                    opacity: ringFade,
                    transform: [{scale: ringScale}],
                  },
                ]}
              />
              <Animated.View
                style={{transform: [{scale: logoScale}, {rotate: rotation}]}}>
                <View style={styles.logoTile}>
                  <View style={styles.logoCircle}>
                    <Text style={styles.logoArrow}>➤</Text>
                  </View>
                </View>
              </Animated.View>
              <Text style={styles.brandText}>NAVIGATOR</Text>
              <View style={styles.dotsRow}>
                {[0, 1, 2].map(index => (
                  <Animated.View
                    key={index}
                    style={[
                      styles.dot,
                      {
                        opacity: dotsPulse.interpolate({
                          inputRange: [0, 0.5, 1],
                          outputRange:
                            index === 1
                              ? [0.35, 1, 0.35]
                              : [0.9, 0.3, 0.9],
                        }),
                        transform: [{
                          scale: dotsPulse.interpolate({
                            inputRange: [0, 0.5, 1],
                            outputRange:
                              index === 1
                                ? [0.8, 1.2, 0.8]
                                : [1, 0.8, 1],
                          }),
                        }],
                      },
                    ]}
                  />
                ))}
              </View>
            </View>
          </Animated.View>
        )}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#07142E',
  },
  splash: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 50,
    backgroundColor: '#07142E',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  splashGlow: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: '#102C63',
    opacity: 0.4,
  },
  routeOne: {
    position: 'absolute',
    left: -150,
    top: 90,
    width: 410,
    height: 6,
    borderRadius: 10,
    backgroundColor: '#0F4FB1',
    transform: [{rotate: '-32deg'}],
    opacity: 0.55,
  },
  routeTwo: {
    position: 'absolute',
    right: -140,
    bottom: 110,
    width: 420,
    height: 5,
    borderRadius: 10,
    backgroundColor: '#1362CA',
    transform: [{rotate: '-38deg'}],
    opacity: 0.65,
  },
  brandCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandingRing: {
    position: 'absolute',
    alignSelf: 'center',
    top: -17,
    width: 142,
    height: 142,
    borderRadius: 71,
    borderWidth: 2,
    borderColor: '#35ACFF',
  },
  logoTile: {
    width: 110,
    height: 110,
    borderRadius: 28,
    backgroundColor: '#146BE6',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 10,
  },
  logoCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 3,
    borderColor: '#9CCEFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoArrow: {
    fontSize: 53,
    color: '#FFFFFF',
    lineHeight: 64,
    transform: [{rotate: '-45deg'}],
    marginLeft: 4,
  },
  brandText: {
    marginTop: 28,
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '900',
    letterSpacing: 5,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 37,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#59B9FF',
  },
});

export default App;
