import { StyleSheet, Text, View } from 'react-native';
import { cores } from '../theme';

/** Barra de confiança do dado/alerta (0 a 1). */
export function ConfiancaBarra({ valor, rotulo = true }: { valor: number; rotulo?: boolean }) {
  const pct = Math.round(valor * 100);
  const cor = valor >= 0.85 ? cores.ok : valor >= 0.6 ? '#C98A00' : '#9AA3AF';
  const texto = valor >= 0.85 ? 'alta' : valor >= 0.6 ? 'média' : 'baixa';
  return (
    <View style={styles.linha} accessibilityLabel={`Confiança ${pct} por cento`}>
      {rotulo && <Text style={styles.rotulo}>Confiança</Text>}
      <View style={styles.trilho}>
        <View style={[styles.preenchido, { width: `${pct}%`, backgroundColor: cor }]} />
      </View>
      <Text style={[styles.valor, { color: cor }]}>
        {pct}% <Text style={styles.qualidade}>{texto}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  linha: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rotulo: { fontSize: 12, color: cores.textoSuave, width: 66 },
  trilho: { flex: 1, height: 6, borderRadius: 3, backgroundColor: '#E5E7EB', overflow: 'hidden' },
  preenchido: { height: 6, borderRadius: 3 },
  valor: { fontSize: 12, fontWeight: '700', minWidth: 72, textAlign: 'right' },
  qualidade: { fontWeight: '400' },
});
