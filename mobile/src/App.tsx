import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Aba, BarraAbas } from './components/BarraAbas';
import { BannerConexao } from './components/BannerConexao';
import { Cabecalho } from './components/Cabecalho';
import { Notificacao } from './components/Notificacao';
import { AjustesScreen } from './screens/AjustesScreen';
import { AlertasScreen } from './screens/AlertasScreen';
import { PainelScreen } from './screens/PainelScreen';
import { RelatarScreen } from './screens/RelatarScreen';
import { SensoresScreen } from './screens/SensoresScreen';
import { MonitoramentoProvider, useMonitoramento } from './state/MonitoramentoContext';
import { cores } from './theme';

const TITULOS: Record<Aba, string> = {
  painel: 'Painel',
  alertas: 'Alertas',
  sensores: 'Sensores',
  relatar: 'Relatar problema',
  ajustes: 'Ajustes',
};

function Conteudo() {
  const [aba, setAba] = useState<Aba>('painel');
  const { painel } = useMonitoramento();

  return (
    <View style={styles.raiz}>
      <StatusBar style="light" />
      <Cabecalho titulo={TITULOS[aba]} />
      <BannerConexao />
      <View style={styles.tela}>
        {aba === 'painel' && <PainelScreen abrirAlertas={() => setAba('alertas')} />}
        {aba === 'alertas' && <AlertasScreen />}
        {aba === 'sensores' && <SensoresScreen />}
        {aba === 'relatar' && <RelatarScreen />}
        {aba === 'ajustes' && <AjustesScreen />}
      </View>
      <BarraAbas atual={aba} onTrocar={setAba} badgeAlertas={painel?.resumo.naoReconhecidos ?? 0} />
      <Notificacao onAbrir={() => setAba('alertas')} />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <MonitoramentoProvider>
        <Conteudo />
      </MonitoramentoProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: cores.fundo },
  tela: { flex: 1 },
});
