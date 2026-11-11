/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GoogleMap } from './components/GoogleMap';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <GoogleMap
        googleApiKey={'AIzaSyAGQd60jcrOTVZYkcGB3qlv7qIimb0f2f4'}
        initialLatitude={45.7537}
        initialLongitude={21.2257}
      />
    </SafeAreaProvider>
  );
}

export default App;
