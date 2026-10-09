import CatalogItemPage from '../../CatalogItemPage';
import { catalogConfigs } from '../../catalogConfigs';

export default async function MarcaDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CatalogItemPage config={catalogConfigs.marca} itemId={id} mode="view" />;
}
