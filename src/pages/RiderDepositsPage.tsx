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

const RIDERS = ['Ayaz', 'Mumtaz', 'Abuzar', 'Zafar'];

const RiderDepositsPage = () => {
  const queryClient = useQueryClient();
  const [rider, setRider] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState<Date>(new Date());
  const [rangeFrom, setRangeFrom] = useState<Date>(startOfDay(new Date()));
  const [rangeTo, setRangeTo] = useState<Date>(endOfDay(new Date()));
  const printRef = useRef<HTMLDivElement>(null);

  const { data: deposits = [], isLoading } = useQuery({
    queryKey: ['rider-deposits', rangeFrom.toISOString(), rangeTo.toISOString()],
    queryFn: () => api.riderDeposits.getRange(rangeFrom.toISOString(), rangeTo.toISOString()),
  });

  const totalByRider = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of deposits) {
      const key = d.rider_name || 'Unknown';
      map.set(key, (map.get(key) || 0) + Number(d.amount || 0));
    }
    return Array.from(map.entries()).map(([r, t]) => ({ rider: r, total: t }));
  }, [deposits]);

  const totalAll = useMemo(() => totalByRider.reduce((s, r) => s + r.total, 0), [totalByRider]);

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

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Rider-Deposits-${format(rangeFrom, 'yyyy-MM-dd')}`,
    onAfterPrint: () => toast.success('Rider deposits printed'),
  });

  return (
    <MainLayout>
      <div className="flex flex-col h-full p-6 gap-6">
        <div className="flex items-end gap-3">
          <div className="flex flex-col">
            <label className="text-xs font-bold uppercase">Rider</label>
            <select value={rider} onChange={(e) => setRider(e.target.value)} className="border rounded-md h-10 px-3">
              <option value="">Select Rider</option>
              {RIDERS.map(r => <option key={r} value={r}>{r}</option>)}
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
          <div className="flex items-end gap-3 mb-4">
            <div>
              <label className="text-xs font-bold uppercase">From</label>
              <Input type="datetime-local" value={format(rangeFrom, "yyyy-MM-dd'T'HH:mm")} onChange={(e) => setRangeFrom(new Date(e.target.value))} className="h-10" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase">To</label>
              <Input type="datetime-local" value={format(rangeTo, "yyyy-MM-dd'T'HH:mm")} onChange={(e) => setRangeTo(new Date(e.target.value))} className="h-10" />
            </div>
            <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['rider-deposits'] })}>Refresh</Button>
            <Button onClick={() => handlePrint()} variant="outline">Print Summary</Button>
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
                    {isLoading ? null : deposits.map((d: any) => (
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
              <h3 className="font-bold mb-2">Summary</h3>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rider</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {totalByRider.map(r => (
                      <TableRow key={r.rider}>
                        <TableCell>{r.rider}</TableCell>
                        <TableCell className="text-right">Rs {r.total.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell className="font-bold">Grand Total</TableCell>
                      <TableCell className="text-right font-bold">Rs {totalAll.toLocaleString()}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          <div className="print-visible-offscreen">
            <div ref={printRef} className="p-4 font-mono text-[11px]" style={{ width: '80mm' }}>
              <div className="text-center font-bold mb-2 uppercase">Rider Deposits</div>
              <div className="text-center text-[10px] mb-2">{format(rangeFrom, 'dd-MMM yyyy HH:mm')} - {format(rangeTo, 'dd-MMM yyyy HH:mm')}</div>
              <div className="border-b pb-1 mb-2">
                {totalByRider.map(r => (
                  <div key={r.rider} className="flex justify-between">
                    <span>{r.rider}</span>
                    <span>Rs {r.total.toLocaleString()}</span>
                  </div>
                ))}
                <div className="flex justify-between font-bold border-t mt-1 pt-1">
                  <span>Total</span>
                  <span>Rs {totalAll.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
};

export default RiderDepositsPage;

