package br.com.fiap.urbanrisk.api.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record SensorDTO(
        String id,
        String areaId,
        String tipo,
        String tipoDescricao,
        String nome,
        String origem,
        String origemDescricao,
        double valor,
        String unidade,
        Instant atualizadoEm,
        boolean desatualizado,
        double confianca,
        List<Double> historico) {
}
