package br.com.fiap.urbanrisk.alerta;

import br.com.fiap.urbanrisk.domain.Area;
import br.com.fiap.urbanrisk.domain.NivelAlerta;
import br.com.fiap.urbanrisk.domain.OrigemDado;
import br.com.fiap.urbanrisk.domain.Relato;
import br.com.fiap.urbanrisk.domain.Sensor;
import br.com.fiap.urbanrisk.domain.TipoRisco;
import br.com.fiap.urbanrisk.domain.TipoSensor;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;

/**
 * Regras que transformam leituras e relatos em avaliações de risco.
 *
 * Não guarda estado: recebe os dados da área e devolve, para cada tipo de
 * risco, o nível e a confiança. A confiança combina as fontes que apontam o
 * mesmo risco (fontes independentes que concordam aumentam a confiança).
 */
@Component
public class MotorDeRegras {

    // Alagamento
    static final double NIVEL_CRITICO = 95, NIVEL_ALTO = 80, NIVEL_MEDIO = 65;
    static final double CHUVA_ALTA = 50, CHUVA_MEDIA = 25, CHUVA_BAIXA = 10;
    // Calor
    static final double TEMP_CRITICA = 39, TEMP_ALTA = 37, TEMP_MEDIA = 34, TEMP_BAIXA = 32;
    // Energia (% de domicílios com fornecimento)
    static final double ENERGIA_CRITICA = 50, ENERGIA_ALTA = 70, ENERGIA_MEDIA = 85, ENERGIA_BAIXA = 95;

    public List<Avaliacao> avaliar(Area area, List<Sensor> sensores, List<Relato> relatosRecentes, Instant agora) {
        List<Avaliacao> resultado = new ArrayList<>();
        avaliarAlagamento(area, sensores, relatosRecentes, agora).ifPresent(resultado::add);
        avaliarCalor(area, sensores, relatosRecentes, agora).ifPresent(resultado::add);
        avaliarEnergia(area, sensores, relatosRecentes, agora).ifPresent(resultado::add);
        return resultado;
    }

    Optional<Avaliacao> avaliarAlagamento(Area area, List<Sensor> sensores, List<Relato> relatos, Instant agora) {
        Fontes fontes = new Fontes(agora);
        NivelAlerta nivel = null;
        List<String> referencia = new ArrayList<>();

        Sensor corrego = sensor(sensores, TipoSensor.NIVEL_CORREGO);
        NivelAlerta porNivel = null;
        if (corrego != null) {
            double v = corrego.getValor();
            porNivel = v >= NIVEL_CRITICO ? NivelAlerta.CRITICO
                    : v >= NIVEL_ALTO ? NivelAlerta.ALTO
                    : v >= NIVEL_MEDIO ? NivelAlerta.MEDIO : null;
            if (porNivel != null) {
                fontes.sensor(corrego);
                referencia.add("córrego a " + fmt(v) + "% da capacidade");
            }
        }

        Sensor pluviometro = sensor(sensores, TipoSensor.PLUVIOMETRO);
        NivelAlerta porChuva = null;
        if (pluviometro != null) {
            double v = pluviometro.getValor();
            porChuva = v >= CHUVA_ALTA ? NivelAlerta.ALTO
                    : v >= CHUVA_MEDIA ? NivelAlerta.MEDIO
                    : v >= CHUVA_BAIXA ? NivelAlerta.BAIXO : null;
            if (porChuva != null) {
                fontes.sensor(pluviometro);
                referencia.add("chuva de " + fmt(v) + " mm/h");
            }
        }

        nivel = NivelAlerta.maior(porNivel, porChuva);
        // Córrego alto com chuva forte ao mesmo tempo: sobe um nível.
        if (porNivel != null && porNivel.ordinal() >= NivelAlerta.ALTO.ordinal()
                && porChuva != null && porChuva.ordinal() >= NivelAlerta.MEDIO.ordinal()) {
            nivel = nivel.acima();
        }

        int qtdRelatos = contarRelatos(relatos, TipoRisco.ALAGAMENTO);
        if (qtdRelatos > 0) {
            fontes.relatos(qtdRelatos);
            referencia.add(qtdRelatos + (qtdRelatos == 1 ? " relato de morador" : " relatos de moradores"));
            NivelAlerta porRelato = qtdRelatos >= 3 ? NivelAlerta.ALTO : qtdRelatos == 2 ? NivelAlerta.MEDIO : NivelAlerta.BAIXO;
            nivel = NivelAlerta.maior(nivel, porRelato);
        }

        if (nivel == null) return Optional.empty();

        String recomendacao = switch (nivel) {
            case CRITICO -> "Evite a região e não atravesse ruas alagadas. Procure um local elevado. Em emergência, ligue 199 (Defesa Civil).";
            case ALTO -> "Evite as vias próximas ao córrego e tire veículos de áreas baixas.";
            case MEDIO -> "Chuva forte na região. Evite deslocamentos desnecessários e acompanhe as atualizações.";
            case BAIXO -> "Fique atento: chuva ou relato ainda sem confirmação por sensor.";
        };
        String mensagem = "Risco de alagamento em " + area.nome() + ": " + String.join(", ", referencia) + ".";
        return Optional.of(fontes.avaliacao(TipoRisco.ALAGAMENTO, nivel, mensagem, recomendacao, referencia));
    }

