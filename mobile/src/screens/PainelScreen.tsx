import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AlertaCard } from '../components/AlertaCard';
import { NivelBadge } from '../components/NivelBadge';
import { numero, tempoRelativo } from '../format';
import { useAgora, useMonitoramento } from '../state/MonitoramentoContext';
import { cores, corNivel, sombra } from '../theme';
import type { Area, Sensor } from '../types';

export function PainelScreen({ abrirAlertas }: { abrirAlertas: () => void }) {
  const { painel, online, ultimaAtualizacao, intervaloMedioMs, conexao, origemDados } = useMonitoramento();
  const agora = useAgora(1000);

  if (!painel) {
    return (
      <View style={styles.vazio}>
        <Ionicons name="radio-outline" size={48} color={cores.textoSuave} />
        <Text style={styles.vazioTitulo}>Aguardando os primeiros dados</Text>
        <Text style={styles.vazioTexto}>Assim que o servidor responder, o painel aparece aqui. Confira o endereço na aba Ajustes.</Text>
      </View>
    );
  }

  const { resumo } = painel;
  const principal = painel.alertas[0];
  const parado = !online;

  return (
    <ScrollView contentContainerStyle={styles.conteudo}>
      {/* Indicadores pedidos no desafio: tempo de atualização e latência */}
      <View style={[styles.indicadores, parado && styles.indicadoresParado]}>
        <Indicador
          icone="time-outline"
          rotulo="Última atualização"
          valor={tempoRelativo(ultimaAtualizacao, agora)}
          alerta={parado}
        />
        <Indicador
          icone="sync-outline"
          rotulo="Intervalo médio"
          valor={intervaloMedioMs && online ? `${numero(intervaloMedioMs / 1000, 1)} s` : '—'}
        />
        <Indicador icone="speedometer-outline" rotulo="Latência" valor={conexao.latenciaMs != null && online ? `${conexao.latenciaMs} ms` : '—'} />
      </View>
      {origemDados === 'cache' && parado && (
        <Text style={styles.cacheAviso}>Dados salvos no aparelho da última vez que o app esteve conectado.</Text>
      )}

      <View style={styles.resumo}>
        <Numero valor={resumo.alertasAbertos} rotulo="Alertas abertos" cor={resumo.alertasAbertos ? '#E8590C' : cores.ok} />
        <Numero valor={resumo.criticos} rotulo="Críticos" cor={resumo.criticos ? '#B42318' : cores.textoSuave} />
        <Numero valor={`${resumo.sensoresOnline}/${resumo.sensoresTotal}`} rotulo="Sensores ok" cor={resumo.sensoresOnline < resumo.sensoresTotal ? '#C98A00' : cores.ok} />
        <Numero valor={resumo.relatosUltimaHora} rotulo="Relatos (1h)" cor={cores.marca} />
      </View>

      {principal ? (
        <View style={{ gap: 8 }}>
          <View style={styles.secaoTopo}>
            <Text style={styles.secao}>Prioridade agora</Text>
            <Pressable onPress={abrirAlertas} hitSlop={8}>
              <Text style={styles.link}>Ver todos ({painel.alertas.length})</Text>
            </Pressable>
          </View>
          <AlertaCard alerta={principal} agora={agora} onPress={abrirAlertas} desatualizado={parado} />
        </View>
      ) : (
        <View style={[styles.tudoOk, sombra]}>
          <Ionicons name="shield-checkmark" size={28} color={cores.ok} />
          <View style={{ flex: 1 }}>
            <Text style={styles.tudoOkTitulo}>Nenhum alerta aberto</Text>
            <Text style={styles.tudoOkTexto}>Todas as áreas monitoradas estão em condições normais.</Text>
          </View>
        </View>
      )}

      <Text style={styles.secao}>Áreas monitoradas</Text>
      {painel.areas.map((area) => (
        <CartaoArea key={area.id} area={area} sensores={painel.sensores.filter((s) => s.areaId === area.id)} parado={parado} />
      ))}
      <Text style={styles.rodape}>Dados de sensores e bases públicas simulados para a demonstração.</Text>
    </ScrollView>
  );
}

function Indicador({ icone, rotulo, valor, alerta }: { icone: any; rotulo: string; valor: string; alerta?: boolean }) {
  return (
    <View style={styles.indicador}>
      <Ionicons name={icone} size={16} color={alerta ? '#B42318' : cores.marca} />
      <Text style={[styles.indicadorValor, alerta && { color: '#B42318' }]}>{valor}</Text>
      <Text style={styles.indicadorRotulo}>{rotulo}</Text>
    </View>
  );
}

function Numero({ valor, rotulo, cor }: { valor: number | string; rotulo: string; cor: string }) {
  return (
    <View style={[styles.numero, sombra]}>
      <Text style={[styles.numeroValor, { color: cor }]}>{valor}</Text>
      <Text style={styles.numeroRotulo}>{rotulo}</Text>
    </View>
  );
}

