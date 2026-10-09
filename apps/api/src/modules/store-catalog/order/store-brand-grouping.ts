/**
 * Fase 5 — Agrupación lógica por marca.
 *
 * No crea subpedidos ni pagos por marca: solo agrupa ítems (de carrito o de pedido)
 * por su marca para las respuestas de API. Es aditivo; la lista plana de ítems se conserva.
 */

export type BrandGroupableItem = {
  brandId: string | null;
  brandName: string | null;
  brandLogoUrl?: string | null;
  subtotal: number;
  quantity: number;
};

export type BrandGroup<TItem> = {
  brandId: string;
  brandName: string;
  brandLogoUrl: string | null;
  items: TItem[];
  subtotal: number;
  totalItems: number;
};

const NO_BRAND_ID = 'SIN_MARCA';
const NO_BRAND_NAME = 'Sin marca';

/**
 * Agrupa una lista de ítems por marca. Los pedidos/ítems viejos sin marca caen en
 * un grupo "Sin marca" para no romper la respuesta.
 */
export function groupItemsByBrand<TItem extends BrandGroupableItem>(items: TItem[]): BrandGroup<TItem>[] {
  const groups = new Map<string, BrandGroup<TItem>>();

  for (const item of items) {
    const brandId = item.brandId ?? NO_BRAND_ID;
    const brandName = item.brandName ?? NO_BRAND_NAME;
    let group = groups.get(brandId);
    if (!group) {
      group = {
        brandId,
        brandName,
        brandLogoUrl: item.brandLogoUrl ?? null,
        items: [],
        subtotal: 0,
        totalItems: 0,
      };
      groups.set(brandId, group);
    }
    group.items.push(item);
    group.subtotal += item.subtotal;
    group.totalItems += item.quantity;
  }

  return [...groups.values()];
}
