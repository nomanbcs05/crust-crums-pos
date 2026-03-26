import { forwardRef, useState } from 'react';
import { format } from 'date-fns';
import { businessInfo } from '@/data/mockData';
import { CartItem, Customer } from '@/stores/cartStore';

interface Order {
  orderNumber: string;
  items: CartItem[];
  customer: Customer | null;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  deliveryFee?: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'wallet';
  orderType?: 'dine_in' | 'take_away' | 'delivery';
  createdAt: Date;
  cashierName: string;
  serverName?: string | null;
  rider?: { name: string } | null;
  customerAddress?: string | null;
  tableId?: number | null;
}

interface ReceiptProps {
  order: Order;
}

const Receipt = forwardRef<HTMLDivElement, ReceiptProps>(({ order }, ref) => {
  const [logoError, setLogoError] = useState(false);

  const logoSrc = `/logo.jpeg?v=${Date.now()}`;
  const name = businessInfo.name;
  const address = businessInfo.address;
  const city = businessInfo.city;
  const phone = businessInfo.phone;
  const receiptFooter = '!!!!FOR THE LOVE OF FOOD!!!!';
  const poweredByFooter = 'Powered By: GENAI TECHNOLOGY +923342826675';

  return (
    <div
      ref={ref}
      className="receipt-print bg-white text-black p-2 font-mono text-[12px] leading-tight mx-auto"
      style={{ width: '80mm' }}
    >
      {/* Header */}
      <div className="text-center mb-1">
        {!logoError ? (
          <img
            src={logoSrc}
            alt="Logo"
            className="mx-auto mb-1 object-contain h-20 max-w-[150px] w-auto"
            onError={() => setLogoError(true)}
          />
        ) : (
          <div className="border-2 border-dashed border-gray-400 rounded-[50%] w-24 h-16 mx-auto flex items-center justify-center mb-1 transform rotate-[-5deg]">
            <h1 className="text-lg font-bold italic font-serif">Genai</h1>
          </div>
        )}
      </div>

      {/* Address Box */}
      <div className="border border-black p-1 text-center mb-1 text-[11px]">
        <p>{address}</p>
        <p>{city}</p>
        {phone && (
          <>
            <p className="font-bold">{phone.split(',')[0]}</p>
            {phone.split(',')[1] && (
              <p className="font-bold">{phone.split(',')[1]}</p>
            )}
          </>
        )}
        <p className="text-[10px] mt-1 border-t border-dotted border-black pt-1">
          Designed & Developed By Genai Tech
        </p>
      </div>

      {/* Order Number Box */}
      <div className="border-x border-t border-black p-1 text-center">
        <div className="text-[26px] font-bold">{order.orderNumber}</div>
      </div>

      {/* Info Section */}
      <div className="border border-black p-1 text-[12px]">
        <div className="flex justify-between">
          <span>Invoice #:</span>
          <span className="font-bold">{order.orderNumber}</span>
        </div>
        <div className="flex justify-between mt-1">
          <span>Restaurant:</span>
          <span className="font-bold uppercase">{name}</span>
        </div>
        <div className="flex justify-between mt-1">
          <span className="font-bold uppercase">{order.cashierName} CASHIER / CASH</span>
          <span className="uppercase">{order.orderType?.replace('_', ' ') || 'TAKE AWAY'}</span>
        </div>
        <div className="flex justify-between mt-1">
          <span>{format(order.createdAt, 'dd-MMM-yy')}</span>
          <span>{format(order.createdAt, 'h:mm a')}</span>
        </div>

        <div className="flex justify-between mt-1 border-t border-dotted border-black pt-1">
          <span className="font-bold">Server:</span>
          <span className="font-bold uppercase">{order.serverName || 'Self Customer'}</span>
        </div>

        {order.customer && (
          <div className="mt-1">
            <div className="flex justify-between">
              <span>Customer :</span>
              <span className="uppercase">{order.customer.name}</span>
            </div>
          </div>
        )}
      </div>

      {/* Items Table */}
      <div className="border-x border-b border-black">
        <table className="w-full table-fixed text-[12px]">
          <thead>
            <tr className="border-b border-black bg-gray-100">
              <th className="text-left py-1 pl-1 w-8">Qty</th>
              <th className="text-left py-1">Item</th>
              <th className="text-right py-1 w-12">Rate</th>
              <th className="text-right py-1 pr-1 w-14">Amount</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.product.id}>
                <td className="py-1 pl-1 align-top">{item.quantity}</td>
                <td className="py-1 align-top uppercase break-words">
                  {item.product.name}
                </td>
                <td className="text-right py-1 align-top font-bold">{Number(item.product.price).toLocaleString()}</td>
                <td className="text-right py-1 pr-1 align-top font-bold">{Number(item.lineTotal).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="border-x border-b border-black p-1 text-[13px]">
        <div className="flex justify-between">
          <span>SubTotal :</span>
          <span className="font-bold">{Number(order.subtotal).toLocaleString()}</span>
        </div>
        <div className="flex justify-between font-bold text-[18px] mt-1 bg-gray-100 p-1">
          <span>Net Bill :</span>
          <span>{Number(order.total).toLocaleString()}</span>
        </div>
        <div className="flex justify-between mt-1">
          <span>Payment Mode :</span>
          <span className="font-bold uppercase">{order.paymentMethod}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="border border-black mt-1 p-2 text-center text-[11px]">
        <p>{receiptFooter}</p>
        <p className="font-bold mt-1">{poweredByFooter}</p>
      </div>
    </div>
  );
});

Receipt.displayName = 'Receipt';

export default Receipt;
