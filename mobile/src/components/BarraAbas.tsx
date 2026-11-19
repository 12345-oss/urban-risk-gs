import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cores } from '../theme';

export type Aba = 'painel' | 'alertas' | 'sensores' | 'relatar' | 'ajustes';

const ABAS: { id: Aba; rotulo: string; icone: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'painel', rotulo: 'Painel', icone: 'grid' },
  { id: 'alertas', rotulo: 'Alertas', icone: 'warning' },
  { id: 'sensores', rotulo: 'Sensores', icone: 'pulse' },
  { id: 'relatar', rotulo: 'Relatar', icone: 'megaphone' },
  { id: 'ajustes', rotulo: 'Ajustes', icone: 'settings' },
];

export function BarraAbas({ atual, onTrocar, badgeAlertas }: { atual: Aba; onTrocar: (a: Aba) => void; badgeAlertas: number }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.barra, { paddingBottom: Math.max(insets.bottom, 8) }]} accessibilityRole="tablist">
      {ABAS.map((aba) => {
        const ativa = aba.id === atual;
        return (
          <Pressable
            key={aba.id}
            onPress={() => onTrocar(aba.id)}
            style={styles.aba}
            accessibilityRole="tab"
            accessibilityState={{ selected: ativa }}
            accessibilityLabel={aba.rotulo}
          >
            <View>
              <Ionicons name={(ativa ? aba.icone : `${aba.icone}-outline`) as any} size={23} color={ativa ? cores.marca : '#8A94A3'} />
              {aba.id === 'alertas' && badgeAlertas > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeTexto}>{badgeAlertas > 9 ? '9+' : badgeAlertas}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.rotulo, ativa && styles.rotuloAtivo]}>{aba.rotulo}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  barra: { flexDirection: 'row', backgroundColor: cores.superficie, borderTopWidth: 1, borderTopColor: cores.borda, paddingTop: 8 },
  aba: { flex: 1, alignItems: 'center', gap: 2 },
  rotulo: { fontSize: 11, color: '#8A94A3', fontWeight: '600' },
  rotuloAtivo: { color: cores.marca },
  badge: { position: 'absolute', top: -4, right: -10, backgroundColor: '#B42318', borderRadius: 9, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeTexto: { color: '#fff', fontSize: 10, fontWeight: '800' },
});
