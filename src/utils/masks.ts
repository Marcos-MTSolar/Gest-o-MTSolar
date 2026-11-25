/**
 * Utilitários puros de formatação/máscara de CPF, CNPJ e Telefone.
 * Comentários em português do Brasil conforme padrão do projeto.
 */

/** Remove todos os caracteres não numéricos de uma string. */
export function onlyDigits(value: string): string {
  return (value || '').replace(/\D/g, '');
}

/** Aplica máscara de CPF (000.000.000-00) limitada a 11 dígitos. */
export function maskCPF(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2');
}

/** Aplica máscara de CNPJ (00.000.000/0000-00) limitada a 14 dígitos. */
export function maskCNPJ(value: string): string {
  const digits = onlyDigits(value).slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\/\d{4})(\d{1,2})$/, '$1-$2');
}

/** Aplica máscara dinâmica de CPF (até 11 dígitos) ou CNPJ (12 a 14 dígitos). */
export function maskCpfCnpj(value: string): string {
  const digits = onlyDigits(value).slice(0, 14);
  return digits.length <= 11 ? maskCPF(digits) : maskCNPJ(digits);
}

/**
 * Aplica máscara de telefone brasileiro:
 * - (00) 00000-0000 para 11 dígitos
 * - (00) 0000-0000 para até 10 dígitos
 * Caso receba número salvo com DDI 55 (12 ou 13 dígitos), remove o 55 na exibição.
 */
export function maskPhone(value: string): string {
  let digits = onlyDigits(value);
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    digits = digits.slice(2);
  }
  digits = digits.slice(0, 11);

  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d{1,4})$/, '$1-$2');
  }

  return digits
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d{1,4})$/, '$1-$2');
}
