import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { tempoRelativo } from '../format';
import { useAgora, useMonitoramento } from '../state/MonitoramentoContext';
import { cores } from '../theme';

/**
 * Aviso de conexão. Aparece quando o backend está fora do ar, mostra há quanto
 * tempo os dados estão parados e quando será a próxima tentativa. Quando a
 * conexão volta, mostra uma confirmação rápida.
 */
export function BannerConexao() {
  const { conexao, ultimaAtualizacao, painel, reconectarAgora, urlApi, online } = useMonitoramento();
  const agora = useAgora(500);
  const [reconectou, setReconectou] = useState(false);
  const caiuAntes = useRef(false);

  useEffect(() => {
    if (!online && conexao.desconectadoDesde != null) caiuAntes.current = true;
    if (online && caiuAntes.current) {
      caiuAntes.current = false;
      setReconectou(true);
      const t = setTimeout(() => setReconectou(false), 3500);
      return () => clearTimeout(t);
    }
  }, [online, conexao.desconectadoDesde]);

  if (online) {
    if (!reconectou) return null;
    return (
      <View style={[styles.banner, styles.ok]} accessibilityLiveRegion="polite">
        <Ionicons name="checkmark-circle" size={20} color="#fff" />
        <Text style={styles.tituloClaro}>Conexão restabelecida · dados sincronizados</Text>
      </View>
    );
  }

  // primeira conexão, ainda sem nenhum dado
  if (conexao.desconectadoDesde == null && conexao.estado === 'conectando') {
    return (
      <View style={[styles.banner, styles.neutro]}>
        <ActivityIndicator size="small" color={cores.marca} />
        <Text style={styles.tituloEscuro}>Conectando ao servidor…</Text>
      </View>
    );
  }

  const segundos = conexao.proximaTentativaEm ? Math.max(0, Math.ceil((conexao.proximaTentativaEm - agora) / 1000)) : null;
  const tentando = segundos == null || segundos === 0;

  return (
    <View style={[styles.banner, styles.offline]} accessibilityLiveRegion="assertive" accessibilityRole="alert">
      <Ionicons name="cloud-offline" size={24} color={cores.aviso} />
      <View style={{ flex: 1 }}>
        <Text style={styles.tituloClaro}>Sem conexão com o servidor</Text>
        <Text style={styles.detalhe}>
          {painel ? `Mostrando os últimos dados recebidos (${tempoRelativo(ultimaAtualizacao, agora)}).` : 'Ainda não há dados salvos.'}
        </Text>
        <Text style={styles.detalhe}>
          {tentando ? 'Tentando reconectar…' : `Nova tentativa em ${segundos} s`} · tentativa {Math.max(1, conexao.tentativa)}
        </Text>
        <Text style={styles.url} numberOfLines={1}>{urlApi}</Text>
      </View>
      <Pressable
        onPress={reconectarAgora}
        disabled={tentando}
        style={({ pressed }) => [styles.botao, (pressed || tentando) && { opacity: 0.6 }]}
        accessibilityRole="button"
      >
        {tentando ? <ActivityIndicator size="small" color={cores.offline} /> : <Text style={styles.botaoTexto}>Tentar agora</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10 },
  offline: { backgroundColor: cores.offline },
  ok: { backgroundColor: cores.ok },
  neutro: { backgroundColor: cores.marcaClara },
  tituloClaro: { color: '#fff', fontWeight: '700', fontSize: 14 },
  tituloEscuro: { color: cores.marca, fontWeight: '600', fontSize: 14 },
  detalhe: { color: '#D1D5DB', fontSize: 12, marginTop: 1 },
  url: { color: '#9CA3AF', fontSize: 11, marginTop: 2 },
  botao: { backgroundColor: cores.aviso, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, minWidth: 96, alignItems: 'center' },
  botaoTexto: { color: cores.offline, fontWeight: '800', fontSize: 13 },
});
