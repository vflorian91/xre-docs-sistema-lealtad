import CatalogItemPage from '../../CatalogItemPage';
import { catalogConfigs } from '../../catalogConfigs';

export default function NuevoMunicipioPage() {
  return <CatalogItemPage config={catalogConfigs.municipios} mode="create" />;
}
