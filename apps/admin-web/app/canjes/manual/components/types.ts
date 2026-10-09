export type ClienteResult = {
  id: string;
  code: string;
  fullName: string;
  taxId?: string | null;
  email?: string | null;
  phone: string;
  status: 'ACTIVE' | 'INACTIVE' | string;
  loyaltyLevel?: string | null;
  availablePoints: number;
  registrationStore?: { id: string; code: string; name: string } | null;
  createdAt?: string | null;
  lastRedemptionAt?: string | null;
};

export type RedeemResult = {
  customerId: string;
  pointMovementId: string;
  pointsRedeemed: number;
  availablePoints: number;
};

export type SuccessData = {
  movementCode: string;
  cliente: ClienteResult;
  pointsRedeemed: number;
  remainingPoints: number;
  amount: number;
  reason: string;
  performedBy: string;
  appliedAt: string;
};

export type WizardStep = 1 | 2 | 3 | 4;

export function isActiveClient(client: Pick<ClienteResult, 'status'>) {
  return client.status === 'ACTIVE';
}

/** Convierte un id interno en una referencia legible de 4 letras + 6 dígitos. */
export function movementReference(id?: string | null) {
  if (!id) return 'No registrado';
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let h1 = 0;
  let h2 = 0;
  for (let i = 0; i < id.length; i += 1) {
    const c = id.charCodeAt(i);
    h1 = (h1 * 31 + c) >>> 0;
    h2 = (h2 * 131 + c + 7) >>> 0;
  }
  let letterPart = '';
  let n = h1;
  for (let i = 0; i < 4; i += 1) {
    letterPart += letters[n % letters.length];
    n = Math.floor(n / letters.length);
  }
  return `${letterPart}${(h2 % 1000000).toString().padStart(6, '0')}`;
}

export function levelBadgeClass(level?: string | null) {
  const normalized = (level || '').toLowerCase();
  if (normalized.includes('oro')) return 'canje-level-badge gold';
  if (normalized.includes('plata')) return 'canje-level-badge silver';
  if (normalized.includes('bronce')) return 'canje-level-badge bronze';
  return 'canje-level-badge basic';
}
