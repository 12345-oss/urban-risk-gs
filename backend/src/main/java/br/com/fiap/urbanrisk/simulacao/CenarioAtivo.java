package br.com.fiap.urbanrisk.simulacao;

import java.time.Instant;

public record CenarioAtivo(String areaId, Cenario cenario, Instant inicio, Instant fim) {
}
