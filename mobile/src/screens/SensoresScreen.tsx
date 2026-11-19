import { Ionicons } from '@expo/vector-icons';
import { SectionList, StyleSheet, Text, View } from 'react-native';
import { ConfiancaBarra } from '../components/ConfiancaBarra';
import { OrigemChip } from '../components/OrigemChip';
import { Sparkline } from '../components/Sparkline';
import { numero, tempoRelativoIso } from '../format';
import { useAgora, useMonitoramento } from '../state/MonitoramentoContext';
import { cores, corNivel, iconeSensor, sombra } from '../theme';
import type { Sensor } from '../types';

const faixa: Record<Sensor['tipo'], [number, number]> = {
  PLUVIOMETRO: [0, 70],
  NIVEL_CORREGO: [0, 110],
  TEMPERATURA: [18, 40],
  ENERGIA: [0, 100],
};

function corDoValor(s: Sensor): string {
  const v = s.valor;
  switch (s.tipo) {
    case 'PLUVIOMETRO':
      return v >= 50 ? corNivel.ALTO.fundo : v >= 25 ? corNivel.MEDIO.fundo : v >= 10 ? corNivel.BAIXO.fundo : cores.marca;
    case 'NIVEL_CORREGO':
      return v >= 95 ? corNivel.CRITICO.fundo : v >= 80 ? corNivel.ALTO.fundo : v >= 65 ? corNivel.MEDIO.fundo : cores.marca;
    case 'TEMPERATURA':
      return v >= 37 ? corNivel.ALTO.fundo : v >= 34 ? corNivel.MEDIO.fundo : cores.marca;
    case 'ENERGIA':
      return v <= 50 ? corNivel.CRITICO.fundo : v <= 70 ? corNivel.ALTO.fundo : v <= 85 ? corNivel.MEDIO.fundo : cores.marca;
  }
}

export function SensoresScreen() {
  const { painel, historicos, online } = useMonitoramento();
  const agora = useAgora(1000);

  if (!painel) {
    return (
      <View style={styles.vazio}>
        <Text style={styles.vazioTexto}>Sem dados de sensores ainda.</Text>
      </View>
    );
  }

  const secoes = painel.areas.map((a) => ({ titulo: a.nome, referencia: a.referencia, data: painel.sensores.filter((s) => s.areaId === a.id) }));

  return (
    <SectionList
      sections={secoes}
      keyExtractor={(s) => s.id}
      contentContainerStyle={styles.lista}
      stickySectionHeadersEnabled={false}
      renderSectionHeader={({ section }) => (
        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>{section.titulo}</Text>
          <Text style={styles.secaoRef}>{section.referencia}</Text>
        </View>
      )}
      renderItem={({ item }) => {
        const cor = corDoValor(item);
        const [min, max] = faixa[item.tipo];
        return (
          <View style={[styles.card, sombra, (!online || item.desatualizado) && { opacity: 0.7 }]}>
            <View style={styles.topo}>
              <Ionicons name={iconeSensor[item.tipo] as any} size={18} color={cor} />
              <Text style={styles.nome} numberOfLines={1}>{item.tipoDescricao}</Text>
              <Text style={[styles.valor, { color: cor }]}>
                {numero(item.valor, item.tipo === 'TEMPERATURA' ? 1 : 0)}
                <Text style={styles.unidade}> {item.unidade}</Text>
              </Text>
            </View>
            <Sparkline valores={historicos[item.id] ?? []} cor={cor} min={min} max={max} />
            <View style={styles.rodape}>
              <OrigemChip origem={item.origem} />
              {item.desatualizado ? (
                <Text style={styles.falha}>⚠ sem atualização · última {tempoRelativoIso(item.atualizadoEm, agora)}</Text>
              ) : (
                <Text style={styles.atualizado}>leitura {tempoRelativoIso(item.atualizadoEm, agora)}</Text>
              )}
            </View>
            <ConfiancaBarra valor={item.confianca} />
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  lista: { padding: 16, paddingBottom: 32, gap: 10 },
  vazio: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  vazioTexto: { color: cores.textoSuave },
  secao: { marginTop: 10, marginBottom: 2 },
  secaoTitulo: { fontSize: 17, fontWeight: '800', color: cores.texto },
  secaoRef: { fontSize: 12, color: cores.textoSuave },
  card: { backgroundColor: cores.superficie, borderRadius: 12, padding: 12, gap: 8 },
  topo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nome: { flex: 1, fontSize: 14, fontWeight: '600', color: cores.texto },
  valor: { fontSize: 22, fontWeight: '800' },
  unidade: { fontSize: 13, fontWeight: '600', color: cores.textoSuave },
  rodape: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  atualizado: { fontSize: 11, color: cores.textoSuave },
  falha: { fontSize: 11, color: '#B07800', fontWeight: '700', flexShrink: 1, textAlign: 'right' },
});
