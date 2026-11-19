package br.com.fiap.urbanrisk.simulacao;

public enum Cenario {
    NORMAL("Condições normais"),
    TEMPESTADE("Tempestade"),
    ONDA_DE_CALOR("Onda de calor"),
    APAGAO("Queda de energia"),
    FALHA_SENSOR("Falha no sensor de nível");

    private final String descricao;

    Cenario(String descricao) {
        this.descricao = descricao;
    }

    public String getDescricao() {
        return descricao;
    }
}
