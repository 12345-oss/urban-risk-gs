package br.com.fiap.urbanrisk.service;

import br.com.fiap.urbanrisk.alerta.Avaliacao;
import br.com.fiap.urbanrisk.alerta.MotorDeRegras;
import br.com.fiap.urbanrisk.api.Mapper;
import br.com.fiap.urbanrisk.api.dto.AlertaDTO;
import br.com.fiap.urbanrisk.api.dto.AreaDTO;
import br.com.fiap.urbanrisk.api.dto.CenarioDTO;
import br.com.fiap.urbanrisk.api.dto.NovoRelatoRequest;
import br.com.fiap.urbanrisk.api.dto.PainelDTO;
import br.com.fiap.urbanrisk.api.dto.RelatoDTO;
import br.com.fiap.urbanrisk.api.dto.ResumoDTO;
import br.com.fiap.urbanrisk.api.dto.SensorDTO;
import br.com.fiap.urbanrisk.domain.Alerta;
import br.com.fiap.urbanrisk.domain.Area;
import br.com.fiap.urbanrisk.domain.NivelAlerta;
import br.com.fiap.urbanrisk.domain.Relato;
import br.com.fiap.urbanrisk.domain.Sensor;
import br.com.fiap.urbanrisk.domain.StatusAlerta;
import br.com.fiap.urbanrisk.domain.TipoRisco;
import br.com.fiap.urbanrisk.privacidade.Anonimizador;
import br.com.fiap.urbanrisk.realtime.MensagemTempoReal;
import br.com.fiap.urbanrisk.simulacao.Cenario;
import br.com.fiap.urbanrisk.simulacao.CenarioAtivo;
import br.com.fiap.urbanrisk.simulacao.SimuladorSensores;
import br.com.fiap.urbanrisk.store.MonitoramentoStore;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Coração do backend: a cada ciclo avança a simulação, roda o motor de regras,
 * abre/escalona/resolve alertas e publica as mudanças em tempo real.
 *
 * Todos os acessos ao estado passam por métodos synchronized, então o ciclo
 * agendado e as requisições HTTP nunca leem dados pela metade.
 */
@Service
public class MonitoramentoService {

    private static final Logger log = LoggerFactory.getLogger(MonitoramentoService.class);

    /** Relatos considerados na avaliação de risco. */
    static final Duration JANELA_RELATOS = Duration.ofMinutes(15);
    /** Ciclos seguidos com condição melhor antes de rebaixar ou resolver um alerta. */
    static final int CICLOS_PARA_RELAXAR = 3;

    private final MonitoramentoStore store;
    private final MotorDeRegras motor;
    private final SimuladorSensores simulador;
    private final ApplicationEventPublisher eventos;
    private final Clock clock;
    private final long intervaloMs;
    private final Instant iniciadoEm;
    private final AtomicInteger sequenciaAlertas = new AtomicInteger();
    private final AtomicInteger sequenciaRelatos = new AtomicInteger();

    public MonitoramentoService(MonitoramentoStore store, MotorDeRegras motor, SimuladorSensores simulador,
                                ApplicationEventPublisher eventos, Clock clock,
                                @Value("${app.simulacao.intervalo-ms:2000}") long intervaloMs) {
        this.store = store;
        this.motor = motor;
        this.simulador = simulador;
        this.eventos = eventos;
        this.clock = clock;
        this.intervaloMs = intervaloMs;
        this.iniciadoEm = clock.instant();
        simulador.popular(store, iniciadoEm);
    }

    // ------------------------------------------------------------------ ciclo

    @Scheduled(fixedRateString = "${app.simulacao.intervalo-ms:2000}", initialDelayString = "${app.simulacao.intervalo-ms:2000}")
    public void executarCiclo() {
        List<MensagemTempoReal> saida = new ArrayList<>();
        synchronized (this) {
            Instant agora = clock.instant();
            simulador.avancar(store, agora);
            for (Area area : store.areas()) {
                avaliarArea(area, agora, saida);
            }
            saida.add(new MensagemTempoReal("tick", montarPainel(agora, false), null));
        }
        saida.forEach(eventos::publishEvent);
    }

