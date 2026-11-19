package br.com.fiap.urbanrisk.domain;

import java.time.Instant;
import java.util.List;

/** Alerta de risco para uma área. Existe no máximo um alerta aberto por área e tipo. */
public class Alerta {

    private final String id;
    private final String areaId;
    private final String areaNome;
    private final TipoRisco tipo;
    private final Instant criadoEm;
    private NivelAlerta nivel;
    private StatusAlerta status = StatusAlerta.ATIVO;
    private double confianca;
    private List<OrigemDado> origens;
    private List<String> fontes;
    private String mensagem;
    private String recomendacao;
    private String valorReferencia;
    private Instant atualizadoEm;
    private Instant reconhecidoEm;
    private Instant resolvidoEm;
    private int escalonamentos;
    /** Ciclos seguidos sem a condição de risco (para não ficar abrindo e fechando). */
    private int ciclosNormais;

    public Alerta(String id, Area area, TipoRisco tipo, Instant criadoEm) {
        this.id = id;
        this.areaId = area.id();
        this.areaNome = area.nome();
        this.tipo = tipo;
        this.criadoEm = criadoEm;
        this.atualizadoEm = criadoEm;
    }

    /** Prioridade de 0 a 100: peso do nível ponderado pela confiança. */
    public int getPrioridade() {
        return (int) Math.round(nivel.getPeso() * (0.4 + 0.6 * confianca));
    }

    public boolean isAberto() {
        return status != StatusAlerta.RESOLVIDO;
    }

    /** Alerta com confiança baixa: aparece no app como "não confirmado". */
    public boolean isConfirmado() {
        return confianca >= 0.6;
    }

    public String getId() { return id; }
    public String getAreaId() { return areaId; }
    public String getAreaNome() { return areaNome; }
    public TipoRisco getTipo() { return tipo; }
    public Instant getCriadoEm() { return criadoEm; }
    public NivelAlerta getNivel() { return nivel; }
    public void setNivel(NivelAlerta nivel) { this.nivel = nivel; }
    public StatusAlerta getStatus() { return status; }
    public void setStatus(StatusAlerta status) { this.status = status; }
    public double getConfianca() { return confianca; }
    public void setConfianca(double confianca) { this.confianca = confianca; }
    public List<OrigemDado> getOrigens() { return origens; }
    public void setOrigens(List<OrigemDado> origens) { this.origens = origens; }
    public List<String> getFontes() { return fontes; }
    public void setFontes(List<String> fontes) { this.fontes = fontes; }
    public String getMensagem() { return mensagem; }
    public void setMensagem(String mensagem) { this.mensagem = mensagem; }
    public String getRecomendacao() { return recomendacao; }
    public void setRecomendacao(String recomendacao) { this.recomendacao = recomendacao; }
    public String getValorReferencia() { return valorReferencia; }
    public void setValorReferencia(String valorReferencia) { this.valorReferencia = valorReferencia; }
    public Instant getAtualizadoEm() { return atualizadoEm; }
    public void setAtualizadoEm(Instant atualizadoEm) { this.atualizadoEm = atualizadoEm; }
    public Instant getReconhecidoEm() { return reconhecidoEm; }
    public void setReconhecidoEm(Instant reconhecidoEm) { this.reconhecidoEm = reconhecidoEm; }
    public Instant getResolvidoEm() { return resolvidoEm; }
    public void setResolvidoEm(Instant resolvidoEm) { this.resolvidoEm = resolvidoEm; }
    public int getEscalonamentos() { return escalonamentos; }
    public void setEscalonamentos(int escalonamentos) { this.escalonamentos = escalonamentos; }
    public int getCiclosNormais() { return ciclosNormais; }
    public void setCiclosNormais(int ciclosNormais) { this.ciclosNormais = ciclosNormais; }
}
