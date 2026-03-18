
import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";

export const LicenseGate = ({ children }: { children?: React.ReactNode }) => {
  // Standalone mode: always allow access
  return <>{children || <Outlet />}</>;
};
