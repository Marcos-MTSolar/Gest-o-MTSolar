/**
 * Utilitários centralizados para manipulação de datas no fuso horário America/Recife (UTC-3).
 * Garante consistência TOTAL entre frontend e backend.
 */

/**
 * Retorna a data no formato YYYY-MM-DD no fuso America/Recife.
 */
export function getRecifeDateStr(dateInput: Date | string | number = new Date()): string {
  try {
    const d = typeof dateInput === 'object' ? dateInput : new Date(dateInput);
    if (isNaN(d.getTime())) return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Recife' });
    return d.toLocaleDateString('sv-SE', { timeZone: 'America/Recife' });
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

/**
 * Retorna os limites ISO de início (00:00:00.000-03:00) e fim (23:59:59.999-03:00) do dia em America/Recife.
 */
export function getRecifeDayBounds(dateInput: Date | string | number = new Date()) {
  const recifeDateStr = getRecifeDateStr(dateInput);
  const todayStart = new Date(`${recifeDateStr}T00:00:00.000-03:00`).toISOString();
  const todayEnd = new Date(`${recifeDateStr}T23:59:59.999-03:00`).toISOString();
  return { recifeDateStr, todayStart, todayEnd };
}

/**
 * Retorna o valor numérico da hora atual em America/Recife (ex: 14.5 para 14:30).
 */
export function getRecifeTimeVal(dateInput: Date | string | number = new Date()) {
  try {
    const d = typeof dateInput === 'object' ? dateInput : new Date(dateInput);
    const timeStr = d.toLocaleTimeString('pt-BR', {
      timeZone: 'America/Recife',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    });
    const [h, m] = timeStr.split(':').map(Number);
    return { currentHour: h, currentMinute: m, currentTimeVal: h + (m / 60) };
  } catch {
    const d = new Date();
    return { currentHour: d.getHours(), currentMinute: d.getMinutes(), currentTimeVal: d.getHours() + (d.getMinutes() / 60) };
  }
}
