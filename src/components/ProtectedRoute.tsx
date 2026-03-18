
import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  // No SaaS/multi-tenant logic needed
  return <>{children}</>;
};

export default ProtectedRoute;