    Optional<Avaliacao> avaliarCalor(Area area, List<Sensor> sensores, List<Relato> relatos, Instant agora) {
        Fontes fontes = new Fontes(agora);
        NivelAlerta nivel = null;
        List<String> referencia = new ArrayList<>();

        Sensor temp = sensor(sensores, TipoSensor.TEMPERATURA);
        if (temp != null) {
            double v = temp.getValor();
            nivel = v >= TEMP_CRITICA ? NivelAlerta.CRITICO
                    : v >= TEMP_ALTA ? NivelAlerta.ALTO
                    : v >= TEMP_MEDIA ? NivelAlerta.MEDIO
                    : v >= TEMP_BAIXA ? NivelAlerta.BAIXO : null;
            if (nivel != null) {
                fontes.sensor(temp);
                referencia.add(fmt(v) + " °C");
            }
        }

        int qtdRelatos = contarRelatos(relatos, TipoRisco.CALOR_EXTREMO);
        if (qtdRelatos > 0) {
            fontes.relatos(qtdRelatos);
            referencia.add(qtdRelatos + (qtdRelatos == 1 ? " relato de morador" : " relatos de moradores"));
            nivel = NivelAlerta.maior(nivel, qtdRelatos >= 3 ? NivelAlerta.MEDIO : NivelAlerta.BAIXO);
        }

        if (nivel == null) return Optional.empty();

        String recomendacao = switch (nivel) {
            case CRITICO -> "Calor extremo. Fique em locais frescos, beba água com frequência e verifique idosos e crianças.";
            case ALTO -> "Evite exposição ao sol entre 10h e 16h e mantenha-se hidratado.";
            case MEDIO -> "Temperatura elevada. Prefira roupas leves e beba água.";
            case BAIXO -> "Calor acima do normal para a região.";
        };
        String mensagem = "Ilha de calor em " + area.nome() + ": " + String.join(", ", referencia) + ".";
        return Optional.of(fontes.avaliacao(TipoRisco.CALOR_EXTREMO, nivel, mensagem, recomendacao, referencia));
    }