    /** Roda as regras de uma área e atualiza os alertas dela. */
    private void avaliarArea(Area area, Instant agora, List<MensagemTempoReal> saida) {
        List<Avaliacao> avaliacoes = motor.avaliar(area, store.sensoresDaArea(area.id()),
                store.relatosDesde(area.id(), agora.minus(JANELA_RELATOS)), agora);
        Map<TipoRisco, Avaliacao> porTipo = new EnumMap<>(TipoRisco.class);
        avaliacoes.forEach(a -> porTipo.put(a.tipo(), a));

        for (TipoRisco tipo : TipoRisco.values()) {
            Avaliacao av = porTipo.get(tipo);
            Optional<Alerta> existente = store.alertaAberto(area.id(), tipo);

            if (av != null && existente.isEmpty()) {
                Alerta novo = new Alerta(String.format("AL-%04d", sequenciaAlertas.incrementAndGet()), area, tipo, agora);
                aplicar(novo, av, agora, true);
                store.salvarAberto(novo);
                saida.add(evento(novo, EventoAlerta.NOVO));
                log.info("Novo alerta {} {} {} em {} (confiança {})", novo.getId(), tipo, av.nivel(), area.nome(), av.confianca());
            } else if (av != null) {
                Alerta alerta = existente.get();
                NivelAlerta anterior = alerta.getNivel();
                if (av.nivel().ordinal() > anterior.ordinal()) {
                    aplicar(alerta, av, agora, true);
                    alerta.setCiclosNormais(0);
                    alerta.setEscalonamentos(alerta.getEscalonamentos() + 1);
                    // Piorou: volta a pedir atenção mesmo se alguém já tinha reconhecido.
                    alerta.setStatus(StatusAlerta.ATIVO);
                    alerta.setReconhecidoEm(null);
                    saida.add(evento(alerta, EventoAlerta.ESCALONADO));
                    log.info("Alerta {} escalonado {} -> {}", alerta.getId(), anterior, av.nivel());
                } else if (av.nivel().ordinal() < anterior.ordinal()) {
                    // Melhorou: só rebaixa depois de alguns ciclos, para não ficar oscilando.
                    alerta.setCiclosNormais(alerta.getCiclosNormais() + 1);
                    boolean rebaixar = alerta.getCiclosNormais() >= CICLOS_PARA_RELAXAR;
                    aplicar(alerta, av, agora, rebaixar);
                    if (rebaixar) {
                        alerta.setCiclosNormais(0);
                        saida.add(evento(alerta, EventoAlerta.ATUALIZADO));
                    }
                } else {
                    alerta.setCiclosNormais(0);
                    aplicar(alerta, av, agora, true);
                }
            } else if (existente.isPresent()) {
                Alerta alerta = existente.get();
                alerta.setCiclosNormais(alerta.getCiclosNormais() + 1);
                if (alerta.getCiclosNormais() >= CICLOS_PARA_RELAXAR) {
                    alerta.setStatus(StatusAlerta.RESOLVIDO);
                    alerta.setResolvidoEm(agora);
                    alerta.setAtualizadoEm(agora);
                    store.moverParaResolvidos(alerta);
                    saida.add(evento(alerta, EventoAlerta.RESOLVIDO));
                    log.info("Alerta {} resolvido", alerta.getId());
                }
            }
        }
    }

    private static void aplicar(Alerta alerta, Avaliacao av, Instant agora, boolean mudarNivel) {
        if (mudarNivel || alerta.getNivel() == null) {
            alerta.setNivel(av.nivel());
            alerta.setRecomendacao(av.recomendacao());
        }
        alerta.setConfianca(av.confianca());
        alerta.setOrigens(av.origens());
        alerta.setFontes(av.fontes());
        alerta.setMensagem(av.mensagem());
        alerta.setValorReferencia(av.valorReferencia());
        alerta.setAtualizadoEm(agora);
    }

    private static MensagemTempoReal evento(Alerta alerta, EventoAlerta evento) {
        return new MensagemTempoReal("alerta", Mapper.alerta(alerta), evento.name());
    }

    // ------------------------------------------------------------- consultas

    public synchronized PainelDTO painel(boolean comHistorico) {
        return montarPainel(clock.instant(), comHistorico);
    }

    public synchronized List<AreaDTO> areas() {
        return montarAreas();
    }

    public synchronized List<SensorDTO> sensores() {
        Instant agora = clock.instant();
        return store.sensores().stream().map(s -> Mapper.sensor(s, agora, false)).toList();
    }

    public synchronized SensorDTO sensor(String id) {
        Sensor s = store.sensor(id).orElseThrow(() -> new NaoEncontradoException("Sensor não encontrado: " + id));
        return Mapper.sensor(s, clock.instant(), true);
    }

    public synchronized List<AlertaDTO> alertas(boolean resolvidos) {
        List<Alerta> lista = resolvidos ? store.alertasResolvidos() : store.alertasAbertos();
        return lista.stream().map(Mapper::alerta).toList();
    }

    public synchronized AlertaDTO alerta(String id) {
        return store.alerta(id).map(Mapper::alerta)
                .orElseThrow(() -> new NaoEncontradoException("Alerta não encontrado: " + id));
    }

    public synchronized List<RelatoDTO> relatos() {
        return store.relatos().stream().map(this::relatoDTO).toList();
    }

    public synchronized List<CenarioDTO> cenarios() {
        return simulador.cenariosAtivos().stream().map(Mapper::cenario).toList();
    }

    public Instant iniciadoEm() {
        return iniciadoEm;
    }

    // --------------------------------------------------------------- comandos

