import { forwardRef } from 'react';
import { format } from 'date-fns';
import { businessInfo } from '@/data/mockData';

interface Order {
  id: string;
  dailyId?: string;
  total_amount: number;
  payment_method: string;
  status: string;
  created_at: string;
  customers?: { name: string };
}

interface DailySummaryProps {
  orders: Order[];
  date: Date;
}

const DailySummary = forwardRef<HTMLDivElement, DailySummaryProps>(({ orders, date }, ref) => {
  const completedOrders = orders.filter(o => o.status === 'completed');
  const totalSales = completedOrders.reduce((sum, o) => sum + Number(o.total_amount), 0);
  
  const salesByMethod = completedOrders.reduce((acc, o) => {
    const method = o.payment_method || 'unknown';
    acc[method] = (acc[method] || 0) + Number(o.total_amount);
    return acc;
  }, {} as Record<string, number>);

  return (
    <div 
      ref={ref} 
      className="receipt-print bg-white text-black p-4 font-mono text-[10px] mx-auto"
      style={{ width: '80mm' }}
    >
      {/* Header */}
      <div className="text-center mb-2">
        <h1 className="text-sm font-bold uppercase tracking-tight">Daily Sales Summary</h1>
        <h2 className="text-xs font-bold uppercase">{businessInfo.name}</h2>
        <p className="font-bold mt-1">{format(date, 'EEEE, dd MMMM yyyy')}</p>
      </div>

      <div className="border-t border-black my-2" />

      {/* Summary Stats */}
      <div className="space-y-1 mb-3 font-bold">
        <div className="flex justify-between">
          <span>TOTAL ORDERS:</span>
          <span>{completedOrders.length}</span>
        </div>
        <div className="flex justify-between text-sm border-t border-dotted border-black pt-1 mt-1">
          <span>TOTAL REVENUE:</span>
          <span>Rs {totalSales.toLocaleString()}</span>
        </div>
      </div>

      <div className="border-t border-dotted border-black my-2" />

      {/* Sales by Payment Method */}
      <div className="mb-3">
        <h2 className="font-bold border-b border-black mb-1 uppercase bg-gray-100 px-1 text-[9px]">Payment Methods</h2>
        <div className="px-1 space-y-1">
          {Object.entries(salesByMethod).map(([method, amount]) => (
            <div key={method} className="flex justify-between capitalize border-b border-dotted border-gray-200 py-0.5">
              <span>{method}:</span>
              <span className="font-bold">Rs {amount.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-dotted border-black my-2" />

      {/* Order List */}
      <div className="mb-3">
        <h2 className="font-bold border-b border-black mb-1 uppercase bg-gray-100 px-1 text-[9px]">Order Details</h2>
        <table className="w-full text-[9px]">
          <thead>
            <tr className="border-b border-dotted border-black">
              <th className="text-left py-1">ID</th>
              <th className="text-left py-1">Time</th>
              <th className="text-left py-1">Customer</th>
              <th className="text-right py-1">Amount</th>
            </tr>
          </thead>
          <tbody>
            {completedOrders.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).map((order) => (
              <tr key={order.id} className="border-b border-dotted border-gray-200">
                <td className="py-1">#{order.dailyId || order.id.slice(0, 4)}</td>
                <td className="py-1">{format(new Date(order.created_at), 'HH:mm')}</td>
                <td className="py-1 truncate max-w-[80px]">{order.customers?.name || 'Walk-in'}</td>
                <td className="text-right py-1 font-bold">Rs {Number(order.total_amount).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t-2 border-black mt-2 pt-1" />
      
      <div className="text-center mt-4 border-t border-dotted border-black pt-2 text-[9px] uppercase">
        <p className="font-bold">GEN XCLOUD POS - DAILY REPORT</p>
        <p>{format(new Date(), 'dd-MMM HH:mm:ss')}</p>
        <p className="mt-1 font-bold">Genai Nawabshah contact 923342826675</p>
      </div>

      <div className="text-center mt-4">
        <p>================================</p>
      </div>
    </div>
  );
});

DailySummary.displayName = 'DailySummary';

export default DailySummary;
