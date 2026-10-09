import { ShoppingBag, Star } from 'lucide-react';

export type DashboardTab = 'tienda-online' | 'lealtad-puntos';

type Props = {
  activeTab: DashboardTab;
  onChange: (tab: DashboardTab) => void;
};

export default function DashboardTabs({ activeTab, onChange }: Props) {
  return (
    <div className="split-dashboard-tabs" role="tablist" aria-label="Dashboards">
      <button className={activeTab === 'tienda-online' ? 'active' : ''} type="button" role="tab" aria-selected={activeTab === 'tienda-online'} onClick={() => onChange('tienda-online')}>
        <ShoppingBag size={20} aria-hidden="true" />
        Tienda online
      </button>
      <button className={activeTab === 'lealtad-puntos' ? 'active' : ''} type="button" role="tab" aria-selected={activeTab === 'lealtad-puntos'} onClick={() => onChange('lealtad-puntos')}>
        <Star size={20} aria-hidden="true" />
        Lealtad y puntos
      </button>
    </div>
  );
}
