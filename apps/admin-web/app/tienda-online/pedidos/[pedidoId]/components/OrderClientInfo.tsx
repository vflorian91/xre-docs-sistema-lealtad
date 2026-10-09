type Customer = { fullName: string; phone: string; email?: string | null; code: string };

export default function OrderClientInfo({ customer }: { customer: Customer }) {
  return (
    <section className="order-detail-card">
      <h3>Datos del cliente</h3>
      <div className="order-detail-row"><span>Nombre</span><strong>{customer.fullName}</strong></div>
      <div className="order-detail-row"><span>Codigo</span><strong>{customer.code}</strong></div>
      <div className="order-detail-row"><span>Telefono</span><strong>{customer.phone}</strong></div>
      <div className="order-detail-row"><span>Correo</span><strong>{customer.email ?? 'No registrado'}</strong></div>
    </section>
  );
}
