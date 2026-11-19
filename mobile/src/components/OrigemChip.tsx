import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { cores, nomeOrigem } from '../theme';
import type { Origem } from '../types';

const icone: Record<Origem, keyof typeof Ionicons.glyphMap> = {
  SENSOR_OFICIAL: 'hardware-chip-outline',
  BASE_PUBLICA: 'globe-outline',
  COMUNIDADE: 'people-outline',
};

export function OrigemChip({ origem }: { origem: Origem }) {
  return (
    <View style={styles.chip}>
      <Ionicons name={icone[origem]} size={12} color={cores.marca} />
      <Text style={styles.texto}>{nomeOrigem[origem]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: cores.marcaClara, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  texto: { fontSize: 11, color: cores.marca, fontWeight: '600' },
});