    Optional<Avaliacao> avaliarEnergia(Area area, List<Sensor> sensores, List<Relato> relatos, Instant agora) {
        Fontes fontes = new Fontes(agora);
        NivelAlerta nivel = null;
        List<String> referencia = new ArrayList<>();

        Sensor energia = sensor(sensores, TipoSensor.ENERGIA);
        if (energia != null) {
            double v = energia.getValor();
            nivel = v <= ENERGIA_CRITICA ? NivelAlerta.CRITICO
                    : v <= ENERGIA_ALTA ? NivelAlerta.ALTO
                    : v <= ENERGIA_MEDIA ? NivelAlerta.MEDIO
                    : v <= ENERGIA_BAIXA ? NivelAlerta.BAIXO : null;
            if (nivel != null) {
                fontes.sensor(energia);
                referencia.add(fmt(100 - v) + "% dos domicílios sem energia");
            }
        }

        int qtdRelatos = contarRelatos(relatos, TipoRisco.FALTA_ENERGIA);
        if (qtdRelatos > 0) {
            fontes.relatos(qtdRelatos);
            referencia.add(qtdRelatos + (qtdRelatos == 1 ? " relato de morador" : " relatos de moradores"));
            NivelAlerta porRelato = qtdRelatos >= 3 ? NivelAlerta.ALTO : qtdRelatos == 2 ? NivelAlerta.MEDIO : NivelAlerta.BAIXO;
            nivel = NivelAlerta.maior(nivel, porRelato);
        }

        if (nivel == null) return Optional.empty();

        String recomendacao = switch (nivel) {
            case CRITICO, ALTO -> "Queda de energia ampla. Desligue aparelhos da tomada e evite abrir geladeiras sem necessidade.";
            case MEDIO -> "Interrupção parcial de energia. Acompanhe a previsão de retorno da concessionária.";
            case BAIXO -> "Instabilidade pontual no fornecimento de energia.";
        };
        String mensagem = "Interrupção de energia em " + area.nome() + ": " + String.join(", ", referencia) + ".";
        return Optional.of(fontes.avaliacao(TipoRisco.FALTA_ENERGIA, nivel, mensagem, recomendacao, referencia));
    }

    /**
     * Confiança combinada de fontes independentes (OU probabilístico):
     * 1 - (1 - c1) * (1 - c2) * ... , limitada a 0,99.
     */
    public static double combinar(List<Double> confiancas) {
        double naoConfiavel = 1.0;
        for (double c : confiancas) {
            naoConfiavel *= (1.0 - c);
        }
        return Math.min(0.99, 1.0 - naoConfiavel);
    }

    /** Vários relatos contam como uma fonte só, que fica mais confiável a cada relato. */
    public static double confiancaRelatos(int quantidade) {
        if (quantidade <= 0) return 0;
        return Math.min(0.75, OrigemDado.COMUNIDADE.getConfiancaBase() + 0.10 * (quantidade - 1));
    }

    private static Sensor sensor(List<Sensor> sensores, TipoSensor tipo) {
        return sensores.stream().filter(s -> s.getTipo() == tipo).findFirst().orElse(null);
    }

    private static int contarRelatos(List<Relato> relatos, TipoRisco risco) {
        return (int) relatos.stream().filter(r -> r.tipo().getRisco() == risco).count();
    }

    private static String fmt(double v) {
        return String.format(Locale.forLanguageTag("pt-BR"), "%.0f", v);
    }

    /** Acumula as fontes que apontam um risco e calcula a confiança. */
    private static final class Fontes {
        private final Instant agora;
        private final List<Double> confiancas = new ArrayList<>();
        private final Set<OrigemDado> origens = new LinkedHashSet<>();
        private final List<String> descricoes = new ArrayList<>();

        Fontes(Instant agora) {
            this.agora = agora;
        }

        void sensor(Sensor s) {
            confiancas.add(s.confianca(agora));
            origens.add(s.getOrigem());
            String desc = s.getNome() + " (" + s.getOrigem().getDescricao().toLowerCase(Locale.ROOT) + ")";
            if (s.desatualizado(agora)) desc += " - sem atualização recente";
            descricoes.add(desc);
        }

        void relatos(int quantidade) {
            confiancas.add(confiancaRelatos(quantidade));
            origens.add(OrigemDado.COMUNIDADE);
            descricoes.add(quantidade + (quantidade == 1 ? " relato da comunidade" : " relatos da comunidade") + " (últimos 15 min)");
        }

        Avaliacao avaliacao(TipoRisco tipo, NivelAlerta nivel, String mensagem, String recomendacao, List<String> referencia) {
            double confianca = Math.round(combinar(confiancas) * 100) / 100.0;
            return new Avaliacao(tipo, nivel, confianca, List.copyOf(origens), List.copyOf(descricoes),
                    mensagem, recomendacao, String.join(" · ", referencia));
        }
    }
}
