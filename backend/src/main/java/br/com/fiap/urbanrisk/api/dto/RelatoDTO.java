package br.com.fiap.urbanrisk.api.dto;

import java.time.Instant;

public record RelatoDTO(
        String id,
        String areaId,
        String areaNome,
        String tipo,
        String descricao,
        String origem,
        Instant criadoEm) {
}
