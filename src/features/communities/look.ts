import type { ThemeColors } from '../../theme';
import { Clock, Globe, LockSimple, Users, type Icon } from '../onboarding/icons';

// O valor de `type` é gravado no banco: NÃO alterar os nomes
export const typeLook = (c: ThemeColors, type?: string): { color: string; Glyph: Icon } => {
  if (type === 'Temporária') return { color: c.accent, Glyph: Clock };
  if (type === 'Internacional') return { color: c.info, Glyph: Globe };
  if (type === 'Privada') return { color: c.warning, Glyph: LockSimple };
  return { color: c.success, Glyph: Users };
};

// "#RRGGBB" -> fundo suave da mesma cor
export const soft = (hex: string, alpha = 0.14) => {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
};

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Comunidade temporária: "Termina em 12 out" / "Encerrada". */
export function endsLabel(iso?: string | null, now: Date = new Date()): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  if (d < now) return 'Encerrada';
  const day = d
    .toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', ...(d.getFullYear() === now.getFullYear() ? null : { year: 'numeric' }) })
    .replace('.', '');
  return `Termina em ${day}`;
}
