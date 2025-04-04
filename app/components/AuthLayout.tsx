import { ReactNode } from 'react';

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-200 to-slate-400 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-xl">
        {children}
      </div>
    </div>
  );
} 