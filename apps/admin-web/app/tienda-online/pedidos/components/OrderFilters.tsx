'use client';

import { Search } from 'lucide-react';
import { FormEvent } from 'react';

export type OrderFiltersState = {
  search: string;
  orderStatus: string;
  clientPaymentStatus: string;
  paymentMethodRequested: string;
  dateFrom: string;
  dateTo: string;
};

export const initialOrderFilters: OrderFiltersState = {
  search: '',
  orderStatus: '',
  clientPaymentStatus: '',
  paymentMethodRequested: '',
  dateFrom: '',
  dateTo: '',
};

export default function OrderFilters({
  filters,
  onChange,
  onSubmit,
}: {
  filters: OrderFiltersState;
  onChange: (filters: OrderFiltersState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="customer-table-toolbar store-order-filter-toolbar" onSubmit={onSubmit}>
      <label className="customer-filter-field">
        <span>Cliente</span>
        <input
          onChange={(event) => onChange({ ...filters, search: event.target.value })}
          placeholder="Nombre del cliente"
          value={filters.search}
        />
      </label>
      <label className="customer-filter-field">
        <span>Metodo de pago</span>
        <select onChange={(event) => onChange({ ...filters, paymentMethodRequested: event.target.value })} value={filters.paymentMethodRequested}>
          <option value="">Todos</option>
          <option value="EFECTIVO_CONTRA_ENTREGA">Efectivo contra entrega</option>
          <option value="VISA_LINK_MANUAL">Visa Link</option>
          <option value="TRANSFERENCIA_BANCARIA">Transferencia bancaria</option>
          <option value="DEPOSITO_BANCARIO">Deposito bancario</option>
        </select>
      </label>
      <label className="customer-filter-field">
        <span>Estado de pago</span>
        <select onChange={(event) => onChange({ ...filters, clientPaymentStatus: event.target.value })} value={filters.clientPaymentStatus}>
          <option value="">Todos</option>
          <option value="PENDIENTE_PAGO">Pendiente de pago</option>
          <option value="PENDIENTE_LINK">Pendiente de link</option>
          <option value="LINK_ENVIADO">Link enviado</option>
          <option value="PAGO_CONFIRMADO">Pago confirmado</option>
          <option value="PAGO_RECHAZADO">Pago rechazado</option>
          <option value="NO_PAGADO">No pagado</option>
          <option value="ANULADO">Anulado</option>
        </select>
      </label>
      <label className="customer-filter-field">
        <span>Estado pedido</span>
        <select onChange={(event) => onChange({ ...filters, orderStatus: event.target.value })} value={filters.orderStatus}>
          <option value="">Todos</option>
          <option value="PEDIDO_SOLICITADO">Pedido solicitado</option>
          <option value="EN_REVISION">En revision</option>
          <option value="CONFIRMADO_ADMIN">Confirmado</option>
          <option value="REPROGRAMADO">Reprogramado</option>
          <option value="CANCELADO">Cancelado</option>
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
