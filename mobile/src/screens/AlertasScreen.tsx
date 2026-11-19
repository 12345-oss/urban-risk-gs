import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '../api';
import { AlertaCard } from '../components/AlertaCard';
import { ConfiancaBarra } from '../components/ConfiancaBarra';
import { NivelBadge } from '../components/NivelBadge';
import { OrigemChip } from '../components/OrigemChip';
import { hora, tempoRelativo, tempoRelativoIso } from '../format';
import { useAgora, useMonitoramento } from '../state/MonitoramentoContext';
import { cores, corNivel } from '../theme';
import type { Alerta } from '../types';

type Filtro = 'todos' | 'graves' | 'pendentes' | 'resolvidos';

const FILTROS: { id: Filtro; rotulo: string }[] = [
  { id: 'todos', rotulo: 'Abertos' },
  { id: 'graves', rotulo: 'Alto/Crítico' },
  { id: 'pendentes', rotulo: 'Não reconhecidos' },
  { id: 'resolvidos', rotulo: 'Resolvidos' },
];

export function AlertasScreen() {
  const { painel, online, urlApi, feed } = useMonitoramento();
  const agora = useAgora(1000);
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const [resolvidos, setResolvidos] = useState<Alerta[] | null>(null);
  const [carregandoResolvidos, setCarregandoResolvidos] = useState(false);
  const [erroResolvidos, setErroResolvidos] = useState<string | null>(null);

  const carregarResolvidos = useCallback(async () => {
    setCarregandoResolvidos(true);
    setErroResolvidos(null);
    try {
      setResolvidos(await api.alertasResolvidos(urlApi));
    } catch (e: any) {
      setErroResolvidos(e?.message ?? 'Erro ao carregar');
    } finally {
      setCarregandoResolvidos(false);
    }
  }, [urlApi]);

  useEffect(() => {
    if (filtro === 'resolvidos') carregarResolvidos();
  }, [filtro, carregarResolvidos]);

  const abertos = painel?.alertas ?? [];
  const lista = useMemo(() => {
    switch (filtro) {
      case 'graves':
        return abertos.filter((a) => a.nivel === 'ALTO' || a.nivel === 'CRITICO');
      case 'pendentes':
        return abertos.filter((a) => a.status === 'ATIVO');
      case 'resolvidos':
        return resolvidos ?? [];
      default:
        return abertos;
    }
  }, [filtro, abertos, resolvidos]);

  const selecionado = selecionadoId
    ? abertos.find((a) => a.id === selecionadoId) ?? resolvidos?.find((a) => a.id === selecionadoId) ?? null
    : null;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtros} style={{ flexGrow: 0 }}>
        {FILTROS.map((f) => (
          <Pressable key={f.id} onPress={() => setFiltro(f.id)} style={[styles.filtro, filtro === f.id && styles.filtroAtivo]} accessibilityRole="button" accessibilityState={{ selected: filtro === f.id }}>
            <Text style={[styles.filtroTexto, filtro === f.id && styles.filtroTextoAtivo]}>{f.rotulo}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <FlatList
        data={lista}
        keyExtractor={(a) => a.id}
        contentContainerStyle={styles.lista}
        renderItem={({ item }) => <AlertaCard alerta={item} agora={agora} onPress={() => setSelecionadoId(item.id)} desatualizado={!online && filtro !== 'resolvidos'} />}
        ListHeaderComponent={
          filtro === 'todos' && feed.length > 0 ? (
            <View style={styles.feed}>
              <Text style={styles.feedTitulo}>Últimos eventos</Text>
              {feed.slice(0, 4).map((f) => (
                <Text key={f.id} style={styles.feedItem} numberOfLines={1}>
                  <Text style={{ fontWeight: '700', color: f.evento === 'RESOLVIDO' ? cores.ok : corNivel[f.alerta.nivel].fundo }}>{rotuloEvento[f.evento]}</Text>
                  {`  ${f.alerta.tipoDescricao} · ${f.alerta.areaNome} · ${tempoRelativo(f.recebidoEm, agora)}`}
                </Text>
              ))}
            </View>
          ) : undefined
        }
        ListEmptyComponent={
          filtro === 'resolvidos' && carregandoResolvidos ? (
            <ActivityIndicator style={{ marginTop: 40 }} color={cores.marca} />
          ) : filtro === 'resolvidos' && erroResolvidos ? (
            <Vazio icone="cloud-offline-outline" titulo="Não foi possível carregar" texto={`${erroResolvidos} O histórico de resolvidos precisa da conexão com o servidor.`} />
          ) : (
            <Vazio icone="shield-checkmark-outline" titulo="Nada por aqui" texto={filtro === 'resolvidos' ? 'Nenhum alerta resolvido ainda.' : 'Nenhum alerta neste filtro.'} />
          )
        }
        refreshing={filtro === 'resolvidos' && carregandoResolvidos}
        onRefresh={filtro === 'resolvidos' ? carregarResolvidos : undefined}
      />

      <DetalheAlerta alerta={selecionado} onFechar={() => setSelecionadoId(null)} agora={agora} />
    </View>
  );
}

const rotuloEvento: Record<string, string> = {
  NOVO: 'NOVO',
  ESCALONADO: 'PIOROU',
  ATUALIZADO: 'ATUALIZADO',
  RECONHECIDO: 'RECONHECIDO',
  RESOLVIDO: 'RESOLVIDO',
};

function Vazio({ icone, titulo, texto }: { icone: any; titulo: string; texto: string }) {
  return (
    <View style={styles.vazio}>
      <Ionicons name={icone} size={40} color={cores.textoSuave} />
      <Text style={styles.vazioTitulo}>{titulo}</Text>
      <Text style={styles.vazioTexto}>{texto}</Text>
    </View>
  );
}

function DetalheAlerta({ alerta, onFechar, agora }: { alerta: Alerta | null; onFechar: () => void; agora: number }) {
  const { online, reconhecer } = useMonitoramento();
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    setErro(null);
  }, [alerta?.id]);

  if (!alerta) return null;
  const cor = corNivel[alerta.nivel];
  const podeReconhecer = alerta.status === 'ATIVO';

  const confirmar = async () => {
    setEnviando(true);
    setErro(null);
    try {
      await reconhecer(alerta.id);
    } catch (e: any) {
      setErro(e?.message ?? 'Não foi possível reconhecer');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onFechar}>
      <View style={styles.modalFundo}>
        <View style={styles.modal}>
          <View style={[styles.modalTopo, { backgroundColor: cor.suave }]}>
            <View style={{ flex: 1, gap: 4 }}>
              <NivelBadge nivel={alerta.nivel} />
              <Text style={styles.modalTitulo}>{alerta.tipoDescricao} · {alerta.areaNome}</Text>
              <Text style={styles.modalId}>{alerta.id} · {alerta.status === 'RESOLVIDO' ? 'Resolvido' : alerta.status === 'RECONHECIDO' ? 'Reconhecido' : 'Aguardando reconhecimento'}</Text>
            </View>
            <Pressable onPress={onFechar} hitSlop={12} accessibilityLabel="Fechar">
              <Ionicons name="close" size={26} color={cores.texto} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.modalCorpo}>
            <Text style={styles.mensagem}>{alerta.mensagem}</Text>

            <View style={[styles.recomendacao, { borderLeftColor: cor.fundo }]}>
              <Text style={styles.recomendacaoTitulo}>O que fazer</Text>
              <Text style={styles.recomendacaoTexto}>{alerta.recomendacao}</Text>
            </View>

            <Text style={styles.subtitulo}>Origem e confiança dos dados</Text>
            <ConfiancaBarra valor={alerta.confianca} />
            <Text style={styles.ajuda}>
              {alerta.confirmado
                ? 'Confirmado por fonte confiável (sensor oficial ou base pública).'
                : 'Ainda não confirmado por sensor: baseado em poucos relatos ou em dado desatualizado.'}
            </Text>
            <View style={styles.chips}>
              {alerta.origens.map((o) => (
                <OrigemChip key={o} origem={o} />
              ))}
            </View>
            {alerta.fontes.map((f) => (
              <View key={f} style={styles.fonte}>
                <Ionicons name="checkmark-circle-outline" size={16} color={cores.marca} />
                <Text style={styles.fonteTexto}>{f}</Text>
              </View>
            ))}

            <Text style={styles.subtitulo}>Linha do tempo</Text>
            <Linha rotulo="Aberto" valor={`${hora(alerta.criadoEm)} (${tempoRelativoIso(alerta.criadoEm, agora)})`} />
            <Linha rotulo="Atualizado" valor={hora(alerta.atualizadoEm)} />
            {alerta.escalonamentos > 0 && <Linha rotulo="Pioras" valor={`${alerta.escalonamentos}`} />}
            {alerta.reconhecidoEm && <Linha rotulo="Reconhecido" valor={hora(alerta.reconhecidoEm)} />}
            {alerta.resolvidoEm && <Linha rotulo="Resolvido" valor={hora(alerta.resolvidoEm)} />}
            <Linha rotulo="Prioridade" valor={`${alerta.prioridade} de 100`} />
          </ScrollView>

          {podeReconhecer && (
            <View style={styles.acoes}>
              {erro && <Text style={styles.erro}>{erro}</Text>}
              {!online && <Text style={styles.ajuda}>Sem conexão: o reconhecimento fica disponível quando o servidor voltar.</Text>}
              <Pressable
                onPress={confirmar}
                disabled={!online || enviando}
                style={({ pressed }) => [styles.botao, (!online || enviando) && styles.botaoDesativado, pressed && { opacity: 0.85 }]}
                accessibilityRole="button"
              >
                {enviando ? <ActivityIndicator color="#fff" /> : <Text style={styles.botaoTexto}>Reconhecer alerta</Text>}
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <View style={styles.linha}>
      <Text style={styles.linhaRotulo}>{rotulo}</Text>
      <Text style={styles.linhaValor}>{valor}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  filtros: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filtro: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, backgroundColor: cores.superficie, borderWidth: 1, borderColor: cores.borda },
  filtroAtivo: { backgroundColor: cores.marca, borderColor: cores.marca },
  filtroTexto: { fontSize: 13, fontWeight: '600', color: cores.texto },
  filtroTextoAtivo: { color: '#fff' },
  lista: { paddingHorizontal: 16, paddingBottom: 32, gap: 12 },
  feed: { backgroundColor: cores.superficie, borderRadius: 12, padding: 12, gap: 4, borderWidth: 1, borderColor: cores.borda },
  feedTitulo: { fontSize: 12, fontWeight: '800', color: cores.textoSuave, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 },
  feedItem: { fontSize: 12, color: cores.texto },
  vazio: { alignItems: 'center', padding: 32, gap: 8 },
  vazioTitulo: { fontSize: 16, fontWeight: '700', color: cores.texto },
  vazioTexto: { fontSize: 13, color: cores.textoSuave, textAlign: 'center' },
  modalFundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modal: { backgroundColor: cores.superficie, borderTopLeftRadius: 18, borderTopRightRadius: 18, maxHeight: '90%', overflow: 'hidden' },
  modalTopo: { flexDirection: 'row', padding: 18, gap: 12 },
  modalTitulo: { fontSize: 19, fontWeight: '800', color: cores.texto, marginTop: 4 },
  modalId: { fontSize: 12, color: cores.textoSuave },
  modalCorpo: { padding: 18, gap: 10 },
  mensagem: { fontSize: 15, color: cores.texto, lineHeight: 21 },
  recomendacao: { backgroundColor: '#F8FAFC', borderLeftWidth: 4, borderRadius: 8, padding: 12, gap: 4 },
  recomendacaoTitulo: { fontSize: 12, fontWeight: '800', color: cores.textoSuave, textTransform: 'uppercase' },
  recomendacaoTexto: { fontSize: 15, color: cores.texto, lineHeight: 21 },
  subtitulo: { fontSize: 13, fontWeight: '800', color: cores.textoSuave, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 8 },
  ajuda: { fontSize: 12, color: cores.textoSuave },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  fonte: { flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
  fonteTexto: { fontSize: 13, color: cores.texto, flex: 1 },
  linha: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#F1F3F6' },
  linhaRotulo: { fontSize: 13, color: cores.textoSuave },
  linhaValor: { fontSize: 13, color: cores.texto, fontWeight: '600' },
  acoes: { padding: 16, gap: 8, borderTopWidth: 1, borderTopColor: cores.borda },
  botao: { backgroundColor: cores.marca, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  botaoDesativado: { backgroundColor: '#9AA6B2' },
  botaoTexto: { color: '#fff', fontWeight: '800', fontSize: 15 },
  erro: { color: '#B42318', fontSize: 13 },
});
