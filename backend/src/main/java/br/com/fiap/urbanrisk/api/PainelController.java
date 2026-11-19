package br.com.fiap.urbanrisk.api;

import br.com.fiap.urbanrisk.api.dto.AreaDTO;
import br.com.fiap.urbanrisk.api.dto.PainelDTO;
import br.com.fiap.urbanrisk.api.dto.SensorDTO;
import br.com.fiap.urbanrisk.service.MonitoramentoService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api")
public class PainelController {

    private final MonitoramentoService service;

    public PainelController(MonitoramentoService service) {
        this.service = service;
    }

    /** Estado completo (o mesmo conteúdo do snapshot enviado pelo WebSocket). */
    @GetMapping("/painel")
    public PainelDTO painel() {
        return service.painel(true);
    }

    @GetMapping("/areas")
    public List<AreaDTO> areas() {
        return service.areas();
    }

    @GetMapping("/sensores")
    public List<SensorDTO> sensores() {
        return service.sensores();
    }

    @GetMapping("/sensores/{id}")
    public SensorDTO sensor(@PathVariable String id) {
        return service.sensor(id);
    }
}
