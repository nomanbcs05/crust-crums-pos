import { forwardRef } from 'react';
import { format } from 'date-fns';
import { CartItem, Customer } from '@/stores/cartStore';

interface Order {
  orderNumber: string;
  items: CartItem[];
  customer: Customer | null;
  orderType?: 'dine_in' | 'take_away' | 'delivery';
  createdAt: Date;
  cashierName: string;
  rider?: { name: string } | null;
}

interface KOTProps {
  order: Order;
  isDuplicate?: boolean;
}

const KOT = forwardRef<HTMLDivElement, KOTProps>(({ order, isDuplicate = false }, ref) => {
  const now = new Date();
  const dateStr = format(now, 'dd-MMM-yy');
  const timeStr = format(now, 'h:mm a');

  return (
    <div 
      ref={ref} 
      className="receipt-print bg-white text-black p-4 font-mono text-xs mx-auto"
      style={{ width: '80mm' }}
    >
      {/* Duplicate Badge */}
      {isDuplicate && (
        <div className="text-center mb-2">
          <div className="border-2 border-black font-black text-lg py-1 px-4 inline-block transform -rotate-2">
            *** DUPLICATE ***
          </div>
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-2">
        <p>------------------------------------------</p>
        <h1 className="text-lg font-bold">KOT ( KITCHEN )</h1>
        <p>------------------------------------------</p>
      </div>

      {/* Info Section - Matches Image 2 */}
      <div className="text-[12px] space-y-0.5 mb-2">
        <div className="flex justify-between">
          <span>Print DateTime :</span>
          <span>{dateStr}    {timeStr}</span>
        </div>
        <div className="flex justify-between">
          <span>Order Date :</span>
          <span>{format(order.createdAt, 'dd-MMM-yyyy')}</span>
        </div>
        <div className="flex justify-between">
          <span>Order #:</span>
          <span className="font-bold">{order.orderNumber}</span>
        </div>
        <div className="flex justify-between">
          <span>Order Type :</span>
          <span className="uppercase">{order.orderType?.replace('_', ' ') || 'TAKE AWAY'}</span>
        </div>
        <div className="flex justify-between">
          <span>Token #</span>
          <span className="font-bold">{order.orderNumber}</span>
        </div>
        <div className="flex justify-between">
          <span>Server:</span>
          <span>{order.cashierName || 'Self Customer'}</span>
        </div>
        <div className="mt-2 flex justify-between">
          <span>Customer :</span>
          <span className="uppercase">{order.customer?.name || ''}</span>
        </div>
        <div className="flex justify-between">
          <span>Mobile :</span>
          <span>{order.customer?.phone || ''}</span>
        </div>
      </div>

      <div className="border-t border-black my-1" />
      <div className="flex justify-between font-bold text-[12px] py-1 border-b border-black">
        <span className="w-12">QTY</span>
        <span className="flex-1">ITEM</span>
        <span className="w-16 text-right">CODE</span>
      </div>

      {/* Items */}
      <div className="mt-1 space-y-1">
        {order.items.map((rawItem, idx) => {
          const item: any = rawItem as any;
          const qty: number = item?.quantity ?? 1;
          const name: string =
            item?.product?.name ??
            item?.product_name ??
            item?.name ??
            'Item';
          const sku: string = item?.product?.sku || item?.sku || '';
          const key = item?.product?.id ?? `${idx}-${name}`;
          return (
            <div key={key} className="flex justify-between text-[13px] py-1 border-b border-dotted border-gray-300 last:border-0">
              <span className="w-12 font-bold">{qty}</span>
              <span className="flex-1 uppercase font-bold">{name}</span>
              <span className="w-16 text-right">{sku.substring(0, 8)}</span>
            </div>
          );
        })}
      </div>

      <div className="border-t border-black my-1" />
      
      {/* Footer Info - Matches Image 2 */}
      <div className="text-[12px] mt-2">
        <div className="flex justify-between">
          <span>COUNTER:</span>
          <span className="font-bold">CASH</span>
        </div>
        <div className="flex justify-between">
          <span>User:</span>
          <span className="font-bold uppercase">{order.cashierName || 'ANUS CASHIER'}</span>
        </div>
      </div>
    </div>
  );
});

KOT.displayName = 'KOT';

export default KOT;
