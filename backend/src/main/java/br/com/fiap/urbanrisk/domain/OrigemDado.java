package br.com.fiap.urbanrisk.domain;

/**
 * De onde vem o dado. Cada origem tem uma confiança base, usada pelo motor de
 * regras para calcular a confiança do alerta.
 */
public enum OrigemDado {
    SENSOR_OFICIAL("Sensor oficial", 0.95),
    BASE_PUBLICA("Base pública", 0.80),
    COMUNIDADE("Relato da comunidade", 0.45);

    private final String descricao;
    private final double confiancaBase;

    OrigemDado(String descricao, double confiancaBase) {
        this.descricao = descricao;
        this.confiancaBase = confiancaBase;
    }

    public String getDescricao() {
        return descricao;
    }

    public double getConfiancaBase() {
        return confiancaBase;
    }
}
