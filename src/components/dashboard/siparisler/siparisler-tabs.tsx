import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ORDER_STATUS_TABS } from "./constants"; // Sabitleri import et

interface SiparislerTabsProps {
  durum: string;
  toplamSiparis: number;
  durumSayilari: Record<string, number>;
  handleDurumChange: (value: string) => void;
}

export function SiparislerTabs({
  durum,
  toplamSiparis,
  durumSayilari,
  handleDurumChange,
}: SiparislerTabsProps) {
  return (
    <Tabs value={durum} onValueChange={handleDurumChange} className="w-full">
      <TabsList className="grid w-full grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-8 gap-1 h-auto flex-wrap">
        {ORDER_STATUS_TABS.map((tab) => {
          const count = tab.value === 'all' ? toplamSiparis : durumSayilari[tab.value] ?? 0;
          const label = tab.label;
          return (
            <TabsTrigger 
              key={tab.value} 
              value={tab.value} 
              className="whitespace-nowrap px-2 py-1.5 text-xs sm:text-sm flex-grow justify-center"
            >
              {label} {count > 0 && <Badge variant="secondary" className="ml-1.5">{count}</Badge>}
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
} 