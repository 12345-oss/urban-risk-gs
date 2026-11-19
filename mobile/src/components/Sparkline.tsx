import { StyleSheet, View } from 'react-native';

/** Mini gráfico de barras com as últimas leituras (sem bibliotecas nativas). */
export function Sparkline({ valores, cor, altura = 28, min, max }: { valores: number[]; cor: string; altura?: number; min?: number; max?: number }) {
  if (valores.length === 0) return <View style={{ height: altura }} />;
  const lo = min ?? Math.min(...valores);
  const hi = max ?? Math.max(...valores);
  const faixa = hi - lo || 1;
  return (
    <View style={[styles.area, { height: altura }]}>
      {valores.map((v, i) => {
        const h = Math.max(2, ((Math.min(hi, Math.max(lo, v)) - lo) / faixa) * altura);
        return <View key={i} style={[styles.barra, { height: h, backgroundColor: cor, opacity: 0.35 + (0.65 * (i + 1)) / valores.length }]} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  area: { flexDirection: 'row', alignItems: 'flex-end', gap: 1.5, flex: 1 },
  barra: { flex: 1, borderTopLeftRadius: 1.5, borderTopRightRadius: 1.5 },
});
