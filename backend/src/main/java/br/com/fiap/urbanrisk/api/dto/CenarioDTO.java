package br.com.fiap.urbanrisk.api.dto;

import java.time.Instant;

public record CenarioDTO(String areaId, String cenario, String descricao, Instant inicio, Instant fim) {
}
