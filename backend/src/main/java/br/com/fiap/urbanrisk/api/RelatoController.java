package br.com.fiap.urbanrisk.api;

import br.com.fiap.urbanrisk.api.dto.NovoRelatoRequest;
import br.com.fiap.urbanrisk.api.dto.RelatoDTO;
import br.com.fiap.urbanrisk.service.MonitoramentoService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/relatos")
public class RelatoController {

    private final MonitoramentoService service;

    public RelatoController(MonitoramentoService service) {
        this.service = service;
    }

    @GetMapping
    public List<RelatoDTO> listar() {
        return service.relatos();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public RelatoDTO criar(@Valid @RequestBody NovoRelatoRequest request) {
        return service.registrarRelato(request);
    }
}
