package br.com.fiap.urbanrisk.api;

import br.com.fiap.urbanrisk.api.dto.CenarioDTO;
import br.com.fiap.urbanrisk.api.dto.CenarioRequest;
import br.com.fiap.urbanrisk.service.MonitoramentoService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Controle da simulação, usado na demonstração para provocar eventos. */
@RestController
@RequestMapping("/api/simulador/cenarios")
public class SimuladorController {

    private final MonitoramentoService service;

    public SimuladorController(MonitoramentoService service) {
        this.service = service;
    }

    @GetMapping
    public List<CenarioDTO> ativos() {
        return service.cenarios();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CenarioDTO ativar(@Valid @RequestBody CenarioRequest request) {
        return service.ativarCenario(request.areaId(), request.cenario(), request.duracaoSegundos());
    }

    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void normalizar() {
        service.normalizarCenarios();
    }
}
