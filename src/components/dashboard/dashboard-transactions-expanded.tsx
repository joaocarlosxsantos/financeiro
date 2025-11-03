'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

interface ExpandedTransaction {
  id: string;
  originalId: string;
  description: string;
  amount: string;
  date: string;
  type: 'PUNCTUAL' | 'RECURRING';
  category: {
    id: string;
    name: string;
    color: string;
    icon?: string | null;
  } | null;
  wallet: {
    id: string;
    name: string;
    type: string;
  };
  tags: string[];
  paymentType: string;
  transferId: string | null;
  isRecurringExpanded: boolean;
  recurringInfo?: {
    dayOfMonth: number;
    originalStartDate: string | null;
    originalEndDate: string | null;
    occurrenceMonth: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface DashboardTransactionsExpandedProps {
  year: number;
  month: number;
  walletId?: string;
}


