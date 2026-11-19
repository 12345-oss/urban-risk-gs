package br.com.fiap.urbanrisk.domain;

import java.time.Instant;

/**
 * Relato enviado por um morador. Não guarda nome, telefone ou localização
 * exata do autor (LGPD): só a área, o tipo e uma descrição já anonimizada.
 */
public record Relato(String id, String areaId, TipoRelato tipo, String descricao, Instant criadoEm) {

    public OrigemDado origem() {
        return OrigemDado.COMUNIDADE;
    }
}
