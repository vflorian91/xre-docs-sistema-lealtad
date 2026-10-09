import CatalogItemPage from '../../CatalogItemPage';
import { catalogConfigs } from '../../catalogConfigs';

export default function NuevoDepartamentoPage() {
  return <CatalogItemPage config={catalogConfigs.departamentos} mode="create" />;
}
