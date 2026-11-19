package br.com.fiap.urbanrisk;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Urban Risk Intelligence Platform - API.
 *
 * Recebe leituras de sensores (simulados), dados de bases públicas e relatos da
 * comunidade, avalia o risco de cada área e envia alertas priorizados em tempo
 * real para o aplicativo via WebSocket.
 */
@SpringBootApplication
@EnableScheduling
public class UrbanRiskApplication {

    public static void main(String[] args) {
        SpringApplication.run(UrbanRiskApplication.class, args);
    }
}
