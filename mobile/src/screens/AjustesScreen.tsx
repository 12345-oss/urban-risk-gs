import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { api } from '../api';
import { normalizarUrl, urlAutomatica } from '../config';
import { numero } from '../format';
import { useMonitoramento } from '../state/MonitoramentoContext';
import { cores } from '../theme';
import type { Cenario } from '../types';

const CENARIOS: { id: Cenario; rotulo: string }[] = [
  { id: 'TEMPESTADE', rotulo: '🌧️ Tempestade' },
  { id: 'ONDA_DE_CALOR', rotulo: '🌡️ Onda de calor' },
  { id: 'APAGAO', rotulo: '⚡ Apagão' },
  { id: 'FALHA_SENSOR', rotulo: '📡 Falha de sensor' },
];

export function AjustesScreen() {
  const { urlApi, urlEhAutomatica, definirUrl, conexao, online, painel, intervaloMedioMs } = useMonitoramento();
  const [texto, setTexto] = useState(urlApi);
  const [teste, setTeste] = useState<{ ok: boolean; texto: string } | null>(null);
  const [testando, setTestando] = useState(false);
  const [areaDemo, setAreaDemo] = useState('ipiranga');
  const [demo, setDemo] = useState<string | null>(null);
  const [enviandoDemo, setEnviandoDemo] = useState(false);

  useEffect(() => setTexto(urlApi), [urlApi]);

  const testar = async () => {
    setTestando(true);
    setTeste(null);
    const url = normalizarUrl(texto);
    const inicio = Date.now();
    try {
      const s = await api.status(url);
      setTeste({ ok: true, texto: `Servidor respondeu em ${Date.now() - inicio} ms (versão ${s.versao}, ${s.clientesConectados} app(s) conectados).` });
    } catch (e: any) {
      setTeste({ ok: false, texto: `${e?.message ?? 'Falhou'} Confira se o backend está rodando e se o celular está na mesma rede Wi-Fi.` });
    } finally {
      setTestando(false);
    }
  };

  const cenario = async (c: Cenario | 'NORMALIZAR') => {
    setEnviandoDemo(true);
    setDemo(null);
    try {
      if (c === 'NORMALIZAR') {
        await api.normalizar(urlApi);
        setDemo('Todas as áreas voltaram ao normal. Os alertas se resolvem sozinhos em alguns segundos.');
      } else {
        await api.ativarCenario(urlApi, areaDemo, c, 90);
        setDemo(`Cenário ativado por 90 s. Acompanhe no Painel.`);
      }
    } catch (e: any) {
      setDemo(e?.message ?? 'Falhou');
    } finally {
      setEnviandoDemo(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
      <Text style={styles.secao}>Servidor</Text>
      <View style={styles.bloco}>
        <Text style={styles.rotulo}>Endereço da API</Text>
        <TextInput value={texto} onChangeText={setTexto} autoCapitalize="none" autoCorrect={false} keyboardType="url" style={styles.campo} placeholder="http://192.168.0.10:8080" />
        <Text style={styles.ajuda}>{urlEhAutomatica ? 'Detectado automaticamente.' : `Definido manualmente. Automático seria: ${urlAutomatica()}`}</Text>
        <View style={styles.linhaBotoes}>
          <Botao rotulo="Testar" onPress={testar} carregando={testando} secundario />
          <Botao rotulo="Salvar e conectar" onPress={() => { definirUrl(normalizarUrl(texto)); setTeste(null); }} />
        </View>
        {!urlEhAutomatica && <Botao rotulo="Voltar ao automático" onPress={() => definirUrl(null)} secundario />}
        {teste && <Text style={[styles.resultado, { color: teste.ok ? cores.ok : '#B42318' }]}>{teste.texto}</Text>}
      </View>

      <Text style={styles.secao}>Conexão em tempo real</Text>
      <View style={styles.bloco}>
        <Info rotulo="Estado" valor={online ? 'Conectado' : conexao.estado === 'conectando' ? 'Conectando' : 'Reconectando'} />
        <Info rotulo="Latência (ping)" valor={conexao.latenciaMs != null && online ? `${conexao.latenciaMs} ms` : '—'} />
        <Info rotulo="Intervalo entre atualizações" valor={intervaloMedioMs && online ? `${numero(intervaloMedioMs / 1000, 1)} s` : '—'} />
        <Info rotulo="Intervalo do servidor" valor={painel ? `${numero(painel.intervaloAtualizacaoMs / 1000, 1)} s` : '—'} />
        <Info rotulo="Quedas nesta sessão" valor={String(conexao.quedas)} />
        {conexao.ultimoErro && <Info rotulo="Último erro" valor={conexao.ultimoErro} />}
      </View>

      <Text style={styles.secao}>Simulação (demonstração)</Text>
      <View style={styles.bloco}>
        <Text style={styles.ajuda}>Provoca um evento em uma área para ver os alertas surgirem e evoluírem em tempo real.</Text>
        <View style={styles.chips}>
          {(painel?.areas ?? []).map((a) => (
            <Pressable key={a.id} onPress={() => setAreaDemo(a.id)} style={[styles.chip, areaDemo === a.id && styles.chipAtivo]}>
              <Text style={[styles.chipTexto, areaDemo === a.id && styles.chipTextoAtivo]}>{a.nome}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.chips}>
          {CENARIOS.map((c) => (
            <Botao key={c.id} rotulo={c.rotulo} onPress={() => cenario(c.id)} desativado={!online || enviandoDemo} secundario />
          ))}
        </View>
        <Botao rotulo="Normalizar todas as áreas" onPress={() => cenario('NORMALIZAR')} desativado={!online || enviandoDemo} />
        {!online && <Text style={styles.ajuda}>Disponível com o servidor conectado.</Text>}
        {demo && <Text style={styles.resultado}>{demo}</Text>}
        {painel && painel.cenarios.length > 0 && (
          <Text style={styles.ajuda}>Ativos: {painel.cenarios.map((c) => `${c.descricao} (${painel.areas.find((a) => a.id === c.areaId)?.nome})`).join(', ')}</Text>
        )}
      </View>

      <Text style={styles.secao}>Sobre</Text>
      <View style={styles.bloco}>
        <Text style={styles.sobre}>Risco Urbano SP · Urban Risk Intelligence Platform</Text>
        <Text style={styles.ajuda}>Global Solution · Advanced Programming and Mobile Dev · FIAP Engenharia da Computação</Text>
        <Text style={styles.ajuda}>Henrique Monteiro Khouri (RM 555572) · Rodrigo Arantes da Silva Philippi (RM 557594)</Text>
      </View>
    </ScrollView>
  );
}

function Info({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <View style={styles.info}>
      <Text style={styles.infoRotulo}>{rotulo}</Text>
      <Text style={styles.infoValor}>{valor}</Text>
    </View>
  );
}

function Botao({ rotulo, onPress, carregando, secundario, desativado }: { rotulo: string; onPress: () => void; carregando?: boolean; secundario?: boolean; desativado?: boolean }) {
  const off = desativado || carregando;
  return (
    <Pressable onPress={onPress} disabled={off} style={({ pressed }) => [styles.botao, secundario && styles.botaoSec, off && { opacity: 0.5 }, pressed && { opacity: 0.8 }]} accessibilityRole="button">
      {carregando ? <ActivityIndicator color={secundario ? cores.marca : '#fff'} /> : <Text style={[styles.botaoTexto, secundario && styles.botaoTextoSec]}>{rotulo}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  conteudo: { padding: 16, gap: 8, paddingBottom: 40 },
  secao: { fontSize: 13, fontWeight: '800', color: cores.textoSuave, letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 10 },
  bloco: { backgroundColor: cores.superficie, borderRadius: 12, padding: 14, gap: 10, borderWidth: 1, borderColor: cores.borda },
  rotulo: { fontSize: 14, fontWeight: '700', color: cores.texto },
  campo: { borderWidth: 1, borderColor: cores.borda, borderRadius: 8, padding: 10, fontSize: 15, color: cores.texto, backgroundColor: '#FAFBFC' },
  ajuda: { fontSize: 12, color: cores.textoSuave },
  linhaBotoes: { flexDirection: 'row', gap: 8 },
  resultado: { fontSize: 13, color: cores.texto },
  info: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  infoRotulo: { fontSize: 13, color: cores.textoSuave },
  infoValor: { fontSize: 13, color: cores.texto, fontWeight: '700', flexShrink: 1, textAlign: 'right' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, backgroundColor: '#F1F3F6' },
  chipAtivo: { backgroundColor: cores.marca },
  chipTexto: { fontSize: 13, color: cores.texto, fontWeight: '600' },
  chipTextoAtivo: { color: '#fff' },
  botao: { flexGrow: 1, backgroundColor: cores.marca, borderRadius: 8, paddingVertical: 11, paddingHorizontal: 12, alignItems: 'center' },
  botaoSec: { backgroundColor: cores.marcaClara },
  botaoTexto: { color: '#fff', fontWeight: '700', fontSize: 14 },
  botaoTextoSec: { color: cores.marca },
  sobre: { fontSize: 14, fontWeight: '700', color: cores.texto },
});
