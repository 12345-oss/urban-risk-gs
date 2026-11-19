import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMonitoramento } from '../state/MonitoramentoContext';
import { cores } from '../theme';

export function Cabecalho({ titulo }: { titulo: string }) {
  const insets = useSafeAreaInsets();
  const { conexao, online } = useMonitoramento();

  const pill = online
    ? { cor: '#34D399', texto: conexao.latenciaMs != null ? `Ao vivo · ${conexao.latenciaMs} ms` : 'Ao vivo' }
    : conexao.desconectadoDesde != null
      ? { cor: cores.aviso, texto: 'Offline' }
      : { cor: '#9CA3AF', texto: 'Conectando' };

  return (
    <View style={[styles.cabecalho, { paddingTop: insets.top + 10 }]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.marca}>RISCO URBANO SP</Text>
        <Text style={styles.titulo}>{titulo}</Text>
      </View>
      <View style={styles.pill} accessibilityLabel={`Status da conexão: ${pill.texto}`}>
        <View style={[styles.ponto, { backgroundColor: pill.cor }]} />
        <Text style={styles.pillTexto}>{pill.texto}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cabecalho: { backgroundColor: cores.marca, paddingHorizontal: 16, paddingBottom: 14, flexDirection: 'row', alignItems: 'flex-end' },
  marca: { color: '#9CC3DA', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  titulo: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 2 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14 },
  ponto: { width: 8, height: 8, borderRadius: 4 },
  pillTexto: { color: '#fff', fontSize: 12, fontWeight: '600' },
});
