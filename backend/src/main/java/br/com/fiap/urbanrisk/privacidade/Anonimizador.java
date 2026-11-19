package br.com.fiap.urbanrisk.privacidade;

import java.util.regex.Pattern;

/**
 * Remove dados pessoais que o morador possa ter digitado no texto do relato
 * (e-mail, telefone, CPF), em linha com a LGPD. O relato fica só com a
 * informação útil para o alerta.
 */
public final class Anonimizador {

    private static final Pattern EMAIL = Pattern.compile("[\\w.+-]+@[\\w-]+(\\.[\\w-]+)+");
    private static final Pattern CPF = Pattern.compile("\\b\\d{3}\\.?\\d{3}\\.?\\d{3}-?\\d{2}\\b");
    private static final Pattern TELEFONE = Pattern.compile("(\\+?55\\s?)?(\\(?\\d{2}\\)?\\s?)?9?\\d{4}[-\\s]?\\d{4}\\b");

    private Anonimizador() {
    }

    public static String anonimizar(String texto) {
        if (texto == null) return "";
        String limpo = texto.strip();
        limpo = EMAIL.matcher(limpo).replaceAll("[e-mail removido]");
        limpo = CPF.matcher(limpo).replaceAll("[documento removido]");
        limpo = TELEFONE.matcher(limpo).replaceAll("[telefone removido]");
        return limpo;
    }
}
