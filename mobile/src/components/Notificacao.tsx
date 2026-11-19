import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMonitoramento } from '../state/MonitoramentoContext';
import { corNivel, iconeRisco, nomeNivel } from '../theme';

/** Aviso que aparece por cima da tela quando chega um alerta alto/crítico. */
export function Notificacao({ onAbrir }: { onAbrir: () => void }) {
  const { notificacao, fecharNotificacao } = useMonitoramento();
  const insets = useSafeAreaInsets();
  if (!notificacao) return null;
  const { alerta, evento } = notificacao;
  const cor = corNivel[alerta.nivel];
  const titulo = evento === 'ESCALONADO' ? `Alerta piorou: ${nomeNivel[alerta.nivel]}` : `Novo alerta ${nomeNivel[alerta.nivel].toLowerCase()}`;

  return (
    <View style={[styles.camada, { top: insets.top + 8 }]} pointerEvents="box-none">
      <Pressable
        style={[styles.card, { backgroundColor: cor.fundo }]}
        onPress={() => {
          fecharNotificacao();
          onAbrir();
        }}
        accessibilityRole="alert"
      >
        <Ionicons name={iconeRisco[alerta.tipo] as any} size={26} color={cor.texto} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.titulo, { color: cor.texto }]}>{titulo}</Text>
          <Text style={[styles.texto, { color: cor.texto }]} numberOfLines={2}>
            {alerta.tipoDescricao} em {alerta.areaNome} · {alerta.valorReferencia}
          </Text>
        </View>
        <Pressable onPress={fecharNotificacao} hitSlop={12} accessibilityLabel="Fechar aviso">
          <Ionicons name="close" size={20} color={cor.texto} />
        </Pressable>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  camada: { position: 'absolute', left: 12, right: 12, zIndex: 50 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14,
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8,
  },
  titulo: { fontWeight: '800', fontSize: 15 },
  texto: { fontSize: 13, marginTop: 2 },
});
