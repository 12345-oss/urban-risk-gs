package br.com.fiap.urbanrisk.api.dto;

import java.time.Instant;
import java.util.Map;

public record ErroDTO(int status, String erro, String mensagem, Map<String, String> campos, Instant ts) {
}
