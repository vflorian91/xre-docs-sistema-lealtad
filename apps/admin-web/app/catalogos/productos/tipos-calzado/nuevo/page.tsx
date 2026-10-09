import CatalogItemPage from '../../../CatalogItemPage';
import { catalogConfigs } from '../../../catalogConfigs';

export default function NuevoTipoCalzadoPage() {
  return <CatalogItemPage config={catalogConfigs.tiposCalzado} mode="create" />;
}
