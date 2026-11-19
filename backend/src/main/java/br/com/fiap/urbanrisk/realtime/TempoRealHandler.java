package br.com.fiap.urbanrisk.realtime;

import br.com.fiap.urbanrisk.service.MonitoramentoService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.ConcurrentWebSocketSessionDecorator;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Canal de tempo real (ws://host:8080/ws).
 *
 * Protocolo (JSON):
 * <ul>
 *   <li>servidor → app: {@code snapshot} ao conectar, {@code tick} a cada ciclo,
 *   {@code alerta} (NOVO/ESCALONADO/RESOLVIDO...), {@code relato} e
 *   {@code heartbeat}. Toda mensagem difundida tem um {@code seq} crescente:
 *   se o app perceber um buraco na sequência, pede {@code sync}.</li>
 *   <li>app → servidor: {@code ping} (respondido com {@code pong}, usado para
 *   medir a latência) e {@code sync} (reenvia o snapshot).</li>
 * </ul>
 */
@Component
public class TempoRealHandler extends TextWebSocketHandler {

    private static final Logger log = LoggerFactory.getLogger(TempoRealHandler.class);
    private static final long HEARTBEAT_MS = 2000;

    private final Map<String, WebSocketSession> sessoes = new ConcurrentHashMap<>();
    private final AtomicLong seq = new AtomicLong();
    private final MonitoramentoService service;
    private final ObjectMapper mapper;
    private volatile long ultimoEnvio = System.currentTimeMillis();

    public TempoRealHandler(MonitoramentoService service, ObjectMapper mapper) {
        this.service = service;
        this.mapper = mapper;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        WebSocketSession segura = new ConcurrentWebSocketSessionDecorator(session, 5_000, 1024 * 1024);
        sessoes.put(session.getId(), segura);
        log.info("App conectado: {} ({} conectados)", session.getRemoteAddress(), sessoes.size());
        enviarSnapshot(segura);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        sessoes.remove(session.getId());
        log.info("App desconectado: {} ({} conectados)", status, sessoes.size());
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) {
        sessoes.remove(session.getId());
        fecharSilenciosamente(session);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws IOException {
        WebSocketSession segura = sessoes.getOrDefault(session.getId(), session);
        JsonNode json;
        try {
            json = mapper.readTree(message.getPayload());
        } catch (IOException e) {
            return; // mensagem inválida: ignora
        }
        String tipo = json.path("tipo").asText("");
        switch (tipo) {
            case "ping" -> {
                Map<String, Object> pong = new LinkedHashMap<>();
                pong.put("tipo", "pong");
                pong.put("id", json.path("id").asText(""));
                pong.put("ts", Instant.now());
                enviar(segura, mapper.writeValueAsString(pong));
            }
            case "sync" -> enviarSnapshot(segura);
            default -> { }
        }
    }

    /** Recebe as mensagens publicadas pelo MonitoramentoService e difunde para todos. */
    @EventListener
    public void difundir(MensagemTempoReal mensagem) {
        difundir(mensagem.tipo(), mensagem.dados(), mensagem.evento());
    }

    /** Garante sinal de vida mesmo se nada mudou: o app usa isso para detectar queda. */
    @Scheduled(fixedRate = HEARTBEAT_MS)
    public void heartbeat() {
        if (System.currentTimeMillis() - ultimoEnvio >= HEARTBEAT_MS - 500) {
            difundir("heartbeat", null, null);
        }
    }

    public int clientesConectados() {
        return sessoes.size();
    }

    private synchronized void difundir(String tipo, Object dados, String evento) {
        if (sessoes.isEmpty()) {
            seq.incrementAndGet();
            return;
        }
        String json;
        try {
            json = mapper.writeValueAsString(envelope(tipo, seq.incrementAndGet(), dados, evento));
        } catch (IOException e) {
            log.error("Falha ao serializar mensagem {}", tipo, e);
            return;
        }
        ultimoEnvio = System.currentTimeMillis();
        sessoes.values().forEach(s -> enviar(s, json));
    }

    private void enviarSnapshot(WebSocketSession session) {
        try {
            String json = mapper.writeValueAsString(envelope("snapshot", seq.get(), service.painel(true), null));
            enviar(session, json);
        } catch (IOException e) {
            log.error("Falha ao montar snapshot", e);
        }
    }

    private Map<String, Object> envelope(String tipo, long numero, Object dados, String evento) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("tipo", tipo);
        m.put("seq", numero);
        m.put("ts", Instant.now());
        if (evento != null) m.put("evento", evento);
        if (dados != null) m.put("dados", dados);
        return m;
    }

    private void enviar(WebSocketSession session, String json) {
        if (!session.isOpen()) {
            sessoes.remove(session.getId());
            return;
        }
        try {
            session.sendMessage(new TextMessage(json));
        } catch (Exception e) {
            log.debug("Falha ao enviar para {}: {}", session.getId(), e.getMessage());
            sessoes.remove(session.getId());
            fecharSilenciosamente(session);
        }
    }

    private static void fecharSilenciosamente(WebSocketSession session) {
        try {
            session.close(CloseStatus.SERVER_ERROR);
        } catch (Exception ignored) {
            // já estava fechada
        }
    }
}
