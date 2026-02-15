import Constants from 'expo-constants';

const ENV = {
  apiUrl: Constants.expoConfig?.extra?.apiUrl ?? process.env.EXPO_PUBLIC_API_URL ?? 'https://ehaconnect.com',
  googleClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '',
};

export default ENV;
