import CatalogItemPage from '../../CatalogItemPage';
import { catalogConfigs } from '../../catalogConfigs';

export default async function MunicipioDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CatalogItemPage config={catalogConfigs.municipios} itemId={id} mode="view" />;
}
