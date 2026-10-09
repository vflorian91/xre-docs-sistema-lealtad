import BrandFormPage from '../../BrandFormPage';

export default async function EditarMarcaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BrandFormPage itemId={id} mode="edit" />;
}
