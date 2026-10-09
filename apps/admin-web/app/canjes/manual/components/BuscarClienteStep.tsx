'use client';

import { FormEvent } from 'react';
import { Search } from 'lucide-react';
import { ClienteResult } from './types';
import { ResultadosClienteTable } from './ResultadosClienteTable';

export function BuscarClienteStep({
  searchTerm,
  onSearchTermChange,
  onSearch,
  isSearching,
  results,
  hasSearched,
  errorMessage,
  onSelect,
}: {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  onSearch: () => void;
  isSearching: boolean;
  results: ClienteResult[];
  hasSearched: boolean;
  errorMessage: string | null;
  onSelect: (client: ClienteResult) => void;
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSearch();
  }

  return (
    <section className="canje-card canje-card-narrow">
      <header className="canje-card-head">
        <span className="canje-card-icon"><Search size={18} /></span>
        <div>
          <h2>Buscar cliente</h2>
          <p>Ingresa el NIT del cliente para obtener coincidencias exactas o parciales.</p>
        </div>
      </header>

      <form className="canje-search-form" onSubmit={submit}>
        <label className="canje-field">
          NIT del cliente
          <input
            autoFocus
            value={searchTerm}
            onChange={(event) => onSearchTermChange(event.target.value)}
            placeholder="Ej. 1234567-8"
          />
        </label>
        <button className="admin-primary canje-search-btn" disabled={isSearching} type="submit">
          <Search size={16} />
          {isSearching ? 'Buscando…' : 'Buscar'}
        </button>
      </form>

      {errorMessage ? <div className="form-error canje-inline-msg">{errorMessage}</div> : null}

      {hasSearched && !isSearching && results.length === 0 && !errorMessage ? (
        <div className="canje-empty">No se encontraron clientes con el NIT ingresado.</div>
      ) : null}

      {results.length > 0 ? <ResultadosClienteTable results={results} onSelect={onSelect} /> : null}
    </section>
  );
}
