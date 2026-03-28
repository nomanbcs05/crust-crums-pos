import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { toast } from 'sonner';
import { Loader2, ArrowRight } from 'lucide-react';

interface StartDayModalProps {
  isOpen: boolean;
  onSuccess: () => void;
  onClose?: () => void;
  forceNewSession?: boolean;
}

const StartDayModal = ({ isOpen, onSuccess, onClose, forceNewSession = false }: StartDayModalProps) => {
  const [amount, setAmount] = useState('');
  const [amountError, setAmountError] = useState('');
  const [date, setDate] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      setDate(`${yyyy}-${mm}-${dd}`); // Local date (YYYY-MM-DD) to avoid UTC shift
    }
  }, [isOpen]);

  const { data: openRegister, isLoading: isLoadingRegister } = useQuery({
    queryKey: ['open-register'],
    queryFn: api.registers.getOpen,
    enabled: isOpen,
  });

  const isSessionAlreadyOpen = !!openRegister && !forceNewSession;

  const startDayMutation = useMutation({
    mutationFn: async ({ amount, date }: { amount: number; date: string }) => {
      // If forcing a new session, we might want to close any existing open register first
      if (forceNewSession) {
        const openReg = await api.registers.getOpen();
        if (openReg) {
          await api.registers.close(openReg.id, 0, 'Automatically closed for new session');
        }
        // Clear history as requested
        await api.orders.deleteAllOrders();
      }
      
      // Convert date string to ISO string for the database
      const openedAt = new Date(date);
      openedAt.setHours(new Date().getHours(), new Date().getMinutes(), new Date().getSeconds());
      
      return api.registers.start(amount, openedAt.toISOString());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['open-register'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('New session started');
      onSuccess();
    },
    onError: (error) => {
      toast.error(`Failed to start day: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // If we are just continuing an existing session
    if (isSessionAlreadyOpen) {
      onSuccess();
      return;
    }

    const startAmount = parseFloat(amount);
    if (isNaN(startAmount) || amount.trim() === '' || startAmount <= 0) {
      setAmountError('Starting amount must be greater than zero');
      toast.error('Please enter a valid starting amount');
      return;
    }
    setAmountError('');
    startDayMutation.mutate({ amount: startAmount, date });
  };

  return (
    <Dialog open={isOpen}>
      <DialogContent 
        className="sm:max-w-md" 
        hideCloseButton={true}
        onPointerDownOutside={(e) => { e.preventDefault(); }}
        onEscapeKeyDown={(e) => { e.preventDefault(); }}
        aria-describedby="start-day-description"
      >
        {isLoadingRegister ? (
           <div className="flex flex-col items-center justify-center p-8 space-y-4">
              <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
              <p className="font-bold text-slate-500 animate-pulse">Checking session status...</p>
           </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-2">
              <DialogHeader className="flex-1">
                <DialogTitle className="text-2xl font-black font-heading uppercase tracking-tight text-slate-900">
                  {isSessionAlreadyOpen 
                    ? 'Session Already Open' 
                    : (forceNewSession ? 'Start New Session' : 'Start of Day')}
                </DialogTitle>
                <DialogDescription id="start-day-description" className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1.5 leading-relaxed">
                  {isSessionAlreadyOpen
                    ? `A shift is already active with an opening balance of Rs ${openRegister.starting_amount}` 
                    : (forceNewSession 
                      ? 'Starting a new session will clear existing order history.' 
                      : 'Please enter details to begin the shift.')}
                </DialogDescription>
              </DialogHeader>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8 mt-8">
              {!isSessionAlreadyOpen && (
                <>
                  <div className="space-y-3">
                    <Label htmlFor="date" className="text-[11px] font-black font-heading uppercase tracking-[0.2em] text-slate-500 ml-1">Date</Label>
                    <div className="relative">
                      <Input
                        id="date"
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        required
                        disabled // Make the date field static
                        className="h-14 rounded-2xl border-slate-200 bg-slate-50/50 px-5 font-bold text-slate-700 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-base"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="amount" className="text-[11px] font-black font-heading uppercase tracking-[0.2em] text-slate-500 ml-1">Opening Balance (Rs)</Label>
                    <div className="relative">
                      <Input
                        id="amount"
                        type="number"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        required
                        min={0}
                        className="h-14 rounded-2xl border-slate-200 bg-slate-50/50 px-5 font-black text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-xl"
                        aria-invalid={!!amountError}
                      />
                      {amountError && <div className="text-red-500 text-xs font-bold mt-1">{amountError}</div>}
                    </div>
                  </div>
                </>
              )}

              <Button 
                type="submit" 
                className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black font-heading uppercase tracking-[0.15em] shadow-xl shadow-blue-500/25 transition-all active:scale-[0.97] text-sm"
                disabled={startDayMutation.isPending}
              >
                {startDayMutation.isPending ? (
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Processing...</span>
                  </div>
                ) : (
                  isSessionAlreadyOpen ? (
                    <div className="flex justify-center items-center gap-2">
                       <span>Continue Session</span>
                       <ArrowRight className="h-5 w-5" />
                    </div>
                  ) : (
                    forceNewSession ? 'Start New Session' : 'Start Day'
                  )
                )}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default StartDayModal;
