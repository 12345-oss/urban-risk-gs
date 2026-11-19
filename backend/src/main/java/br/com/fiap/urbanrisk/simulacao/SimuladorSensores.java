package br.com.fiap.urbanrisk.simulacao;

import br.com.fiap.urbanrisk.domain.Area;
import br.com.fiap.urbanrisk.domain.OrigemDado;
import br.com.fiap.urbanrisk.domain.Sensor;
import br.com.fiap.urbanrisk.domain.TipoSensor;
import br.com.fiap.urbanrisk.store.MonitoramentoStore;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;

/**
 * Gera leituras realistas para os sensores das áreas monitoradas.
 *
 * Cada área pode estar em um cenário (tempestade, onda de calor, apagão,
 * falha de sensor). Os valores se aproximam aos poucos do "alvo" do cenário,
 * então o risco evolui como na vida real: a chuva aumenta primeiro e o
 * córrego enche depois. Os cenários podem ser disparados pela API (para a
 * demonstração) ou automaticamente.
 */
@Component
public class SimuladorSensores {

    private final Random random;
    private final boolean eventosAutomaticos;
    private final Duration intervaloEventos;
    private final Map<String, CenarioAtivo> cenarios = new LinkedHashMap<>();
    private final Map<String, Double> temperaturaBase = new LinkedHashMap<>();
    private Instant proximoEventoAutomatico;

    public SimuladorSensores(
            @Value("${app.simulacao.eventos-automaticos:true}") boolean eventosAutomaticos,
            @Value("${app.simulacao.intervalo-eventos-segundos:120}") long intervaloEventosSegundos,
            @Value("${app.simulacao.semente:0}") long semente) {
        this.random = semente == 0 ? new Random() : new Random(semente);
        this.eventosAutomaticos = eventosAutomaticos;
        this.intervaloEventos = Duration.ofSeconds(intervaloEventosSegundos);
    }

    /** Cria as áreas e os sensores iniciais. */
    public void popular(MonitoramentoStore store, Instant agora) {
        List<Area> areas = List.of(
                new Area("ipiranga", "Ipiranga", "Córrego Ipiranga · Av. Ricardo Jafet", -23.5869, -46.6087),
                new Area("mooca", "Mooca", "Rio Tamanduateí · Av. do Estado", -23.5590, -46.5990),
                new Area("vila-prudente", "Vila Prudente", "Córrego da Mooca · Av. Anhaia Mello", -23.5826, -46.5807),
                new Area("cambuci", "Cambuci", "Av. Lins de Vasconcelos", -23.5660, -46.6200),
                new Area("sacoma", "Sacomã", "Córrego dos Meninos · Av. das Juntas Provisórias", -23.6030, -46.6000),
                new Area("vila-mariana", "Vila Mariana", "Córrego do Sapateiro · Av. Sena Madureira", -23.5890, -46.6340));

        for (Area area : areas) {
            store.adicionarArea(area);
            String id = area.id();
            double base = 24 + random.nextDouble() * 3;
            temperaturaBase.put(id, base);
            store.adicionarSensor(new Sensor(id + "-chuva", id, TipoSensor.PLUVIOMETRO, OrigemDado.SENSOR_OFICIAL,
                    "Pluviômetro " + area.nome(), round(random.nextDouble() * 2), agora));
            store.adicionarSensor(new Sensor(id + "-nivel", id, TipoSensor.NIVEL_CORREGO, OrigemDado.SENSOR_OFICIAL,
                    "Nível do córrego " + area.nome(), round(25 + random.nextDouble() * 15), agora));
            store.adicionarSensor(new Sensor(id + "-temp", id, TipoSensor.TEMPERATURA, OrigemDado.BASE_PUBLICA,
                    "Estação meteorológica " + area.nome(), round(base), agora));
            store.adicionarSensor(new Sensor(id + "-energia", id, TipoSensor.ENERGIA, OrigemDado.BASE_PUBLICA,
                    "Concessionária de energia " + area.nome(), 100, agora));
        }
        proximoEventoAutomatico = agora.plusSeconds(45);
    }

