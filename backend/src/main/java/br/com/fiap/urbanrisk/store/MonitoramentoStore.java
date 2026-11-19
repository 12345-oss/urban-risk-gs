package br.com.fiap.urbanrisk.store;

import br.com.fiap.urbanrisk.domain.Alerta;
import br.com.fiap.urbanrisk.domain.Area;
import br.com.fiap.urbanrisk.domain.Relato;
import br.com.fiap.urbanrisk.domain.Sensor;
import br.com.fiap.urbanrisk.domain.TipoRisco;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Deque;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Armazenamento em memória (áreas, sensores, alertas e relatos).
 * Não é thread-safe sozinho: o MonitoramentoService sincroniza o acesso.
 */
@Component
public class MonitoramentoStore {

    private static final int MAX_RESOLVIDOS = 50;
    private static final int MAX_RELATOS = 200;

    private final Map<String, Area> areas = new LinkedHashMap<>();
    private final Map<String, Sensor> sensores = new LinkedHashMap<>();
    private final Map<String, Alerta> alertasAbertos = new LinkedHashMap<>();
    private final Deque<Alerta> alertasResolvidos = new ArrayDeque<>();
    private final Deque<Relato> relatos = new ArrayDeque<>();

    public void adicionarArea(Area area) {
        areas.put(area.id(), area);
    }

    public void adicionarSensor(Sensor sensor) {
        sensores.put(sensor.getId(), sensor);
    }

    public List<Area> areas() {
        return new ArrayList<>(areas.values());
    }

    public Optional<Area> area(String id) {
        return Optional.ofNullable(areas.get(id));
    }

    public List<Sensor> sensores() {
        return new ArrayList<>(sensores.values());
    }

    public Optional<Sensor> sensor(String id) {
        return Optional.ofNullable(sensores.get(id));
    }

    public List<Sensor> sensoresDaArea(String areaId) {
        return sensores.values().stream().filter(s -> s.getAreaId().equals(areaId)).toList();
    }

    public Optional<Alerta> alertaAberto(String areaId, TipoRisco tipo) {
        return alertasAbertos.values().stream()
                .filter(a -> a.getAreaId().equals(areaId) && a.getTipo() == tipo)
                .findFirst();
    }

    public void salvarAberto(Alerta alerta) {
        alertasAbertos.put(alerta.getId(), alerta);
    }

    public void moverParaResolvidos(Alerta alerta) {
        alertasAbertos.remove(alerta.getId());
        alertasResolvidos.addFirst(alerta);
        while (alertasResolvidos.size() > MAX_RESOLVIDOS) {
            alertasResolvidos.removeLast();
        }
    }

    /** Alertas abertos ordenados por prioridade (maior primeiro). */
    public List<Alerta> alertasAbertos() {
        return alertasAbertos.values().stream()
                .sorted(Comparator.comparingInt(Alerta::getPrioridade).reversed()
                        .thenComparing(Alerta::getAtualizadoEm, Comparator.reverseOrder()))
                .toList();
    }

    public List<Alerta> alertasResolvidos() {
        return new ArrayList<>(alertasResolvidos);
    }

    public Optional<Alerta> alerta(String id) {
        Alerta a = alertasAbertos.get(id);
        if (a != null) return Optional.of(a);
        return alertasResolvidos.stream().filter(r -> r.getId().equals(id)).findFirst();
    }

    public void adicionarRelato(Relato relato) {
        relatos.addFirst(relato);
        while (relatos.size() > MAX_RELATOS) {
            relatos.removeLast();
        }
    }

    /** Relatos mais recentes primeiro. */
    public List<Relato> relatos() {
        return new ArrayList<>(relatos);
    }

    public List<Relato> relatosDesde(String areaId, Instant desde) {
        return relatos.stream()
                .filter(r -> r.areaId().equals(areaId) && !r.criadoEm().isBefore(desde))
                .toList();
    }
}
