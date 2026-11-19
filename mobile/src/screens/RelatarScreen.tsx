import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { tempoRelativo, tempoRelativoIso } from '../format';
import { useAgora, useMonitoramento } from '../state/MonitoramentoContext';
import { cores, sombra } from '../theme';
import type { TipoRelato } from '../types';

const TIPOS: { id: TipoRelato; rotulo: string; icone: any; cor: string }[] = [
  { id: 'ALAGAMENTO', rotulo: 'Alagamento', icone: 'water', cor: '#2F6FDE' },
  { id: 'CALOR_EXTREMO', rotulo: 'Calor extremo', icone: 'thermometer', cor: '#E8590C' },
  { id: 'SEM_ENERGIA', rotulo: 'Sem energia', icone: 'flash-off', cor: '#6B21A8' },
];

const nomeTipo: Record<TipoRelato, string> = { ALAGAMENTO: 'Alagamento', CALOR_EXTREMO: 'Calor extremo', SEM_ENERGIA: 'Sem energia' };

export function RelatarScreen() {
  const { painel, enviarRelato, pendentes, online } = useMonitoramento();
  const agora = useAgora(5000);
  const [areaId, setAreaId] = useState<string | null>(null);
  const [tipo, setTipo] = useState<TipoRelato | null>(null);
  const [descricao, setDescricao] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<{ ok: boolean; texto: string } | null>(null);

  const areas = painel?.areas ?? [];
  const podeEnviar = !!areaId && !!tipo && !enviando;

  const enviar = async () => {
    if (!areaId || !tipo) return;
    setEnviando(true);
    setResultado(null);
    try {
      const r = await enviarRelato({ areaId, tipo, descricao: descricao.trim() });
      setResultado(
        r === 'enviado'
          ? { ok: true, texto: 'Relato enviado. Obrigado! Ele já entra na avaliação de risco da área.' }
          : { ok: true, texto: 'Sem conexão agora. O relato ficou salvo no aparelho e será enviado assim que a conexão voltar.' },
      );
      setTipo(null);
      setDescricao('');
    } catch (e: any) {
      setResultado({ ok: false, texto: e?.message ?? 'Não foi possível enviar.' });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
        <Text style={styles.intro}>Viu algum problema no seu bairro? Seu relato ajuda a confirmar alertas dos sensores.</Text>

        <Text style={styles.rotulo}>1. Onde?</Text>
        {areas.length === 0 ? (
          <Text style={styles.ajuda}>As áreas aparecem quando o app recebe os dados do servidor.</Text>
        ) : (
          <View style={styles.chips}>
            {areas.map((a) => (
              <Pressable key={a.id} onPress={() => setAreaId(a.id)} style={[styles.chip, areaId === a.id && styles.chipAtivo]} accessibilityRole="radio" accessibilityState={{ checked: areaId === a.id }}>
                <Text style={[styles.chipTexto, areaId === a.id && styles.chipTextoAtivo]}>{a.nome}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <Text style={styles.rotulo}>2. O que está acontecendo?</Text>
        <View style={styles.tipos}>
          {TIPOS.map((t) => {
            const ativo = tipo === t.id;
            return (
              <Pressable key={t.id} onPress={() => setTipo(t.id)} style={[styles.tipo, sombra, ativo && { borderColor: t.cor, backgroundColor: `${t.cor}14` }]} accessibilityRole="radio" accessibilityState={{ checked: ativo }}>
                <Ionicons name={t.icone} size={28} color={t.cor} />
                <Text style={styles.tipoTexto}>{t.rotulo}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.rotulo}>3. Detalhes (opcional)</Text>
        <TextInput
          value={descricao}
          onChangeText={(t) => setDescricao(t.slice(0, 280))}
          placeholder="Ex.: água na altura da calçada na esquina com a Rua Bom Pastor"
          placeholderTextColor="#9AA3AF"
          multiline
          style={styles.campo}
          maxLength={280}
        />
        <Text style={styles.contador}>{descricao.length}/280</Text>

        <View style={styles.privacidade}>
          <Ionicons name="lock-closed-outline" size={16} color={cores.marca} />
          <Text style={styles.privacidadeTexto}>Não pedimos nome, telefone nem localização exata. Se você digitar telefone, e-mail ou CPF, o servidor remove antes de salvar.</Text>
        </View>

        {resultado && (
          <View style={[styles.resultado, { backgroundColor: resultado.ok ? cores.okFundo : '#FDECEA' }]}>
            <Text style={{ color: resultado.ok ? cores.ok : '#B42318', fontSize: 14 }}>{resultado.texto}</Text>
          </View>
        )}

        <Pressable onPress={enviar} disabled={!podeEnviar} style={({ pressed }) => [styles.botao, !podeEnviar && styles.botaoDesativado, pressed && { opacity: 0.85 }]} accessibilityRole="button">
          {enviando ? <ActivityIndicator color="#fff" /> : <Text style={styles.botaoTexto}>{online ? 'Enviar relato' : 'Salvar e enviar depois'}</Text>}
        </Pressable>

        {pendentes.length > 0 && (
          <View style={styles.bloco}>
            <Text style={styles.blocoTitulo}>Aguardando conexão ({pendentes.length})</Text>
            {pendentes.map((p) => (
              <Text key={p.idLocal} style={styles.item}>
                ⏳ {nomeTipo[p.tipo]} · {areas.find((a) => a.id === p.areaId)?.nome ?? p.areaId} · {tempoRelativo(p.criadoEm, agora)}
              </Text>
            ))}
          </View>
        )}

        {painel && painel.relatos.length > 0 && (
          <View style={styles.bloco}>
            <Text style={styles.blocoTitulo}>Relatos recentes da comunidade</Text>
            {painel.relatos.slice(0, 8).map((r) => (
              <View key={r.id} style={styles.relato}>
                <Text style={styles.relatoTopo}>
                  {nomeTipo[r.tipo]} · {r.areaNome} <Text style={styles.relatoTempo}>· {tempoRelativoIso(r.criadoEm, agora)}</Text>
                </Text>
                {!!r.descricao && <Text style={styles.relatoTexto}>{r.descricao}</Text>}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  conteudo: { padding: 16, gap: 10, paddingBottom: 40 },
  intro: { fontSize: 14, color: cores.textoSuave },
  rotulo: { fontSize: 15, fontWeight: '800', color: cores.texto, marginTop: 8 },
  ajuda: { fontSize: 13, color: cores.textoSuave },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 18, backgroundColor: cores.superficie, borderWidth: 1, borderColor: cores.borda },
  chipAtivo: { backgroundColor: cores.marca, borderColor: cores.marca },
  chipTexto: { fontSize: 14, color: cores.texto, fontWeight: '600' },
  chipTextoAtivo: { color: '#fff' },
  tipos: { flexDirection: 'row', gap: 10 },
  tipo: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 16, backgroundColor: cores.superficie, borderRadius: 12, borderWidth: 2, borderColor: 'transparent' },
  tipoTexto: { fontSize: 13, fontWeight: '700', color: cores.texto, textAlign: 'center' },
  campo: { backgroundColor: cores.superficie, borderRadius: 10, borderWidth: 1, borderColor: cores.borda, padding: 12, minHeight: 90, fontSize: 15, color: cores.texto, textAlignVertical: 'top' },
  contador: { fontSize: 11, color: cores.textoSuave, textAlign: 'right', marginTop: -6 },
  privacidade: { flexDirection: 'row', gap: 8, backgroundColor: cores.marcaClara, borderRadius: 10, padding: 10 },
  privacidadeTexto: { flex: 1, fontSize: 12, color: cores.marca },
  resultado: { borderRadius: 10, padding: 12 },
  botao: { backgroundColor: cores.marca, borderRadius: 10, paddingVertical: 15, alignItems: 'center', marginTop: 4 },
  botaoDesativado: { backgroundColor: '#9AA6B2' },
  botaoTexto: { color: '#fff', fontWeight: '800', fontSize: 16 },
  bloco: { backgroundColor: cores.superficie, borderRadius: 12, padding: 12, gap: 8, marginTop: 8, borderWidth: 1, borderColor: cores.borda },
  blocoTitulo: { fontSize: 12, fontWeight: '800', color: cores.textoSuave, textTransform: 'uppercase', letterSpacing: 0.8 },
  item: { fontSize: 13, color: cores.texto },
  relato: { gap: 2, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: '#F1F3F6' },
  relatoTopo: { fontSize: 13, fontWeight: '700', color: cores.texto },
  relatoTempo: { fontWeight: '400', color: cores.textoSuave },
  relatoTexto: { fontSize: 13, color: cores.texto },
});
