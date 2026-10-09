import BannerFormPage from '../../../banners/BannerFormPage';

export default function NuevoStoreBannerPage() {
  return (
    <BannerFormPage
      basePath="/tienda-online/banners"
      mode="create"
      placement="STORE"
      shellTitle="Tienda Online"
      showAudience={false}
    />
  );
}
