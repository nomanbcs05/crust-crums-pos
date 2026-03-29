import { useState, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, startOfDay, endOfDay } from 'date-fns';
import { toast } from 'sonner';
import { useReactToPrint } from 'react-to-print';
import { api } from '@/services/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Printer, X, Trash2, Calendar } from 'lucide-react';
import { startOfWeek, startOfMonth } from 'date-fns';

const DEFAULT_RIDERS = ['Ayaz', 'Mumtaz', 'Abuzar', 'Zafar'];

const RiderDepositsPage = () => {
  const queryClient = useQueryClient();
  const [rider, setRider] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState<Date>(new Date());
  const [rangeFrom, setRangeFrom] = useState<Date>(startOfDay(new Date()));
  const [rangeTo, setRangeTo] = useState<Date>(endOfDay(new Date()));
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const { data: staffListStr } = useQuery({
    queryKey: ['settings', 'staff_list'],
    queryFn: () => api.settings.get('staff_list'),
  });

  const riders = useMemo(() => {
    if (!staffListStr) return DEFAULT_RIDERS;
    try {
      const parsed = JSON.parse(staffListStr);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((s: any) => s.name || s);
      }
    } catch (e) {
      console.error('Failed to parse staff list', e);
    }
    return DEFAULT_RIDERS;
  }, [staffListStr]);

  const { data: deposits = [], isLoading: isLoadingDeposits } = useQuery({
    queryKey: ['rider-deposits', rangeFrom.toISOString(), rangeTo.toISOString()],
    queryFn: () => api.riderDeposits.getRange(rangeFrom.toISOString(), rangeTo.toISOString()),
  });

  const { data: orders = [], isLoading: isLoadingOrders } = useQuery({
    queryKey: ['orders-range', rangeFrom.toISOString(), rangeTo.toISOString()],
    queryFn: () => api.orders.getByRange(rangeFrom.toISOString(), rangeTo.toISOString()),
  });

  const riderStats = useMemo(() => {
    const stats = new Map<string, { rider: string; deposits: number; deliveries: number; collected: number }>();
    
    // Initialize stats for all known riders
    riders.forEach(r => stats.set(r, { rider: r, deposits: 0, deliveries: 0, collected: 0 }));

    // Calculate deposits
    deposits.forEach(d => {
      const key = d.rider_name || 'Unknown';
      if (!stats.has(key)) stats.set(key, { rider: key, deposits: 0, deliveries: 0, collected: 0 });
      const current = stats.get(key)!;
      current.deposits += Number(d.amount || 0);
    });

    // Calculate deliveries from orders
    orders.forEach(o => {
      // Check for delivery type and existence of rider info
      // We look at rider_name column or nested rider object if it exists
      const riderName = o.rider_name || o.rider?.name;
      
      if (o.order_type === 'delivery' && riderName) {
        // Normalize name to match RIDERS array if possible (case-insensitive check)
        const normalizedKey = riders.find(r => r.toLowerCase() === riderName.toLowerCase()) || riderName;
        
        if (!stats.has(normalizedKey)) {
          stats.set(normalizedKey, { rider: normalizedKey, deposits: 0, deliveries: 0, collected: 0 });
        }
        
        const current = stats.get(normalizedKey)!;
        current.deliveries += 1;
        current.collected += Number(o.total_amount || 0);
      }
    });

    // Always return all main riders plus any others found in data
    return Array.from(stats.values());
  }, [deposits, orders, riders]);

  const totalAll = useMemo(() => {
    return riderStats.reduce((acc, s) => ({
      deposits: acc.deposits + s.deposits,
      deliveries: acc.deliveries + s.deliveries,
      collected: acc.collected + s.collected
    }), { deposits: 0, deliveries: 0, collected: 0 });
  }, [riderStats]);

  const createMutation = useMutation({
    mutationFn: () => api.riderDeposits.create({ rider_name: rider, amount: Number(amount), notes, received_at: date.toISOString() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rider-deposits'] });
      setAmount('');
      setNotes('');
      toast.success('Deposit saved');
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to save deposit'),
  });

  const clearDepositsMutation = useMutation({
    mutationFn: () => api.riderDeposits.clearRange(rangeFrom.toISOString(), rangeTo.toISOString()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rider-deposits'] });
      toast.success('Deposits cleared for this range');
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to clear deposits'),
  });

  const clearOrdersMutation = useMutation({
    mutationFn: () => api.orders.deleteTodayOrders(), // Using today's orders clear for now as it's the safest
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders-range'] });
      toast.success('Orders cleared for today');
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to clear orders'),
  });

  const setToday = () => {
    setRangeFrom(startOfDay(new Date()));
    setRangeTo(endOfDay(new Date()));
  };

  const setWeek = () => {
    setRangeFrom(startOfWeek(new Date(), { weekStartsOn: 1 }));
    setRangeTo(endOfDay(new Date()));
  };

  const setMonth = () => {
    setRangeFrom(startOfMonth(new Date()));
    setRangeTo(endOfDay(new Date()));
  };

  const { data: cashPrinterIP } = useQuery({
    queryKey: ['settings', 'cash_printer_ip'],
    queryFn: () => api.settings.get('cash_printer_ip'),
  });

  const getPrinterUrl = (endpoint: string) => {
    const ip = cashPrinterIP || localStorage.getItem('cash_printer_ip') || '192.168.1.151';
    return `http://${ip}:5000${endpoint}`;
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: "",
    onAfterPrint: () => {
      const htmlContent = printRef.current?.innerHTML || '';
      fetch(getPrinterUrl('/print/bill'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderNumber: 'DEPOSIT',
          html: htmlContent
        })
      }).catch(err => console.error("Local printing failed:", err));
      toast.success('Rider deposits printed');
      setShowPrintPreview(false);
    },
  });

  return (
    <MainLayout>
      <div className="flex flex-col h-full p-6 gap-6">
        <div className="flex items-end gap-3">
          <div className="flex flex-col">
            <label className="text-xs font-bold uppercase">Rider</label>
            <select value={rider} onChange={(e) => setRider(e.target.value)} className="border rounded-md h-10 px-3">
              <option value="">Select Rider</option>
              {riders.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-bold uppercase">Amount</label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-10" />
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-bold uppercase">Date/Time</label>
            <Input type="datetime-local" value={format(date, "yyyy-MM-dd'T'HH:mm")} onChange={(e) => setDate(new Date(e.target.value))} className="h-10" />
          </div>
          <div className="flex-1">
            <label className="text-xs font-bold uppercase">Notes</label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} className="h-10" />
          </div>
          <Button onClick={() => {
            if (!rider || !amount) { toast.error('Select rider and enter amount'); return; }
            createMutation.mutate();
          }}>Add Deposit</Button>
        </div>

        <Card className="p-4">
          <div className="flex flex-wrap items-end gap-3 mb-6">
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-md">
              <Button variant="ghost" size="sm" onClick={setToday} className={rangeFrom.getTime() === startOfDay(new Date()).getTime() ? 'bg-white shadow-sm' : ''}>Today</Button>
              <Button variant="ghost" size="sm" onClick={setWeek}>Week</Button>
              <Button variant="ghost" size="sm" onClick={setMonth}>Month</Button>
            </div>
            
            <Separator orientation="vertical" className="h-10" />

            <div>
              <label className="text-xs font-bold uppercase">From</label>
              <Input type="datetime-local" value={format(rangeFrom, "yyyy-MM-dd'T'HH:mm")} onChange={(e) => setRangeFrom(new Date(e.target.value))} className="h-10" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase">To</label>
              <Input type="datetime-local" value={format(rangeTo, "yyyy-MM-dd'T'HH:mm")} onChange={(e) => setRangeTo(new Date(e.target.value))} className="h-10" />
            </div>
            
            <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['rider-deposits'] })}>Refresh</Button>
            
            <Button onClick={() => setShowPrintPreview(true)} variant="outline">
              <Printer className="h-4 w-4 mr-2" />
              Print Summary
            </Button>

            <div className="flex-1" />

            <div className="flex gap-2">
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={() => {
                  if (confirm('Clear ALL delivery data for today?')) clearOrdersMutation.mutate();
                }}
                className="bg-red-50 text-red-600 hover:bg-red-100 border-red-200"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Data
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={() => {
                  if (confirm('Clear ALL deposits in this range?')) clearDepositsMutation.mutate();
                }}
                className="bg-red-50 text-red-600 hover:bg-red-100 border-red-200"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Deposits
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-bold mb-2">Deposits</h3>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Rider</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingDeposits ? null : deposits.map((d: any) => (
                      <TableRow key={d.id}>
                        <TableCell>{format(new Date(d.received_at), 'dd-MMM HH:mm')}</TableCell>
                        <TableCell>{d.rider_name}</TableCell>
                        <TableCell className="text-right">Rs {Number(d.amount).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
            <div>
              <h3 className="font-bold mb-2">Delivery Summary</h3>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rider Name</TableHead>
                      <TableHead className="text-right">Delivery Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {riderStats.map(s => (
                      <TableRow key={s.rider}>
                        <TableCell className="font-medium uppercase">{s.rider}</TableCell>
                        <TableCell className="text-right font-bold text-lg">{s.deliveries}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-slate-50 font-bold border-t-2">
                      <TableCell>TOTAL DELIVERIES</TableCell>
                      <TableCell className="text-right text-lg">{totalAll.deliveries}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          <div className="print-visible-offscreen">
            <div ref={printRef} className="receipt-print p-4 font-mono text-[11px] bg-white text-black" style={{ width: '80mm' }}>
              <div className="text-center font-bold mb-2 uppercase border-b border-black pb-1 text-[14px]">Rider Delivery Report</div>
              <div className="text-center text-[10px] mb-4">{format(rangeFrom, 'dd-MMM yyyy HH:mm')} - {format(rangeTo, 'dd-MMM yyyy HH:mm')}</div>
              
              <div className="space-y-1 mb-4">
                <div className="flex justify-between font-bold border-b border-black pb-1 text-[11px]">
                  <span>RIDER</span>
                  <span>DELIVERIES</span>
                </div>
                {riderStats.map(s => (
                  <div key={s.rider} className="flex justify-between py-2 border-b border-dotted border-gray-300 text-[12px]">
                    <span className="uppercase">{s.rider}</span>
                    <span className="font-bold">{s.deliveries}</span>
                  </div>
                ))}
                <div className="flex justify-between font-bold border-t-2 border-black mt-2 pt-2 text-[14px]">
                  <span>TOTAL</span>
                  <span>{totalAll.deliveries}</span>
                </div>
              </div>

              <div className="text-center text-[9px] mt-6 pt-2 border-t border-dotted border-black">
                <p>Printed on: {format(new Date(), 'dd-MMM-yy HH:mm')}</p>
                <p className="font-bold mt-1 uppercase">Genai Tech POS System</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Print Preview Dialog */}
      <Dialog open={showPrintPreview} onOpenChange={setShowPrintPreview}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delivery Summary Preview</DialogTitle>
            <DialogDescription className="sr-only">Preview of rider delivery counts</DialogDescription>
          </DialogHeader>
          
          <div className="max-h-[60vh] overflow-auto flex justify-center bg-slate-100 p-4 rounded-lg">
            <div ref={printRef} className="receipt-print p-4 font-mono text-[11px] bg-white text-black shadow-sm" style={{ width: '80mm' }}>
              <div className="text-center font-bold mb-2 uppercase border-b border-black pb-1 text-[14px]">Rider Delivery Report</div>
              <div className="text-center text-[10px] mb-4">{format(rangeFrom, 'dd-MMM yyyy HH:mm')} - {format(rangeTo, 'dd-MMM yyyy HH:mm')}</div>
              
              <div className="space-y-1 mb-4">
                <div className="flex justify-between font-bold border-b border-black pb-1 text-[11px]">
                  <span>RIDER</span>
                  <span>DELIVERIES</span>
                </div>
                {riderStats.map(s => (
                  <div key={s.rider} className="flex justify-between py-2 border-b border-dotted border-gray-300 text-[12px]">
                    <span className="uppercase">{s.rider}</span>
                    <span className="font-bold">{s.deliveries}</span>
                  </div>
                ))}
                <div className="flex justify-between font-bold border-t-2 border-black mt-2 pt-2 text-[14px]">
                  <span>TOTAL</span>
                  <span>{totalAll.deliveries}</span>
                </div>
              </div>

              <div className="text-center text-[9px] mt-6 pt-2 border-t border-dotted border-black">
                <p>Printed on: {format(new Date(), 'dd-MMM-yy HH:mm')}</p>
                <p className="font-bold mt-1 uppercase">Genai Tech POS System</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setShowPrintPreview(false)}>
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
            <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => handlePrint()}>
              <Printer className="h-4 w-4 mr-2" />
              Print to Thermal
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default RiderDepositsPage;

