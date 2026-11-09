export interface PingTxn { merchant: unknown; amount: unknown; currency: unknown; city?: unknown; cardLast4?: unknown }
export interface PingPreview { ok: boolean; errors: string[]; message: string | null; alert: string | null; foreign: boolean }

export function validatePingerTxn(t: unknown): string[];
export function previewPing(t: PingTxn): PingPreview;
