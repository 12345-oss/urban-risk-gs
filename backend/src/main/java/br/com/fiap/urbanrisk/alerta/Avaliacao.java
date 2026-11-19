package br.com.fiap.urbanrisk.alerta;

import br.com.fiap.urbanrisk.domain.NivelAlerta;
import br.com.fiap.urbanrisk.domain.OrigemDado;
import br.com.fiap.urbanrisk.domain.TipoRisco;

import java.util.List;

/** Resultado do motor de regras para um tipo de risco em uma área. */
public record Avaliacao(
        TipoRisco tipo,
        NivelAlerta nivel,
        double confianca,
        List<OrigemDado> origens,
        List<String> fontes,
        String mensagem,
        String recomendacao,
        String valorReferencia) {
}
