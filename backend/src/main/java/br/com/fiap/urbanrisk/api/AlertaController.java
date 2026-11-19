package br.com.fiap.urbanrisk.api;

import br.com.fiap.urbanrisk.api.dto.AlertaDTO;
import br.com.fiap.urbanrisk.service.MonitoramentoService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/alertas")
public class AlertaController {

    private final MonitoramentoService service;

    public AlertaController(MonitoramentoService service) {
        this.service = service;
    }

    /** Alertas abertos (padrão) ou resolvidos ({@code ?status=resolvidos}), por prioridade. */
    @GetMapping
    public List<AlertaDTO> listar(@RequestParam(defaultValue = "abertos") String status) {
        return service.alertas("resolvidos".equalsIgnoreCase(status));
    }

    @GetMapping("/{id}")
    public AlertaDTO buscar(@PathVariable String id) {
        return service.alerta(id);
    }

    /** Agente local confirma que viu o alerta. */
    @PostMapping("/{id}/reconhecer")
    public AlertaDTO reconhecer(@PathVariable String id) {
        return service.reconhecer(id);
    }
}
