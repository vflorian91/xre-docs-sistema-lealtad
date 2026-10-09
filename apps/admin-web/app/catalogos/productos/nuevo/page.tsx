import CatalogItemPage from '../../CatalogItemPage';
import { catalogConfigs } from '../../catalogConfigs';

export default function NuevoProductoPage() {
  return <CatalogItemPage config={catalogConfigs.productos} mode="create" />;
}
