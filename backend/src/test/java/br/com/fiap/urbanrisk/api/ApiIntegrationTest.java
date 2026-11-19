package br.com.fiap.urbanrisk.api;

import jakarta.websocket.ContainerProvider;
import jakarta.websocket.WebSocketContainer;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import static org.hamcrest.Matchers.hasSize;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {"app.simulacao.eventos-automaticos=false", "app.simulacao.intervalo-ms=500"})
@AutoConfigureMockMvc
class ApiIntegrationTest {

    @Autowired
    private MockMvc mvc;

    @LocalServerPort
    private int porta;

    @Test
    void statusRespondeUp() throws Exception {
        mvc.perform(get("/api/status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    void painelTrazAreasESensores() throws Exception {
        mvc.perform(get("/api/painel"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.areas", hasSize(6)))
                .andExpect(jsonPath("$.sensores", hasSize(24)))
                .andExpect(jsonPath("$.resumo.sensoresTotal").value(24));
    }

    @Test
    void relatoValidoRetorna201() throws Exception {
        mvc.perform(post("/api/relatos").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"areaId\":\"ipiranga\",\"tipo\":\"ALAGAMENTO\",\"descricao\":\"Água subindo na Ricardo Jafet\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.origem").value("COMUNIDADE"));
    }

    @Test
    void relatoInvalidoRetorna400() throws Exception {
        mvc.perform(post("/api/relatos").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"areaId\":\"\",\"tipo\":\"ALAGAMENTO\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.areaId").exists());

        mvc.perform(post("/api/relatos").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"areaId\":\"ipiranga\",\"tipo\":\"TERREMOTO\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void alertaInexistenteRetorna404() throws Exception {
        mvc.perform(post("/api/alertas/AL-9999/reconhecer"))
                .andExpect(status().isNotFound());
    }

    @Test
    void webSocketEnviaSnapshotEDepoisTicks() throws Exception {
        BlockingQueue<String> recebidas = new LinkedBlockingQueue<>();
        TextWebSocketHandler handler = new TextWebSocketHandler() {
            @Override
            protected void handleTextMessage(WebSocketSession session, TextMessage message) {
                recebidas.add(message.getPayload());
            }
        };

        // O cliente WebSocket do Tomcat aceita só 8 KB por mensagem por padrão; o snapshot é maior.
        WebSocketContainer container = ContainerProvider.getWebSocketContainer();
        container.setDefaultMaxTextMessageBufferSize(1024 * 1024);

        WebSocketSession sessao = new StandardWebSocketClient(container)
                .execute(handler, "ws://localhost:" + porta + "/ws")
                .get(5, TimeUnit.SECONDS);
        try {
            String primeira = recebidas.poll(5, TimeUnit.SECONDS);
            assertNotNull(primeira);
            assertTrue(primeira.contains("\"tipo\":\"snapshot\""));

            String segunda = recebidas.poll(5, TimeUnit.SECONDS);
            assertNotNull(segunda);
            assertTrue(segunda.contains("\"tipo\":\"tick\"") || segunda.contains("\"tipo\":\"heartbeat\""));

            sessao.sendMessage(new TextMessage("{\"tipo\":\"ping\",\"id\":\"abc\"}"));
            boolean recebeuPong = false;
            for (int i = 0; i < 10 && !recebeuPong; i++) {
                String m = recebidas.poll(2, TimeUnit.SECONDS);
                recebeuPong = m != null && m.contains("\"tipo\":\"pong\"") && m.contains("abc");
            }
            assertTrue(recebeuPong);
        } finally {
            sessao.close();
        }
    }
}
