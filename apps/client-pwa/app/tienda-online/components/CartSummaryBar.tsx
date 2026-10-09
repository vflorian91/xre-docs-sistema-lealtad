'use client';

import { formatStoreMoney } from '../lib/clientStoreApi';

type Props = {
  selectedBrands: number;
  selectedProducts: number;
  total: number;
  disabled: boolean;
  loading?: boolean;
  onContinue: () => void;
};

export default function CartSummaryBar({ selectedBrands, selectedProducts, total, disabled, loading, onContinue }: Props) {
  return (
    <div className="store-cart-bar">
      <div className="store-cart-bar-info">
        <div className="store-summary-row">
          <span>Marcas seleccionadas</span>
          <span>{selectedBrands}</span>
        </div>
        <div className="store-summary-row">
          <span>Productos seleccionados</span>
          <span>{selectedProducts}</span>
        </div>
        <div className="store-summary-row is-total">
          <span>Total seleccionado</span>
          <span>Q{formatStoreMoney(total)}</span>
        </div>
      </div>
      <p className="store-cart-bar-note">Los productos de marcas no seleccionadas permanecerán en tu carrito.</p>
      <button className="store-button-primary" disabled={disabled || loading} onClick={onContinue} type="button">
        {loading ? 'Procesando...' : 'Continuar'}
      </button>
    </div>
  );
}
