import { StyleSheet, Text, View } from 'react-native';
import { corNivel, nomeNivel } from '../theme';
import type { RiscoArea } from '../types';

export function NivelBadge({ nivel, pequeno }: { nivel: RiscoArea; pequeno?: boolean }) {
  const cor = corNivel[nivel];
  return (
    <View style={[styles.badge, { backgroundColor: cor.fundo }, pequeno && styles.pequeno]} accessibilityLabel={`Nível ${nomeNivel[nivel]}`}>
      <Text style={[styles.texto, { color: cor.texto }, pequeno && styles.textoPequeno]}>{nomeNivel[nivel].toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start' },
  pequeno: { paddingHorizontal: 7, paddingVertical: 2 },
  texto: { fontWeight: '800', fontSize: 12, letterSpacing: 0.6 },
  textoPequeno: { fontSize: 10 },
});
