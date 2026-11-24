export type PlanFeatures = {
  /** Feed vertical de vídeos no cardápio */
  videoFeed: boolean;
  /** A equipe Unlock monta e mantém o cardápio (fotos, vídeos 3D, preços) */
  managedByUnlock: boolean;
  /** Limite de produtos (0 = ilimitado) */
  maxProducts: number;
};

export const DEFAULT_FEATURES: PlanFeatures = { videoFeed: false, managedByUnlock: false, maxProducts: 0 };

export function parseFeatures(json: unknown): PlanFeatures {
  const f = (json && typeof json === "object" ? json : {}) as Record<string, unknown>;
  return {
    videoFeed: f.videoFeed === true,
    managedByUnlock: f.managedByUnlock === true,
    maxProducts: typeof f.maxProducts === "number" && f.maxProducts >= 0 ? Math.floor(f.maxProducts) : 0,
  };
}
