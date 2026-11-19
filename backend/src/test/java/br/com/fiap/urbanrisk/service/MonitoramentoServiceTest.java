package br.com.fiap.urbanrisk.service;

import br.com.fiap.urbanrisk.alerta.MotorDeRegras;
import br.com.fiap.urbanrisk.api.dto.AlertaDTO;
import br.com.fiap.urbanrisk.api.dto.NovoRelatoRequest;
import br.com.fiap.urbanrisk.api.dto.PainelDTO;
import br.com.fiap.urbanrisk.api.dto.RelatoDTO;
import br.com.fiap.urbanrisk.domain.TipoRelato;
import br.com.fiap.urbanrisk.realtime.MensagemTempoReal;
import br.com.fiap.urbanrisk.simulacao.Cenario;
import br.com.fiap.urbanrisk.simulacao.SimuladorSensores;
import br.com.fiap.urbanrisk.store.MonitoramentoStore;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class MonitoramentoServiceTest {

    /** Relógio controlado pelo teste: cada ciclo avança 2 segundos. */
    static class RelogioManual extends Clock {
        Instant agora = Instant.parse("2026-11-19T12:00:00Z");

        @Override public ZoneId getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(ZoneId zone) { return this; }
        @Override public Instant instant() { return agora; }
    }

    private RelogioManual relogio;
    private List<MensagemTempoReal> publicadas;
    private MonitoramentoService service;

    @BeforeEach
    void setUp() {
        relogio = new RelogioManual();
        publicadas = new ArrayList<>();
        SimuladorSensores simulador = new SimuladorSensores(false, 120, 42);
        service = new MonitoramentoService(new MonitoramentoStore(), new MotorDeRegras(), simulador,
                e -> publicadas.add((MensagemTempoReal) e), relogio, 2000);
    }

    private void ciclos(int n) {
        for (int i = 0; i < n; i++) {
            relogio.agora = relogio.agora.plusSeconds(2);
            service.executarCiclo();
        }
    }

    private List<String> eventosDeAlerta() {
        return publicadas.stream().filter(m -> m.tipo().equals("alerta")).map(MensagemTempoReal::evento).toList();
    }

    @Test
    void painelInicialTemSeisAreasEVinteEQuatroSensores() {
        PainelDTO painel = service.painel(true);
        assertEquals(6, painel.areas().size());
        assertEquals(24, painel.sensores().size());
        assertTrue(painel.alertas().isEmpty());
        assertFalse(painel.sensores().get(0).historico().isEmpty());
    }

    @Test
    void cadaCicloPublicaUmTick() {
        ciclos(3);
        assertEquals(3, publicadas.stream().filter(m -> m.tipo().equals("tick")).count());
    }

    @Test
    void tempestadeAbreEscalonaEResolveAlertaDeAlagamento() {
        service.ativarCenario("ipiranga", Cenario.TEMPESTADE, 120);
        ciclos(30);

        List<AlertaDTO> abertos = service.alertas(false);
        AlertaDTO alagamento = abertos.stream()
                .filter(a -> a.areaId().equals("ipiranga") && a.tipo().equals("ALAGAMENTO"))
                .findFirst().orElseThrow();
        assertEquals("CRITICO", alagamento.nivel());
        assertTrue(alagamento.escalonamentos() >= 2);
        assertTrue(eventosDeAlerta().contains("NOVO"));
        assertTrue(eventosDeAlerta().contains("ESCALONADO"));
        // alerta mais grave fica no topo da lista
        assertEquals(alagamento.id(), abertos.get(0).id());

        service.normalizarCenarios();
        ciclos(150);
        assertTrue(service.alertas(false).isEmpty());
        assertTrue(eventosDeAlerta().contains("RESOLVIDO"));
        assertFalse(service.alertas(true).isEmpty());
    }

    @Test
    void reconhecerEDepoisEscalonarVoltaParaAtivo() {
        service.ativarCenario("mooca", Cenario.APAGAO, 120);
        ciclos(2);
        AlertaDTO alerta = service.alertas(false).get(0);

        AlertaDTO reconhecido = service.reconhecer(alerta.id());
        assertEquals("RECONHECIDO", reconhecido.status());

        ciclos(15); // a queda de energia continua piorando
        AlertaDTO depois = service.alerta(alerta.id());
        assertEquals("CRITICO", depois.nivel());
        assertEquals("ATIVO", depois.status());
    }

    @Test
    void relatoEhAnonimizadoEAbreAlertaNaoConfirmado() {
        RelatoDTO relato = service.registrarRelato(new NovoRelatoRequest("cambuci", TipoRelato.ALAGAMENTO,
                "Rua alagada! Me liga 11 98765-4321 ou joao@email.com"));

        assertFalse(relato.descricao().contains("98765"));
        assertFalse(relato.descricao().contains("joao@email.com"));
        assertEquals("COMUNIDADE", relato.origem());

        AlertaDTO alerta = service.alertas(false).get(0);
        assertEquals("cambuci", alerta.areaId());
        assertEquals("BAIXO", alerta.nivel());
        assertFalse(alerta.confirmado());
        assertTrue(publicadas.stream().anyMatch(m -> m.tipo().equals("relato")));
    }

    @Test
    void areaInexistenteGeraErro() {
        assertThrows(NaoEncontradoException.class, () ->
                service.registrarRelato(new NovoRelatoRequest("xpto", TipoRelato.ALAGAMENTO, "")));
        assertThrows(NaoEncontradoException.class, () -> service.reconhecer("AL-9999"));
    }

    @Test
    void falhaDeSensorApareceComoDesatualizado() {
        service.ativarCenario("vila-mariana", Cenario.FALHA_SENSOR, 120);
        ciclos(7);
        assertTrue(service.sensor("vila-mariana-nivel").desatualizado());
        assertEquals(23, service.painel(false).resumo().sensoresOnline());
    }
}
