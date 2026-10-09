import { formatMoney, formatNumber } from '../../../../lib/format';

type OrderItem = {
  id: string;
  brandName: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
};

export default function OrderProductsTable({
  items,
  subtotalAmount,
  shippingAmount,
  totalAmount,
}: {
  items: OrderItem[];
  subtotalAmount: number;
  shippingAmount: number;
  totalAmount: number;
}) {
  return (
    <section className="order-detail-card full-width">
      <h3>Productos solicitados</h3>
      <table className="order-items-table">
        <thead>
          <tr>
            <th>Marca</th>
            <th>Producto</th>
            <th>Cantidad</th>
            <th>Precio unitario</th>
            <th>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{item.brandName}</td>
              <td>{item.productName}</td>
              <td>{formatNumber(item.quantity)}</td>
              <td>Q{formatMoney(item.unitPrice)}</td>
              <td>Q{formatMoney(item.subtotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="order-detail-row"><span>Subtotal</span><strong>Q{formatMoney(subtotalAmount)}</strong></div>
      <div className="order-detail-row"><span>Envio</span><strong>Q{formatMoney(shippingAmount)}</strong></div>
      <div className="order-detail-row"><span>Total</span><strong>Q{formatMoney(totalAmount)}</strong></div>
    </section>
  );
}
