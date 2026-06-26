import type { ReactNode } from 'react';
import { AppNav } from '@/components/layout/AppNav';
import '../calculator/calculator.css';

export default function SheetLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AppNav />
      {children}
    </>
  );
}
