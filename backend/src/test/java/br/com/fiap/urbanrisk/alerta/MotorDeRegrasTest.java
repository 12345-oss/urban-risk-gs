package br.com.fiap.urbanrisk.alerta;

import br.com.fiap.urbanrisk.domain.Area;
import br.com.fiap.urbanrisk.domain.NivelAlerta;
import br.com.fiap.urbanrisk.domain.OrigemDado;
import br.com.fiap.urbanrisk.domain.Relato;
import br.com.fiap.urbanrisk.domain.Sensor;
import br.com.fiap.urbanrisk.domain.TipoRelato;
import br.com.fiap.urbanrisk.domain.TipoRisco;
import br.com.fiap.urbanrisk.domain.TipoSensor;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class MotorDeRegrasTest {

    private static final Instant AGORA = Instant.parse("2026-11-19T12:00:00Z");
    private static final Area AREA = new Area("ipiranga", "Ipiranga", "Córrego Ipiranga", -23.58, -46.60);

    private final MotorDeRegras motor = new MotorDeRegras();

    private static Sensor sensor(TipoSensor tipo, OrigemDado origem, double valor, Instant quando) {
        return new Sensor("s-" + tipo, AREA.id(), tipo, origem, tipo.getDescricao(), valor, quando);
    }

    @Test
    void semRiscoQuandoTudoNormal() {
        List<Sensor> sensores = List.of(
                sensor(TipoSensor.PLUVIOMETRO, OrigemDado.SENSOR_OFICIAL, 2, AGORA),
                sensor(TipoSensor.NIVEL_CORREGO, OrigemDado.SENSOR_OFICIAL, 35, AGORA),
                sensor(TipoSensor.TEMPERATURA, OrigemDado.BASE_PUBLICA, 25, AGORA),
                sensor(TipoSensor.ENERGIA, OrigemDado.BASE_PUBLICA, 100, AGORA));

        assertTrue(motor.avaliar(AREA, sensores, List.of(), AGORA).isEmpty());
    }

    @Test
    void corregoAltoComChuvaForteViraCritico() {
        List<Sensor> sensores = List.of(
                sensor(TipoSensor.PLUVIOMETRO, OrigemDado.SENSOR_OFICIAL, 40, AGORA),
                sensor(TipoSensor.NIVEL_CORREGO, OrigemDado.SENSOR_OFICIAL, 85, AGORA));

        Avaliacao av = motor.avaliarAlagamento(AREA, sensores, List.of(), AGORA).orElseThrow();

        assertEquals(NivelAlerta.CRITICO, av.nivel());
        assertEquals(TipoRisco.ALAGAMENTO, av.tipo());
        // duas fontes oficiais concordando: confiança no teto
        assertEquals(0.99, av.confianca(), 0.001);
        assertEquals(2, av.fontes().size());
    }

    @Test
    void relatoIsoladoGeraAlertaBaixoComConfiancaBaixa() {
        Relato relato = new Relato("RL-1", AREA.id(), TipoRelato.ALAGAMENTO, "rua alagada", AGORA);

        Avaliacao av = motor.avaliarAlagamento(AREA, List.of(), List.of(relato), AGORA).orElseThrow();

        assertEquals(NivelAlerta.BAIXO, av.nivel());
        assertEquals(0.45, av.confianca(), 0.001);
        assertEquals(List.of(OrigemDado.COMUNIDADE), av.origens());
    }

    @Test
    void relatoQueConfirmaSensorAumentaConfianca() {
        Sensor temp = sensor(TipoSensor.TEMPERATURA, OrigemDado.BASE_PUBLICA, 35, AGORA);
        Relato relato = new Relato("RL-1", AREA.id(), TipoRelato.CALOR_EXTREMO, "muito calor", AGORA);

        double soSensor = motor.avaliarCalor(AREA, List.of(temp), List.of(), AGORA).orElseThrow().confianca();
        double sensorERelato = motor.avaliarCalor(AREA, List.of(temp), List.of(relato), AGORA).orElseThrow().confianca();

        assertEquals(0.80, soSensor, 0.001);
        assertTrue(sensorERelato > soSensor);
    }

    @Test
    void sensorSemAtualizacaoPerdeConfianca() {
        Sensor antigo = sensor(TipoSensor.ENERGIA, OrigemDado.BASE_PUBLICA, 40, AGORA.minusSeconds(60));

        Avaliacao av = motor.avaliarEnergia(AREA, List.of(antigo), List.of(), AGORA).orElseThrow();

        assertEquals(NivelAlerta.CRITICO, av.nivel());
        assertEquals(0.40, av.confianca(), 0.001);
        assertTrue(av.fontes().get(0).contains("sem atualização"));
    }

    @Test
    void chuvaFracaNaoGeraAlerta() {
        Sensor chuva = sensor(TipoSensor.PLUVIOMETRO, OrigemDado.SENSOR_OFICIAL, 5, AGORA);
        Optional<Avaliacao> av = motor.avaliarAlagamento(AREA, List.of(chuva), List.of(), AGORA);
        assertFalse(av.isPresent());
    }

    @Test
    void combinacaoDeFontesIndependentes() {
        assertEquals(0.0, MotorDeRegras.combinar(List.of()), 0.001);
        assertEquals(0.80, MotorDeRegras.combinar(List.of(0.80)), 0.001);
        assertEquals(0.89, MotorDeRegras.combinar(List.of(0.80, 0.45)), 0.001);
        assertEquals(0.99, MotorDeRegras.combinar(List.of(0.95, 0.95, 0.95)), 0.001);
        assertEquals(0.75, MotorDeRegras.confiancaRelatos(10), 0.001);
    }
}
