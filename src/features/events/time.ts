export const DURATIONS = [1, 2, 3, 4, 6];

/** "HH:00" da próxima hora cheia. */
export const defaultStart = () => {
  const d = new Date();
  d.setHours(d.getHours() + 1);
  return `${String(d.getHours()).padStart(2, '0')}:00`;
};

/** "HH:MM" de uma data ISO, para preencher o campo de horário. */
export const clockInput = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/** "18:30" -> próxima ocorrência desse horário (hoje, ou amanhã se já passou). null se inválido. */
export function parseStart(input: string): Date | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(input.trim());
  if (!m) return null;
  const hours = Number(m[1]);
  const minutes = Number(m[2]);
  if (hours > 23 || minutes > 59) return null;
  const start = new Date();
  start.setHours(hours, minutes, 0, 0);
  if (start < new Date()) start.setDate(start.getDate() + 1);
  return start;
}

/** Formata o que a pessoa digita como HH:MM. */
export const formatClockInput = (text: string) => {
  const digits = text.replace(/[^0-9]/g, '').slice(0, 4);
  return digits.length >= 3 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits;
};
