package br.com.fiap.urbanrisk.api.dto;

import java.time.Instant;
import java.util.List;

/** Fotografia completa do estado do monitoramento (snapshot). */
public record PainelDTO(
        Instant ts,
        Instant servidorIniciadoEm,
        long intervaloAtualizacaoMs,
        ResumoDTO resumo,
        List<AreaDTO> areas,
        List<AlertaDTO> alertas,
        List<SensorDTO> sensores,
        List<RelatoDTO> relatos,
        List<CenarioDTO> cenarios) {
}
