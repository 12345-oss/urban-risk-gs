package br.com.fiap.urbanrisk.api;

import br.com.fiap.urbanrisk.api.dto.ErroDTO;
import br.com.fiap.urbanrisk.service.NaoEncontradoException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice
public class TratamentoDeErros {

    @ExceptionHandler(NaoEncontradoException.class)
    public ResponseEntity<ErroDTO> naoEncontrado(NaoEncontradoException e) {
        return resposta(HttpStatus.NOT_FOUND, e.getMessage(), null);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErroDTO> validacao(MethodArgumentNotValidException e) {
        Map<String, String> campos = new LinkedHashMap<>();
        e.getBindingResult().getFieldErrors().forEach(f -> campos.put(f.getField(), f.getDefaultMessage()));
        return resposta(HttpStatus.BAD_REQUEST, "Dados inválidos", campos);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErroDTO> corpoInvalido(HttpMessageNotReadableException e) {
        return resposta(HttpStatus.BAD_REQUEST, "Corpo da requisição inválido (verifique os campos e valores permitidos)", null);
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ErroDTO> conflito(IllegalStateException e) {
        return resposta(HttpStatus.CONFLICT, e.getMessage(), null);
    }

    private static ResponseEntity<ErroDTO> resposta(HttpStatus status, String mensagem, Map<String, String> campos) {
        return ResponseEntity.status(status)
                .body(new ErroDTO(status.value(), status.getReasonPhrase(), mensagem, campos, Instant.now()));
    }
}
