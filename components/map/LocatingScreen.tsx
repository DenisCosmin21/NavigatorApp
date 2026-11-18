
import React, {useEffect, useRef} from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export function LocatingScreen({
  error,
  onRetry,
  onOpenAccount,
}: {
  error: string;
  onRetry: () => void;
  onOpenAccount: () => void;
}) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 1700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    );

    animation.start();

    return () => animation.stop();
  }, [pulse]);

  return (
    <View style={styles.locatingScreen}>
      <TouchableOpacity
        style={styles.locatingAccount}
        onPress={onOpenAccount}>
        <Text style={styles.locatingAccountText}>
          Cont
        </Text>
      </TouchableOpacity>

      <View style={styles.radarContainer}>
        <Animated.View
          style={[
            styles.radarPulse,
            {
              opacity: pulse.interpolate({
                inputRange: [0, 1],
                outputRange: [0.9, 0],
              }),
              transform: [
                {
                  scale: pulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.65, 1.5],
                  }),
                },
              ],
            },
          ]}
        />

        <View style={styles.radarOuter}>
          <View style={styles.radarMiddle}>
            <View style={styles.radarCenter}>
              <Text style={styles.radarArrow}>
                ➤
              </Text>
            </View>
          </View>
        </View>
      </View>

      <Text style={styles.locatingTitle}>
        Detectăm locația...
      </Text>

      {error !== '' && (
        <>
          <Text style={styles.locatingError}>
            {error}
          </Text>

          <TouchableOpacity
            style={styles.retryButton}
            onPress={onRetry}>
            <Text style={styles.retryText}>
              Reîncearcă
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  locatingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#07142E',
    paddingHorizontal: 24,
  },

  locatingAccount: {
    position: 'absolute',
    top: 45,
    right: 20,
    padding: 12,
  },

  locatingAccountText: {
    color: '#90C6FF',
    fontWeight: '700',
  },

  radarContainer: {
    width: 245,
    height: 245,
    alignItems: 'center',
    justifyContent: 'center',
  },

  radarPulse: {
    position: 'absolute',
    width: 205,
    height: 205,
    borderRadius: 103,
    borderWidth: 2,
    borderColor: '#2E95FF',
    backgroundColor: 'rgba(20,105,242,0.14)',
  },

  radarOuter: {
    width: 205,
    height: 205,
    borderRadius: 103,
    borderWidth: 2,
    borderColor: '#204C87',
    alignItems: 'center',
    justifyContent: 'center',
  },

  radarMiddle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: '#2B69B1',
    alignItems: 'center',
    justifyContent: 'center',
  },

  radarCenter: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#135FCB',
    borderColor: '#399FFF',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  radarArrow: {
    fontSize: 48,
    color: '#FFFFFF',
    transform: [{rotate: '-45deg'}],
  },

  locatingTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 12,
  },

  locatingError: {
    fontSize: 12,
    color: '#FFD0D0',
    marginTop: 20,
    textAlign: 'center',
  },

  retryButton: {
    marginTop: 18,
    borderRadius: 12,
    paddingHorizontal: 22,
    paddingVertical: 12,
    backgroundColor: '#236DE6',
  },

  retryText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
