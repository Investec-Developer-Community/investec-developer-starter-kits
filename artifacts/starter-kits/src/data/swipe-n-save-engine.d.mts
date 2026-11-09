export interface SwipeResult { ok: boolean; errors: string[]; saving: number; excluded: boolean; reason: string }
export interface SwipeSim { ok: boolean; error: string | null; results: { txn: Record<string, unknown>; result: SwipeResult }[]; total: number }

export function validatePercent(p: unknown): string | null;
export function swipeSaving(t: unknown, pct: number): SwipeResult;
export function simulateSwipe(txns: unknown[], pct: number): SwipeSim;
