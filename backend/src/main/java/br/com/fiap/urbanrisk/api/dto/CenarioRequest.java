package br.com.fiap.urbanrisk.api.dto;

import br.com.fiap.urbanrisk.simulacao.Cenario;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CenarioRequest(
        @NotBlank(message = "Informe a área") String areaId,
        @NotNull(message = "Informe o cenário") Cenario cenario,
        @Min(10) @Max(600) Integer duracaoSegundos) {
}
