import CatalogItemPage from '../../../CatalogItemPage';
import { catalogConfigs } from '../../../catalogConfigs';

export default async function EditarProductoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CatalogItemPage config={catalogConfigs.productos} itemId={id} mode="edit" />;
}
