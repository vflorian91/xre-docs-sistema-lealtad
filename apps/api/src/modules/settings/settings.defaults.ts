export const SETTING_KEYS = {
  points: 'POINTS',
  pointsToBalanceConversion: 'POINTS_TO_BALANCE_CONVERSION',
  purchaseReview: 'PURCHASE_REVIEW',
  redemptions: 'REDEMPTIONS',
  promotionalBalance: 'PROMOTIONAL_BALANCE',
} as const;

export type PointsSetting = {
  pointsPerCurrencyUnit: number;
  pointValueAmount: number;
  minimumPurchaseAmount: number;
  maxPointsPerPurchase: number | null;
  pointsExpirationDays: number | null;
  isEnabled: boolean;
};

export type PointsToBalanceConversionSetting = {
  points: number;
  amount: number;
  minimumPoints: number;
  isEnabled: boolean;
};

export type PurchaseReviewSetting = {
  isEnabled: boolean;
  amountThreshold: number | null;
  pointsThreshold: number | null;
};

export type RedemptionsSetting = {
  expirationDays: number;
};

export type PromotionalBalanceSetting = {
  maxUsePerPurchase: number | null;
};

type DefaultSettings = {
  [SETTING_KEYS.points]: PointsSetting;
  [SETTING_KEYS.pointsToBalanceConversion]: PointsToBalanceConversionSetting;
  [SETTING_KEYS.purchaseReview]: PurchaseReviewSetting;
  [SETTING_KEYS.redemptions]: RedemptionsSetting;
  [SETTING_KEYS.promotionalBalance]: PromotionalBalanceSetting;
};

export const DEFAULT_SETTINGS: DefaultSettings = {
  [SETTING_KEYS.points]: {
    pointsPerCurrencyUnit: 1,
    pointValueAmount: 0.01,
    minimumPurchaseAmount: 0,
    maxPointsPerPurchase: null,
    pointsExpirationDays: null,
    isEnabled: true,
  },
  [SETTING_KEYS.pointsToBalanceConversion]: {
    points: 100,
    amount: 1,
    minimumPoints: 100,
    isEnabled: true,
  },
  [SETTING_KEYS.purchaseReview]: {
    isEnabled: true,
    amountThreshold: 5000,
    pointsThreshold: 5000,
  },
  [SETTING_KEYS.redemptions]: {
    expirationDays: 30,
  },
  [SETTING_KEYS.promotionalBalance]: {
    maxUsePerPurchase: null as number | null,
  },
} as const;

export const SETTING_DESCRIPTIONS = {
  [SETTING_KEYS.points]: 'Regla operativa para calcular puntos por compras y vencimiento opcional.',
  [SETTING_KEYS.pointsToBalanceConversion]: 'Regla operativa para convertir puntos de clientes en saldo promocional.',
  [SETTING_KEYS.purchaseReview]: 'Reglas antifraude para enviar compras sensibles a revision antes de acreditar puntos.',
  [SETTING_KEYS.redemptions]: 'Reglas operativas para solicitudes y vencimientos de canjes.',
  [SETTING_KEYS.promotionalBalance]: 'Limites operativos para uso de saldo promocional en tienda.',
} as const;

export type SettingKey = keyof typeof DEFAULT_SETTINGS;
