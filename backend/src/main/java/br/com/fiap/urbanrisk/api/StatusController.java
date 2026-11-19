package br.com.fiap.urbanrisk.api;

import br.com.fiap.urbanrisk.realtime.TempoRealHandler;
import br.com.fiap.urbanrisk.service.MonitoramentoService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class StatusController {

    private final MonitoramentoService service;
    private final TempoRealHandler tempoReal;

    public StatusController(MonitoramentoService service, TempoRealHandler tempoReal) {
        this.service = service;
        this.tempoReal = tempoReal;
    }

    @GetMapping("/status")
    public Map<String, Object> status() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("status", "UP");
        m.put("servico", "Urban Risk Intelligence API");
        m.put("versao", "1.0.0");
        m.put("ts", Instant.now());
        m.put("iniciadoEm", service.iniciadoEm());
        m.put("clientesConectados", tempoReal.clientesConectados());
        return m;
    }
}
