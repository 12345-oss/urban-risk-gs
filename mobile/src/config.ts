import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const CHAVE_URL = 'risco-urbano:url-servidor';
export const PORTA_API = 8080;

/**
 * Descobre o endereço da API sem configuração:
 * - web: mesmo host da página;
 * - Expo Go no celular: IP do computador que está rodando o Metro (hostUri);
 * - emulador Android: 10.0.2.2 (o "localhost" do computador).
 * Pode ser trocado na aba Ajustes.
 */
export function urlAutomatica(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
    return `http://${window.location.hostname}:${PORTA_API}`;
  }
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1' && !host.includes('exp.direct')) {
      return `http://${host}:${PORTA_API}`;
    }
  }
  if (Platform.OS === 'android') return `http://10.0.2.2:${PORTA_API}`;
  return `http://localhost:${PORTA_API}`;
}

export function normalizarUrl(url: string): string {
  let u = url.trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(u)) u = `http://${u}`;
  // aceita "192.168.0.10" sem porta
  if (!/:\d+$/.test(u.replace(/^https?:\/\//i, ''))) u = `${u}:${PORTA_API}`;
  return u;
}

export function urlWebSocket(urlApi: string): string {
  return `${urlApi.replace(/^http/i, 'ws')}/ws`;
}

export async function carregarUrlSalva(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(CHAVE_URL);
  } catch {
    return null;
  }
}

export async function salvarUrl(url: string | null): Promise<void> {
  try {
    if (url) await AsyncStorage.setItem(CHAVE_URL, url);
    else await AsyncStorage.removeItem(CHAVE_URL);
  } catch {
    // armazenamento indisponível: segue só em memória
  }
}
