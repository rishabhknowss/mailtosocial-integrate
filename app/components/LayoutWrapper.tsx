'use client';

import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { usePathname } from 'next/navigation';
import { shouldHideNavigation } from '../utils/navigationHelper';

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Check if navigation should be hidden for the current path
  const hideNavigation = shouldHideNavigation(pathname);
  
  return (
    <div className="min-h-screen">
      {!hideNavigation && <Navbar />}
      {!hideNavigation && <Sidebar />}
      <main className={!hideNavigation ? "pl-16" : ""}>
        {children}
      </main>
    </div>
  );
} 