package br.com.fiap.urbanrisk.domain;

public enum TipoRelato {
    ALAGAMENTO(TipoRisco.ALAGAMENTO),
    CALOR_EXTREMO(TipoRisco.CALOR_EXTREMO),
    SEM_ENERGIA(TipoRisco.FALTA_ENERGIA);

    private final TipoRisco risco;

    TipoRelato(TipoRisco risco) {
        this.risco = risco;
    }

    public TipoRisco getRisco() {
        return risco;
    }
}
