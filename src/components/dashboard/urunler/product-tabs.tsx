'use client';

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ProductTabsProps {
  currentTab: string;
  onTabChange: (value: string) => void;
  tabCounts: {
    onSale?: number;
    approved?: number;
    notApproved?: number;
    archived?: number;
    rejected?: number;
    blacklisted?: number;
    all?: number;
  } | null;
  isLoading: boolean;
}

const TABS = [
  { value: 'onSale', label: 'Satıştakiler' },
  { value: 'approved', label: 'Onaylılar' },
  { value: 'notApproved', label: 'Onaysızlar' },
  { value: 'archived', label: 'Arşivlenmiş' },
  { value: 'rejected', label: 'Reddedilmiş' },
  { value: 'blacklisted', label: 'Kara Liste' },
  { value: 'all', label: 'Tümü' },
];

export function ProductTabs({ currentTab, onTabChange, tabCounts, isLoading }: ProductTabsProps) {
  return (
    <Tabs value={currentTab} onValueChange={onTabChange} className="mb-6">
      <TabsList className="grid w-full grid-cols-3 sm:grid-cols-4 md:grid-cols-7">
        {TABS.map((tab) => (
          <TabsTrigger 
            key={tab.value} 
            value={tab.value} 
            disabled={isLoading}
          >
            {tab.label} ({tabCounts?.[tab.value as keyof typeof tabCounts] ?? 0})
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
} 