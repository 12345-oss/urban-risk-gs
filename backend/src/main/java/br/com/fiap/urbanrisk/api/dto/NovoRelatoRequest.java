package br.com.fiap.urbanrisk.api.dto;

import br.com.fiap.urbanrisk.domain.TipoRelato;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record NovoRelatoRequest(
        @NotBlank(message = "Informe a área") String areaId,
        @NotNull(message = "Informe o tipo do relato") TipoRelato tipo,
        @Size(max = 280, message = "A descrição pode ter no máximo 280 caracteres") String descricao) {
}
