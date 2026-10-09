'use client';

import { Search } from 'lucide-react';
import { FormEvent } from 'react';

export type PendingFiltersState = {
  search: string;
  paymentMethod: string;
  dateFrom: string;
  dateTo: string;
};

export const initialPendingFilters: PendingFiltersState = {
  search: '',
  paymentMethod: '',
  dateFrom: '',
  dateTo: '',
};

export default function PendingPaymentsFilters({
  filters,
  onChange,
  onSubmit,
}: {
  filters: PendingFiltersState;
  onChange: (filters: PendingFiltersState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="customer-table-toolbar" onSubmit={onSubmit}>
      <label className="customer-filter-field">
        <span>Buscar</span>
        <input
          onChange={(event) => onChange({ ...filters, search: event.target.value })}
          placeholder="Pedido, cliente o referencia"
          value={filters.search}
        />
      </label>
      <label className="customer-filter-field">
        <span>Metodo de pago</span>
        <select onChange={(event) => onChange({ ...filters, paymentMethod: event.target.value })} value={filters.paymentMethod}>
          <option value="">Todos</option>
          <option value="EFECTIVO_CONTRA_ENTREGA">Efectivo contra entrega</option>
          <option value="VISA_LINK_MANUAL">Visa Link</option>
          <option value="TRANSFERENCIA_BANCARIA">Transferencia bancaria</option>
          <option value="DEPOSITO_BANCARIO">Deposito bancario</option>
        </select>
      </label>
      <label className="customer-filter-field">
        <span>Desde</span>
        <input onChange={(event) => onChange({ ...filters, dateFrom: event.target.value })} type="date" value={filters.dateFrom} />
      </label>
      <label className="customer-filter-field">
        <span>Hasta</span>
        <input onChange={(event) => onChange({ ...filters, dateTo: event.target.value })} type="date" value={filters.dateTo} />
      </label>
      <button className="admin-primary customer-filter-submit table-filter-search-button" type="submit">
        <Search size={16} /> Buscar
      </button>
    </form>
  );
}
