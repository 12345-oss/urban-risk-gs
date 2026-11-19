package br.com.fiap.urbanrisk.api.dto;

public record ResumoDTO(
        int alertasAbertos,
        int criticos,
        int altos,
        int naoReconhecidos,
        int sensoresOnline,
        int sensoresTotal,
        int relatosUltimaHora) {
}
