import type { Metadata } from 'next';
import { CharacterSheetShell } from '@/components/sheet/CharacterSheetShell';

export const metadata: Metadata = {
  title: 'Stat Sheet — Dominion Realm',
};

export default function SheetPage() {
  return <CharacterSheetShell />;
}
