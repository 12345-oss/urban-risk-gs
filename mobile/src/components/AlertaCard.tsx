import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { tempoRelativoIso } from '../format';
import { cores, corNivel, iconeRisco, sombra } from '../theme';
import type { Alerta } from '../types';
import { ConfiancaBarra } from './ConfiancaBarra';
import { NivelBadge } from './NivelBadge';
import { OrigemChip } from './OrigemChip';

export function AlertaCard({ alerta, onPress, agora, desatualizado }: { alerta: Alerta; onPress?: () => void; agora: number; desatualizado?: boolean }) {
  const cor = corNivel[alerta.nivel];
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, { borderLeftColor: cor.fundo }, pressed && { opacity: 0.85 }, desatualizado && styles.desatualizado]}
      accessibilityRole="button"
      accessibilityLabel={`Alerta ${alerta.tipoDescricao} em ${alerta.areaNome}, nível ${alerta.nivel}`}
    >
      <View style={styles.topo}>
        <View style={[styles.icone, { backgroundColor: cor.suave }]}>
          <Ionicons name={iconeRisco[alerta.tipo] as any} size={20} color={cor.fundo === '#F5B301' ? '#8A6400' : cor.fundo} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.titulo}>{alerta.tipoDescricao}</Text>
          <Text style={styles.area}>{alerta.areaNome}</Text>
        </View>
        <NivelBadge nivel={alerta.nivel} />
      </View>

      <Text style={styles.mensagem}>{alerta.valorReferencia}</Text>
      <ConfiancaBarra valor={alerta.confianca} />

      <View style={styles.rodape}>
        <View style={styles.origens}>
          {alerta.origens.map((o) => (
            <OrigemChip key={o} origem={o} />
          ))}
        </View>
        <Text style={styles.tempo}>{tempoRelativoIso(alerta.criadoEm, agora)}</Text>
      </View>

      <View style={styles.tags}>
        {!alerta.confirmado && <Text style={[styles.tag, styles.tagAviso]}>Não confirmado</Text>}
        {alerta.status === 'RECONHECIDO' && <Text style={[styles.tag, styles.tagOk]}>Reconhecido</Text>}
        {alerta.status === 'ATIVO' && <Text style={[styles.tag, styles.tagNovo]}>Aguardando reconhecimento</Text>}
        {alerta.escalonamentos > 0 && <Text style={styles.tag}>Piorou {alerta.escalonamentos}x</Text>}
        <Text style={styles.tag}>Prioridade {alerta.prioridade}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: cores.superficie, borderRadius: 12, padding: 14, gap: 10, borderLeftWidth: 5, ...sombra },
  desatualizado: { opacity: 0.6 },
  topo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icone: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  titulo: { fontSize: 16, fontWeight: '700', color: cores.texto },
  area: { fontSize: 13, color: cores.textoSuave },
  mensagem: { fontSize: 14, color: cores.texto },
  rodape: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  origens: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, flex: 1 },
  tempo: { fontSize: 12, color: cores.textoSuave },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { fontSize: 11, color: cores.textoSuave, backgroundColor: '#F1F3F6', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, overflow: 'hidden' },
  tagAviso: { color: '#7A5A00', backgroundColor: '#FFF4CC' },
  tagOk: { color: cores.ok, backgroundColor: cores.okFundo },
  tagNovo: { color: '#9A1C12', backgroundColor: '#FDECEA' },
});
