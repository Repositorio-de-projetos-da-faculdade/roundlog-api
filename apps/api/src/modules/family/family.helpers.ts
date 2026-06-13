// src/modules/family/family.helpers.ts

export interface TimelineEntry {
  date: string; // YYYY-MM-DD
  visits: number;
  updates: number;
}

/** Idade em anos completos a partir da data de nascimento. */
export function calcAge(dob: Date, now: Date = new Date()): number {
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) {
    age--;
  }
  return Math.max(0, age);
}

/**
 * Dias de internação: de admittedAt até dischargedAt (se houver) ou até agora.
 * Mínimo de 1 (dia da admissão conta).
 */
export function calcDaysAdmitted(
  admittedAt: Date,
  dischargedAt: Date | null,
  now: Date = new Date(),
): number {
  const end = dischargedAt ?? now;
  const ms = end.getTime() - admittedAt.getTime();
  return Math.max(1, Math.floor(ms / (1000 * 60 * 60 * 24)) + 1);
}

/** Chave de dia local no formato YYYY-MM-DD. */
function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Série temporal dos últimos `days` dias (incluindo hoje), com contagem de
 * visitas e atualizações por dia. Sempre retorna uma entrada por dia (zeros
 * preenchidos) para o gráfico ficar contínuo.
 */
export function buildTimeline(
  visitDates: Date[],
  updateDates: Date[],
  now: Date = new Date(),
  days = 14,
): TimelineEntry[] {
  const visitCounts = new Map<string, number>();
  const updateCounts = new Map<string, number>();

  for (const d of visitDates) {
    const k = dayKey(d);
    visitCounts.set(k, (visitCounts.get(k) ?? 0) + 1);
  }
  for (const d of updateDates) {
    const k = dayKey(d);
    updateCounts.set(k, (updateCounts.get(k) ?? 0) + 1);
  }

  const entries: TimelineEntry[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const k = dayKey(d);
    entries.push({
      date: k,
      visits: visitCounts.get(k) ?? 0,
      updates: updateCounts.get(k) ?? 0,
    });
  }
  return entries;
}
