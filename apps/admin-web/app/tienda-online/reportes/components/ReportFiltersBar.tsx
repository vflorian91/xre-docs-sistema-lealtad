'use client';

import { Download, Search } from 'lucide-react';
import { FormEvent, ReactNode } from 'react';

export default function ReportFiltersBar({
  children,
  onSubmit,
  onExport,
  isExporting,
  canExport,
}: {
  children: ReactNode;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onExport?: () => void;
  isExporting?: boolean;
  canExport?: boolean;
}) {
  return (
    <form className="report-generator-form" onSubmit={onSubmit}>
      {children}
      <button className="admin-primary report-generator-submit" type="submit">
        <Search size={16} /> Consultar
      </button>
      {canExport && onExport ? (
        <button className="admin-secondary" disabled={isExporting} onClick={onExport} type="button">
          <Download size={16} /> {isExporting ? 'Exportando...' : 'Exportar'}
        </button>
      ) : null}
    </form>
  );
}
