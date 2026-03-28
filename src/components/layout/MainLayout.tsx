import { ReactNode, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import AppSidebar from './AppSidebar';
import StartDayModal from '@/components/pos/StartDayModal';

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
  const [showStartDayModal, setShowStartDayModal] = useState(false);
  const [forceStartSession, setForceStartSession] = useState(false);
  const navigate = useNavigate();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar_collapsed');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', isSidebarCollapsed.toString());
  }, [isSidebarCollapsed]);

  // Check for an open register
  const { data: openRegister, isLoading } = useQuery({
    queryKey: ['open-register'],
    queryFn: api.registers.getOpen,
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  useEffect(() => {
    const role = (typeof window !== 'undefined' && localStorage.getItem('active_role')) || '';
    const username = (typeof window !== 'undefined' && localStorage.getItem('pos_local_user')) || '';
    
    // Strictly show StartDayModal for cashier and hashir roles if no open register
    // This is mandatory and unclosable until an amount is entered.
    const isCashier = role === 'cashier' || role === 'cashier2';
    const isHashir = username.trim().toLowerCase() === 'hashir';

    if (!isLoading && openRegister === null && (isCashier || isHashir)) {
      setForceStartSession(true);
      setShowStartDayModal(true);
    } else {
      setForceStartSession(false);
      setShowStartDayModal(false);
    }
  }, [openRegister, isLoading]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <AppSidebar isCollapsed={isSidebarCollapsed} onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
      
      <StartDayModal 
        isOpen={showStartDayModal} 
        onSuccess={() => {
          setShowStartDayModal(false);
          navigate('/');
        }} 
        onClose={forceStartSession ? undefined : () => setShowStartDayModal(false)}
        forceNewSession={forceStartSession}
      />
    </div>
  );
};

export default MainLayout;