    public RelatoDTO registrarRelato(NovoRelatoRequest req) {
        List<MensagemTempoReal> saida = new ArrayList<>();
        RelatoDTO dto;
        synchronized (this) {
            Area area = store.area(req.areaId())
                    .orElseThrow(() -> new NaoEncontradoException("Área não encontrada: " + req.areaId()));
            Instant agora = clock.instant();
            Relato relato = new Relato(String.format("RL-%04d", sequenciaRelatos.incrementAndGet()), area.id(),
                    req.tipo(), Anonimizador.anonimizar(req.descricao()), agora);
            store.adicionarRelato(relato);
            dto = relatoDTO(relato);
            saida.add(new MensagemTempoReal("relato", dto, null));
            // Reavalia na hora: o relato pode abrir ou reforçar um alerta.
            avaliarArea(area, agora, saida);
            saida.add(new MensagemTempoReal("tick", montarPainel(agora, false), null));
        }
        saida.forEach(eventos::publishEvent);
        return dto;
    }

    public AlertaDTO reconhecer(String id) {
        AlertaDTO dto;
        synchronized (this) {
            Alerta alerta = store.alerta(id)
                    .orElseThrow(() -> new NaoEncontradoException("Alerta não encontrado: " + id));
            if (!alerta.isAberto()) {
                throw new IllegalStateException("O alerta " + id + " já foi resolvido.");
            }
            Instant agora = clock.instant();
            alerta.setStatus(StatusAlerta.RECONHECIDO);
            alerta.setReconhecidoEm(agora);
            alerta.setAtualizadoEm(agora);
            dto = Mapper.alerta(alerta);
        }
        eventos.publishEvent(new MensagemTempoReal("alerta", dto, EventoAlerta.RECONHECIDO.name()));
        eventos.publishEvent(new MensagemTempoReal("tick", painel(false), null));
        return dto;
    }

    public CenarioDTO ativarCenario(String areaId, Cenario cenario, Integer duracaoSegundos) {
        CenarioDTO dto;
        synchronized (this) {
            store.area(areaId).orElseThrow(() -> new NaoEncontradoException("Área não encontrada: " + areaId));
            int duracao = duracaoSegundos == null ? 90 : duracaoSegundos;
            CenarioAtivo ativo = simulador.ativarCenario(areaId, cenario, Duration.ofSeconds(duracao), clock.instant());
            dto = Mapper.cenario(ativo);
            log.info("Cenário {} ativado em {} por {}s", cenario, areaId, duracao);
        }
        eventos.publishEvent(new MensagemTempoReal("tick", painel(false), null));
        return dto;
    }

    public void normalizarCenarios() {
        synchronized (this) {
            simulador.normalizarTudo();
        }
        eventos.publishEvent(new MensagemTempoReal("tick", painel(false), null));
    }

    // ----------------------------------------------------------------- painel

    private PainelDTO montarPainel(Instant agora, boolean comHistorico) {
        List<Alerta> abertos = store.alertasAbertos();
        List<Sensor> sensores = store.sensores();
        int criticos = (int) abertos.stream().filter(a -> a.getNivel() == NivelAlerta.CRITICO).count();
        int altos = (int) abertos.stream().filter(a -> a.getNivel() == NivelAlerta.ALTO).count();
        int naoReconhecidos = (int) abertos.stream().filter(a -> a.getStatus() == StatusAlerta.ATIVO).count();
        int online = (int) sensores.stream().filter(s -> !s.desatualizado(agora)).count();
        Instant umaHora = agora.minus(Duration.ofHours(1));
        int relatosHora = (int) store.relatos().stream().filter(r -> r.criadoEm().isAfter(umaHora)).count();

        ResumoDTO resumo = new ResumoDTO(abertos.size(), criticos, altos, naoReconhecidos, online, sensores.size(), relatosHora);
        return new PainelDTO(
                agora,
                iniciadoEm,
                intervaloMs,
                resumo,
                montarAreas(),
                abertos.stream().map(Mapper::alerta).toList(),
                sensores.stream().map(s -> Mapper.sensor(s, agora, comHistorico)).toList(),
                store.relatos().stream().limit(20).map(this::relatoDTO).toList(),
                simulador.cenariosAtivos().stream().map(Mapper::cenario).toList());
    }

    private List<AreaDTO> montarAreas() {
        List<Alerta> abertos = store.alertasAbertos();
        return store.areas().stream().map(area -> {
            List<Alerta> daArea = abertos.stream().filter(a -> a.getAreaId().equals(area.id())).toList();
            NivelAlerta pior = null;
            for (Alerta a : daArea) pior = NivelAlerta.maior(pior, a.getNivel());
            Cenario cenario = simulador.cenario(area.id());
            return new AreaDTO(area.id(), area.nome(), area.referencia(), area.latitude(), area.longitude(),
                    pior == null ? "NORMAL" : pior.name(), daArea.size(), cenario.name());
        }).toList();
    }

    private RelatoDTO relatoDTO(Relato r) {
        String nome = store.area(r.areaId()).map(Area::nome).orElse(r.areaId());
        return Mapper.relato(r, nome);
    }
}
