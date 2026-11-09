import type { ComponentType } from 'react';
import type { KitSlug } from '@/data/kit-slugs';
import { CardDemo, InterestDemo, SpendDemo } from '@/components/demos';
import { PingerDemo, SheetDemo, SwipeDemo } from '@/components/community-demos';
import { ReconciliationDemo, RecurringDemo, RunwayDemo } from '@/components/learning-demos';

// A catalogue kit without an entry here (or an entry for a non-catalogue slug) is a type error.
export const demoRegistry = {
  'interest-maximiser': InterestDemo,
  'spend-explorer': SpendDemo,
  'card-guard': CardDemo,
  'payment-pinger': PingerDemo,
  'card-to-sheet-sync': SheetDemo,
  'swipe-n-save': SwipeDemo,
  'cashflow-runway': RunwayDemo,
  'recurring-payment-detective': RecurringDemo,
  'who-paid': ReconciliationDemo,
} satisfies Record<KitSlug, ComponentType>;
