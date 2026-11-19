package br.com.fiap.urbanrisk.realtime;

/**
 * Mensagem a ser enviada a todos os clientes conectados.
 * O serviço publica como evento do Spring e o TempoRealHandler faz o envio.
 */
public record MensagemTempoReal(String tipo, Object dados, String evento) {
}
