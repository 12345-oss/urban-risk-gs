package br.com.fiap.urbanrisk.domain;

public enum TipoSensor {
    PLUVIOMETRO("Pluviômetro", "mm/h"),
    NIVEL_CORREGO("Nível do córrego", "%"),
    TEMPERATURA("Temperatura", "°C"),
    ENERGIA("Fornecimento de energia", "%");

    private final String descricao;
    private final String unidade;

    TipoSensor(String descricao, String unidade) {
        this.descricao = descricao;
        this.unidade = unidade;
    }

    public String getDescricao() {
        return descricao;
    }

    public String getUnidade() {
        return unidade;
    }
}
