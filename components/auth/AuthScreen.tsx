
import React, {useEffect, useRef, useState} from 'react';
import {
  Alert,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

type AuthMode = 'login' | 'register';
type Field = 'name' | 'email' | 'password' | 'confirm' | null;

type AuthScreenProps = {
  onBack: () => void;
};

export function AuthScreen({onBack}: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState<Field>(null);
  const [error, setError] = useState('');

  const isRegister = mode === 'register';

  const heroOpacity = useRef(new Animated.Value(0)).current;
  const heroScale = useRef(new Animated.Value(0.76)).current;
  const sheetOpacity = useRef(new Animated.Value(0)).current;
  const sheetY = useRef(new Animated.Value(40)).current;
  const orbit = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const entrance = Animated.parallel([
      Animated.timing(heroOpacity, {
        toValue: 1,
        duration: 550,
        useNativeDriver: true,
      }),

      Animated.spring(heroScale, {
        toValue: 1,
        friction: 6,
        tension: 55,
        useNativeDriver: true,
      }),

      Animated.sequence([
        Animated.delay(180),
        Animated.parallel([
          Animated.timing(sheetOpacity, {
            toValue: 1,
            duration: 450,
            useNativeDriver: true,
          }),

          Animated.timing(sheetY, {
            toValue: 0,
            duration: 500,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]);

    const ambient = Animated.loop(
      Animated.sequence([
        Animated.timing(orbit, {
          toValue: 1,
          duration: 3100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),

        Animated.timing(orbit, {
          toValue: 0,
          duration: 3100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    entrance.start();
    ambient.start();

    return () => {
      entrance.stop();
      ambient.stop();
    };
  }, [
    heroOpacity,
    heroScale,
    sheetOpacity,
    sheetY,
    orbit,
  ]);

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setError('');
  };

  const handleSubmit = () => {
    setError('');

    if (isRegister && name.trim().length < 2) {
      setError('Introdu numele complet.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Introdu o adresă de email validă.');
      return;
    }

    if (password.length < 6) {
      setError('Parola trebuie să aibă minimum 6 caractere.');
      return;
    }

    if (isRegister && password !== confirmPassword) {
      setError('Parolele nu coincid.');
      return;
    }

    Alert.alert(
      'Formular validat',
      'Interfața este pregătită. Conturile reale vor fi conectate ulterior la autentificarea echipei.',
    );
  };

  return (
    <SafeAreaView
      style={styles.screen}
      edges={['top', 'left', 'right']}>

      <StatusBar barStyle="light-content" />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={
          Platform.OS === 'ios' ? 'padding' : undefined
        }>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          <View style={styles.hero}>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.ambientGlow,
                {
                  transform: [
                    {
                      scale: orbit.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.94, 1.12],
                      }),
                    },
                  ],
                },
              ]}
            />

            <Animated.View
              pointerEvents="none"
              style={[
                styles.ambientGlowSmall,
                {
                  transform: [
                    {
                      translateY: orbit.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -18],
                      }),
                    },
                  ],
                },
              ]}
            />

            <TouchableOpacity
              style={styles.backButton}
              onPress={onBack}
              accessibilityLabel="Înapoi la hartă">

              <Text style={styles.backArrow}>
                ‹
              </Text>

              <Text style={styles.backText}>
                Hartă
              </Text>
            </TouchableOpacity>

            <Animated.View
              style={[
                styles.brandCenter,
                {
                  opacity: heroOpacity,
                  transform: [
                    {scale: heroScale},
                  ],
                },
              ]}>

              <View style={styles.outerRing}>
                <View style={styles.middleRing}>
                  <View style={styles.logoTile}>
                    <Text style={styles.logoArrow}>
                      ↗
                    </Text>
                  </View>
                </View>

                <View style={styles.orbitDot} />
              </View>

              <Text style={styles.brandName}>
                NAVIGATOR
              </Text>
            </Animated.View>
          </View>

          <Animated.View
            style={[
              styles.sheet,
              {
                opacity: sheetOpacity,
                transform: [
                  {translateY: sheetY},
                ],
              },
            ]}>

            <View style={styles.sheetHandle} />

            <Text style={styles.title}>
              {isRegister
                ? 'Creează cont'
                : 'Bine ai revenit'}
            </Text>

            <View style={styles.tabs}>
              <TouchableOpacity
                style={[
                  styles.tab,
                  !isRegister && styles.tabActive,
                ]}
                onPress={() => switchMode('login')}>

                <Text
                  style={[
                    styles.tabText,
                    !isRegister && styles.tabTextActive,
                  ]}>
                  Conectare
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tab,
                  isRegister && styles.tabActive,
                ]}
                onPress={() => switchMode('register')}>

                <Text
                  style={[
                    styles.tabText,
                    isRegister && styles.tabTextActive,
                  ]}>
                  Înregistrare
                </Text>
              </TouchableOpacity>
            </View>

            {isRegister && (
              <>
                <Text style={styles.label}>
                  Nume complet
                </Text>

                <View
                  style={[
                    styles.inputBox,
                    focused === 'name' && styles.inputFocused,
                  ]}>

                  <Text style={styles.fieldIcon}>
                    ◉
                  </Text>

                  <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    onFocus={() => setFocused('name')}
                    onBlur={() => setFocused(null)}
                    placeholder="Numele tău"
                    placeholderTextColor="#95A3B8"
                    autoCapitalize="words"
                    autoComplete="name"
                  />
                </View>
              </>
            )}

            <Text style={styles.label}>
              Email
            </Text>

            <View
              style={[
                styles.inputBox,
                focused === 'email' && styles.inputFocused,
              ]}>

              <Text style={styles.fieldIcon}>
                @
              </Text>

              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                onFocus={() => setFocused('email')}
                onBlur={() => setFocused(null)}
                placeholder="nume@exemplu.com"
                placeholderTextColor="#95A3B8"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
              />
            </View>

            <Text style={styles.label}>
              Parolă
            </Text>

            <View
              style={[
                styles.inputBox,
                focused === 'password' && styles.inputFocused,
              ]}>

              <Text style={styles.fieldIcon}>
                ●
              </Text>

              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setFocused('password')}
                onBlur={() => setFocused(null)}
                placeholder="Minimum 6 caractere"
                placeholderTextColor="#95A3B8"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete={
                  isRegister
                    ? 'new-password'
                    : 'current-password'
                }
              />

              <TouchableOpacity
                onPress={() =>
                  setShowPassword(value => !value)
                }
                style={styles.passwordToggle}>

                <Text style={styles.passwordToggleText}>
                  {showPassword ? 'Ascunde' : 'Arată'}
                </Text>
              </TouchableOpacity>
            </View>

            {isRegister && (
              <>
                <Text style={styles.label}>
                  Confirmă parola
                </Text>

                <View
                  style={[
                    styles.inputBox,
                    focused === 'confirm' &&
                      styles.inputFocused,
                  ]}>

                  <Text style={styles.fieldIcon}>
                    ●
                  </Text>

                  <TextInput
                    style={styles.input}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    onFocus={() => setFocused('confirm')}
                    onBlur={() => setFocused(null)}
                    placeholder="Repetă parola"
                    placeholderTextColor="#95A3B8"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoComplete="new-password"
                  />
                </View>
              </>
            )}

            {error !== '' && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>
                  {error}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.submitButton}
              activeOpacity={0.85}
              onPress={handleSubmit}>

              <Text style={styles.submitText}>
                {isRegister
                  ? 'Creează cont'
                  : 'Conectează-te'}
              </Text>

              <Text style={styles.submitArrow}>
                →
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.switchButton}
              onPress={() =>
                switchMode(
                  isRegister ? 'login' : 'register',
                )
              }>

              <Text style={styles.switchText}>
                {isRegister
                  ? 'Ai deja cont? '
                  : 'Nu ai cont? '}

                <Text style={styles.switchAccent}>
                  {isRegister
                    ? 'Conectează-te'
                    : 'Înregistrează-te'}
                </Text>
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  screen: {
    flex: 1,
    backgroundColor: '#081329',
  },

  scrollContent: {
    flexGrow: 1,
    backgroundColor: '#081329',
  },

  hero: {
    height: 285,
    paddingTop: 14,
    overflow: 'hidden',
    backgroundColor: '#081329',
  },

  ambientGlow: {
    position: 'absolute',
    width: 310,
    height: 310,
    borderRadius: 155,
    backgroundColor: '#163F84',
    opacity: 0.42,
    top: -110,
    right: -95,
  },

  ambientGlowSmall: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#287CF2',
    opacity: 0.23,
    bottom: -80,
    left: -65,
  },

  backButton: {
    position: 'absolute',
    left: 23,
    top: 12,
    zIndex: 3,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
  },

  backArrow: {
    fontSize: 29,
    color: '#E5F0FF',
    lineHeight: 30,
    marginRight: 5,
  },

  backText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E5F0FF',
  },

  brandCenter: {
    alignItems: 'center',
    marginTop: 43,
  },

  outerRing: {
    width: 137,
    height: 137,
    borderRadius: 69,
    borderWidth: 1,
    borderColor: '#2D5BA1',
    alignItems: 'center',
    justifyContent: 'center',
  },

  middleRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 1,
    borderColor: '#4275BF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoTile: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: '#2B7BF4',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
  },

  logoArrow: {
    fontSize: 52,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 64,
  },

  orbitDot: {
    position: 'absolute',
    top: 14,
    right: 5,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#73DFFF',
  },

  brandName: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 4,
    marginTop: 13,
  },

  sheet: {
    flexGrow: 1,
    marginTop: -18,
    backgroundColor: '#F8FAFE',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 24,
    paddingTop: 13,
    paddingBottom: 25,
  },

  sheetHandle: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 3,
    backgroundColor: '#DCE5F1',
    marginBottom: 19,
  },

  title: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.6,
    color: '#152441',
    marginBottom: 21,
  },

  tabs: {
    flexDirection: 'row',
    backgroundColor: '#E9EFF8',
    borderRadius: 16,
    padding: 4,
    marginBottom: 23,
  },

  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 13,
  },

  tabActive: {
    backgroundColor: '#FFFFFF',
    elevation: 3,
  },

  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7F8FA5',
  },

  tabTextActive: {
    color: '#256FE6',
  },

  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#32425C',
    marginBottom: 8,
  },

  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 54,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E7F1',
    borderRadius: 15,
    marginBottom: 18,
  },

  inputFocused: {
    borderColor: '#3582F3',
    backgroundColor: '#F9FCFF',
  },

  fieldIcon: {
    width: 26,
    fontSize: 15,
    fontWeight: '700',
    color: '#7D91AD',
  },

  input: {
    flex: 1,
    fontSize: 14,
    color: '#18283F',
    paddingVertical: 10,
  },

  passwordToggle: {
    paddingVertical: 11,
    paddingLeft: 8,
  },

  passwordToggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2878EB',
  },

  errorBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 11,
    padding: 11,
    marginBottom: 14,
  },

  errorText: {
    fontSize: 12,
    color: '#B42318',
  },

  submitButton: {
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: '#2878EE',
    elevation: 5,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 4,
  },

  submitText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  submitArrow: {
    position: 'absolute',
    right: 20,
    fontSize: 23,
    color: '#FFFFFF',
  },

  switchButton: {
    alignItems: 'center',
    paddingVertical: 19,
  },

  switchText: {
    fontSize: 12,
    color: '#7B8A9F',
  },

  switchAccent: {
    fontWeight: '800',
    color: '#2576EA',
  },
});
