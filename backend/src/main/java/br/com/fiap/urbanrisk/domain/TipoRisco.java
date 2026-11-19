package br.com.fiap.urbanrisk.domain;

public enum TipoRisco {
    ALAGAMENTO("Alagamento"),
    CALOR_EXTREMO("Ilha de calor"),
    FALTA_ENERGIA("Interrupção de energia");

    private final String descricao;

    TipoRisco(String descricao) {
        this.descricao = descricao;
    }

    public String getDescricao() {
        return descricao;
    }
}
