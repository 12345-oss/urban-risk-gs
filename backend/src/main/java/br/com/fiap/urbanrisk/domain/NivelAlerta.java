package br.com.fiap.urbanrisk.domain;

public enum NivelAlerta {
    BAIXO(15),
    MEDIO(40),
    ALTO(70),
    CRITICO(100);

    private final int peso;

    NivelAlerta(int peso) {
        this.peso = peso;
    }

    public int getPeso() {
        return peso;
    }

    public static NivelAlerta maior(NivelAlerta a, NivelAlerta b) {
        if (a == null) return b;
        if (b == null) return a;
        return a.ordinal() >= b.ordinal() ? a : b;
    }

    public NivelAlerta acima() {
        return this == CRITICO ? CRITICO : values()[ordinal() + 1];
    }
}
