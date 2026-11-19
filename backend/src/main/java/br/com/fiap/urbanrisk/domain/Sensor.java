package br.com.fiap.urbanrisk.domain;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;

/** Sensor de uma área, com a última leitura e um histórico curto. */
public class Sensor {

    public static final int TAMANHO_HISTORICO = 60;
    /** Sem leitura há mais que isso, o dado é considerado desatualizado. */
    public static final Duration LIMITE_DESATUALIZADO = Duration.ofSeconds(10);

    private final String id;
    private final String areaId;
    private final TipoSensor tipo;
    private final OrigemDado origem;
    private final String nome;
    private double valor;
    private Instant atualizadoEm;
    private boolean emFalha;
    private final Deque<Leitura> historico = new ArrayDeque<>();

    public Sensor(String id, String areaId, TipoSensor tipo, OrigemDado origem, String nome, double valorInicial, Instant agora) {
        this.id = id;
        this.areaId = areaId;
        this.tipo = tipo;
        this.origem = origem;
        this.nome = nome;
        registrar(valorInicial, agora);
    }

    public final void registrar(double novoValor, Instant quando) {
        this.valor = novoValor;
        this.atualizadoEm = quando;
        historico.addLast(new Leitura(novoValor, quando));
        while (historico.size() > TAMANHO_HISTORICO) {
            historico.removeFirst();
        }
    }

    public boolean desatualizado(Instant agora) {
        return emFalha || Duration.between(atualizadoEm, agora).compareTo(LIMITE_DESATUALIZADO) > 0;
    }

    /** Confiança do dado deste sensor neste instante. */
    public double confianca(Instant agora) {
        double base = origem.getConfiancaBase();
        return desatualizado(agora) ? base * 0.5 : base;
    }

    public List<Leitura> getHistorico() {
        return new ArrayList<>(historico);
    }

    public String getId() { return id; }
    public String getAreaId() { return areaId; }
    public TipoSensor getTipo() { return tipo; }
    public OrigemDado getOrigem() { return origem; }
    public String getNome() { return nome; }
    public double getValor() { return valor; }
    public Instant getAtualizadoEm() { return atualizadoEm; }
    public boolean isEmFalha() { return emFalha; }
    public void setEmFalha(boolean emFalha) { this.emFalha = emFalha; }

    public record Leitura(double valor, Instant ts) {
    }
}
