import ClientHomePage from './page';
import type { ClientView } from './page';

type ClientRouteOptions = {
  initialProfileSection?: 'menu' | 'personal' | 'address' | 'redemptions' | 'redemptionDetail' | 'purchases' | 'password';
};

export function createClientRoute(initialView: ClientView, options: ClientRouteOptions = {}) {
  return function ClientRoutePage() {
    return <ClientHomePage initialView={initialView} initialProfileSection={options.initialProfileSection} />;
  };
}
