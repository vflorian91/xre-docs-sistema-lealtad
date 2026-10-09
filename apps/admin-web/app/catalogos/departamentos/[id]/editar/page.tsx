import CatalogItemPage from '../../../CatalogItemPage';
import { catalogConfigs } from '../../../catalogConfigs';

export default async function EditarDepartamentoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CatalogItemPage config={catalogConfigs.departamentos} itemId={id} mode="edit" />;
}
