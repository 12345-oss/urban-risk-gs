package br.com.fiap.urbanrisk.service;

/** O que aconteceu com um alerta neste ciclo. */
public enum EventoAlerta {
    NOVO,
    ESCALONADO,
    ATUALIZADO,
    RECONHECIDO,
    RESOLVIDO
}
