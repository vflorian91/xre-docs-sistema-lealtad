import CatalogItemPage from '../../CatalogItemPage';
import { catalogConfigs } from '../../catalogConfigs';

export default function NuevoPaisPage() {
  return <CatalogItemPage config={catalogConfigs.pais} mode="create" />;
}
