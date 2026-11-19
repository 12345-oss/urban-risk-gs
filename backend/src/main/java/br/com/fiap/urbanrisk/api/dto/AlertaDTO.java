package br.com.fiap.urbanrisk.api.dto;

import java.time.Instant;
import java.util.List;

public record AlertaDTO(
        String id,
        String areaId,
        String areaNome,
        String tipo,
        String tipoDescricao,
        String nivel,
        String status,
        double confianca,
        boolean confirmado,
        int prioridade,
        List<String> origens,
        List<String> fontes,
        String mensagem,
        String recomendacao,
        String valorReferencia,
        Instant criadoEm,
        Instant atualizadoEm,
        Instant reconhecidoEm,
        Instant resolvidoEm,
        int escalonamentos) {
}
