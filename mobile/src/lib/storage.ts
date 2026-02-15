import { Platform } from 'react-native';

const TOKEN_KEY = 'eha_auth_token';

// SecureStore only works on native (iOS/Android).
// On web, fall back to localStorage.
let SecureStore: typeof import('expo-secure-store') | null = null;
if (Platform.OS !== 'web') {
  SecureStore = require('expo-secure-store');
}

export async function getToken(): Promise<string | null> {
  if (SecureStore) {
    return SecureStore.getItemAsync(TOKEN_KEY);
  }
  return localStorage.getItem(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  if (SecureStore) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } else {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

export async function clearToken(): Promise<void> {
  if (SecureStore) {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}