    /** Avança a simulação um passo (chamado a cada intervalo). */
    public void avancar(MonitoramentoStore store, Instant agora) {
        encerrarCenariosVencidos(agora);
        dispararEventoAutomatico(store, agora);

        for (Area area : store.areas()) {
            Cenario cenario = cenario(area.id());
            for (Sensor s : store.sensoresDaArea(area.id())) {
                boolean falha = cenario == Cenario.FALHA_SENSOR && s.getTipo() == TipoSensor.NIVEL_CORREGO;
                s.setEmFalha(falha);
                if (falha) continue; // sensor parado: não envia leitura
                s.registrar(round(proximoValor(s, cenario, store)), agora);
            }
        }
    }

    private double proximoValor(Sensor s, Cenario cenario, MonitoramentoStore store) {
        double v = s.getValor();
        return switch (s.getTipo()) {
            case PLUVIOMETRO -> {
                double alvo = cenario == Cenario.TEMPESTADE ? 62 : 1.5;
                double k = cenario == Cenario.TEMPESTADE ? 0.25 : 0.2;
                yield Math.max(0, v + (alvo - v) * k + ruido(cenario == Cenario.TEMPESTADE ? 3 : 0.8));
            }
            case NIVEL_CORREGO -> {
                double chuva = valor(store, s.getAreaId(), TipoSensor.PLUVIOMETRO);
                double alvo = Math.min(115, 30 + chuva * 1.2);
                yield clamp(v + (alvo - v) * 0.08 + ruido(0.6), 5, 120);
            }
            case TEMPERATURA -> {
                double base = temperaturaBase.getOrDefault(s.getAreaId(), 25.0);
                double alvo = switch (cenario) {
                    case ONDA_DE_CALOR -> 38.8;
                    case TEMPESTADE -> base - 3;
                    default -> base;
                };
                yield v + (alvo - v) * 0.12 + ruido(0.15);
            }
            case ENERGIA -> {
                double nivelCorrego = valor(store, s.getAreaId(), TipoSensor.NIVEL_CORREGO);
                double alvo = cenario == Cenario.APAGAO ? 42 : (nivelCorrego > 92 ? 82 : 100);
                double k = cenario == Cenario.APAGAO ? 0.3 : 0.15;
                yield clamp(v + (alvo - v) * k + ruido(0.4), 0, 100);
            }
        };
    }

    public CenarioAtivo ativarCenario(String areaId, Cenario cenario, Duration duracao, Instant agora) {
        if (cenario == Cenario.NORMAL) {
            cenarios.remove(areaId);
            return new CenarioAtivo(areaId, Cenario.NORMAL, agora, agora);
        }
        CenarioAtivo ativo = new CenarioAtivo(areaId, cenario, agora, agora.plus(duracao));
        cenarios.put(areaId, ativo);
        return ativo;
    }

    public void normalizarTudo() {
        cenarios.clear();
    }

    public List<CenarioAtivo> cenariosAtivos() {
        return new ArrayList<>(cenarios.values());
    }

    public Cenario cenario(String areaId) {
        CenarioAtivo c = cenarios.get(areaId);
        return c == null ? Cenario.NORMAL : c.cenario();
    }

    private void encerrarCenariosVencidos(Instant agora) {
        cenarios.values().removeIf(c -> agora.isAfter(c.fim()));
    }

    private void dispararEventoAutomatico(MonitoramentoStore store, Instant agora) {
        if (!eventosAutomaticos || agora.isBefore(proximoEventoAutomatico)) return;
        proximoEventoAutomatico = agora.plus(intervaloEventos);
        List<Area> livres = store.areas().stream().filter(a -> !cenarios.containsKey(a.id())).toList();
        if (livres.isEmpty()) return;
        Area area = livres.get(random.nextInt(livres.size()));
        double sorteio = random.nextDouble();
        Cenario cenario = sorteio < 0.6 ? Cenario.TEMPESTADE : sorteio < 0.8 ? Cenario.ONDA_DE_CALOR : Cenario.APAGAO;
        ativarCenario(area.id(), cenario, Duration.ofSeconds(70), agora);
    }

    private static double valor(MonitoramentoStore store, String areaId, TipoSensor tipo) {
        return store.sensoresDaArea(areaId).stream()
                .filter(x -> x.getTipo() == tipo)
                .mapToDouble(Sensor::getValor)
                .findFirst().orElse(0);
    }

    private double ruido(double amplitude) {
        return (random.nextDouble() * 2 - 1) * amplitude;
    }

    private static double clamp(double v, double min, double max) {
        return Math.max(min, Math.min(max, v));
    }

    private static double round(double v) {
        return Math.round(v * 10) / 10.0;
    }
}
