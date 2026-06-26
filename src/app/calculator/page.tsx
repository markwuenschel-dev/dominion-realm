import type { Metadata } from 'next';
import { DashboardShell } from '@/components/layout/DashboardShell';

export const metadata: Metadata = {
  title: 'Formula Calculator',
  description: 'Interactive calculator for the Dominion Realm LitRPG system.',
};

export default function CalculatorPage() {
  return <DashboardShell />;
}
