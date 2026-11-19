package br.com.fiap.urbanrisk.api;

import br.com.fiap.urbanrisk.api.dto.AlertaDTO;
import br.com.fiap.urbanrisk.api.dto.CenarioDTO;
import br.com.fiap.urbanrisk.api.dto.RelatoDTO;
import br.com.fiap.urbanrisk.api.dto.SensorDTO;
import br.com.fiap.urbanrisk.domain.Alerta;
import br.com.fiap.urbanrisk.domain.Relato;
import br.com.fiap.urbanrisk.domain.Sensor;
import br.com.fiap.urbanrisk.simulacao.CenarioAtivo;

import java.time.Instant;
import java.util.List;

/** Converte objetos de domínio nos DTOs enviados ao app. */
public final class Mapper {

    private Mapper() {
    }

    public static SensorDTO sensor(Sensor s, Instant agora, boolean comHistorico) {
        List<Double> historico = comHistorico
                ? s.getHistorico().stream().map(Sensor.Leitura::valor).toList()
                : null;
        return new SensorDTO(s.getId(), s.getAreaId(), s.getTipo().name(), s.getTipo().getDescricao(), s.getNome(),
                s.getOrigem().name(), s.getOrigem().getDescricao(), s.getValor(), s.getTipo().getUnidade(),
                s.getAtualizadoEm(), s.desatualizado(agora), s.confianca(agora), historico);
    }

    public static AlertaDTO alerta(Alerta a) {
        return new AlertaDTO(a.getId(), a.getAreaId(), a.getAreaNome(), a.getTipo().name(), a.getTipo().getDescricao(),
                a.getNivel().name(), a.getStatus().name(), a.getConfianca(), a.isConfirmado(), a.getPrioridade(),
                a.getOrigens().stream().map(Enum::name).toList(), a.getFontes(), a.getMensagem(), a.getRecomendacao(),
                a.getValorReferencia(), a.getCriadoEm(), a.getAtualizadoEm(), a.getReconhecidoEm(), a.getResolvidoEm(),
                a.getEscalonamentos());
    }

    public static RelatoDTO relato(Relato r, String areaNome) {
        return new RelatoDTO(r.id(), r.areaId(), areaNome, r.tipo().name(), r.descricao(), r.origem().name(), r.criadoEm());
    }

    public static CenarioDTO cenario(CenarioAtivo c) {
        return new CenarioDTO(c.areaId(), c.cenario().name(), c.cenario().getDescricao(), c.inicio(), c.fim());
    }
}
