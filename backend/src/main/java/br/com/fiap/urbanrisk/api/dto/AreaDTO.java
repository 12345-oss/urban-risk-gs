package br.com.fiap.urbanrisk.api.dto;

public record AreaDTO(
        String id,
        String nome,
        String referencia,
        double latitude,
        double longitude,
        String risco,
        int alertasAbertos,
        String cenario) {
}
