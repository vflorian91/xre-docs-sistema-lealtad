'use client';

import { UserRound } from 'lucide-react';
import { formatNumber } from '../../../lib/format';
import { ClienteResult, isActiveClient, levelBadgeClass } from './types';

export function ResultadosClienteTable({
  results,
  onSelect,
}: {
  results: ClienteResult[];
  onSelect: (client: ClienteResult) => void;
}) {
  return (
    <div className="canje-results">
      <span className="canje-results-title">Resultados de búsqueda</span>
      <table className="customer-records-table canje-results-table">
        <thead>
          <tr>
            <th>Cliente</th>
            <th>NIT</th>
            <th>Código cliente</th>
            <th>Nivel</th>
            <th>Estado</th>
            <th>Puntos disponibles</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          {results.map((client) => {
            const active = isActiveClient(client);
            return (
              <tr key={client.id}>
                <td>
                  <span className="canje-client-name"><span className="canje-client-avatar"><UserRound size={15} /></span>{client.fullName}</span>
                </td>
                <td>{client.taxId || '—'}</td>
                <td>{client.code}</td>
                <td><span className={levelBadgeClass(client.loyaltyLevel)}>{client.loyaltyLevel || 'Básico'}</span></td>
                <td><span className={`badge ${active ? 'green' : 'red'}`}>{active ? 'Activo' : 'Inactivo'}</span></td>
                <td><strong>{formatNumber(client.availablePoints)}</strong> puntos</td>
                <td>
                  <button
                    className="admin-secondary canje-select-btn"
                    disabled={!active}
                    title={active ? undefined : 'El cliente está inactivo y no puede realizar canjes.'}
                    onClick={() => onSelect(client)}
                    type="button"
                  >
                    Seleccionar
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="canje-results-hint">Se muestran coincidencias exactas y parciales. Selecciona un cliente activo para continuar.</p>
    </div>
  );
}
