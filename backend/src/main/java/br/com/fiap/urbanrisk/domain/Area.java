package br.com.fiap.urbanrisk.domain;

/** Bairro/área monitorada. */
public record Area(String id, String nome, String referencia, double latitude, double longitude) {
}