function CartaoArea({ area, sensores, parado }: { area: Area; sensores: Sensor[]; parado: boolean }) {
  const cor = corNivel[area.risco];
  const v = (tipo: Sensor['tipo']) => sensores.find((s) => s.tipo === tipo);
  const chuva = v('PLUVIOMETRO');
  const nivel = v('NIVEL_CORREGO');
  const temp = v('TEMPERATURA');
  const energia = v('ENERGIA');
  return (
    <View style={[styles.area, sombra, parado && { opacity: 0.75 }]}>
      <View style={[styles.areaFaixa, { backgroundColor: cor.fundo }]} />
      <View style={{ flex: 1, gap: 8 }}>
        <View style={styles.areaTopo}>
          <View style={{ flex: 1 }}>
            <Text style={styles.areaNome}>{area.nome}</Text>
            <Text style={styles.areaRef} numberOfLines={1}>{area.referencia}</Text>
          </View>
          <NivelBadge nivel={area.risco} pequeno />
        </View>
        <View style={styles.leituras}>
          <Leitura icone="rainy-outline" valor={chuva ? `${numero(chuva.valor)} mm/h` : '—'} falha={chuva?.desatualizado} />
          <Leitura icone="water-outline" valor={nivel ? `${numero(nivel.valor)}%` : '—'} falha={nivel?.desatualizado} />
          <Leitura icone="thermometer-outline" valor={temp ? `${numero(temp.valor, 1)}°` : '—'} falha={temp?.desatualizado} />
          <Leitura icone="flash-outline" valor={energia ? `${numero(energia.valor)}%` : '—'} falha={energia?.desatualizado} />
        </View>
        {area.alertasAbertos > 0 && (
          <Text style={styles.areaAlertas}>
            {area.alertasAbertos} {area.alertasAbertos === 1 ? 'alerta aberto' : 'alertas abertos'}
          </Text>
        )}
      </View>
    </View>
  );
}

function Leitura({ icone, valor, falha }: { icone: any; valor: string; falha?: boolean }) {
  return (
    <View style={styles.leitura}>
      <Ionicons name={falha ? 'alert-circle-outline' : icone} size={14} color={falha ? '#C98A00' : cores.textoSuave} />
      <Text style={[styles.leituraValor, falha && { color: '#C98A00' }]}>{falha ? 'sem sinal' : valor}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  conteudo: { padding: 16, gap: 14, paddingBottom: 32 },
  vazio: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
  vazioTitulo: { fontSize: 18, fontWeight: '700', color: cores.texto },
  vazioTexto: { fontSize: 14, color: cores.textoSuave, textAlign: 'center' },
  indicadores: { flexDirection: 'row', backgroundColor: cores.superficie, borderRadius: 12, paddingVertical: 10, borderWidth: 1, borderColor: cores.borda },
  indicadoresParado: { borderColor: '#F5C2BD', backgroundColor: '#FFF8F7' },
  indicador: { flex: 1, alignItems: 'center', gap: 2 },
  indicadorValor: { fontSize: 15, fontWeight: '800', color: cores.texto },
  indicadorRotulo: { fontSize: 11, color: cores.textoSuave },
  cacheAviso: { fontSize: 12, color: cores.textoSuave, fontStyle: 'italic', marginTop: -6 },
  resumo: { flexDirection: 'row', gap: 8 },
  numero: { flex: 1, backgroundColor: cores.superficie, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  numeroValor: { fontSize: 22, fontWeight: '800' },
  numeroRotulo: { fontSize: 11, color: cores.textoSuave, marginTop: 2, textAlign: 'center' },
  secaoTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  secao: { fontSize: 13, fontWeight: '800', color: cores.textoSuave, letterSpacing: 0.8, textTransform: 'uppercase' },
  link: { color: cores.marca, fontWeight: '700', fontSize: 13 },
  tudoOk: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: cores.okFundo, borderRadius: 12, padding: 16 },
  tudoOkTitulo: { fontSize: 16, fontWeight: '700', color: cores.ok },
  tudoOkTexto: { fontSize: 13, color: cores.texto },
  area: { flexDirection: 'row', backgroundColor: cores.superficie, borderRadius: 12, overflow: 'hidden', paddingRight: 14, paddingVertical: 12, gap: 12 },
  areaFaixa: { width: 5, marginVertical: -12 },
  areaTopo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  areaNome: { fontSize: 16, fontWeight: '700', color: cores.texto },
  areaRef: { fontSize: 12, color: cores.textoSuave },
  leituras: { flexDirection: 'row', justifyContent: 'space-between' },
  leitura: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  leituraValor: { fontSize: 13, color: cores.texto, fontWeight: '600' },
  areaAlertas: { fontSize: 12, color: '#B42318', fontWeight: '700' },
  rodape: { fontSize: 11, color: cores.textoSuave, textAlign: 'center', marginTop: 4 },
});
