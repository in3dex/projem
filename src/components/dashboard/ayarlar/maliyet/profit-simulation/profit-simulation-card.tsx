'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Calculator } from 'lucide-react';
import { GeneralCostSettingsData } from '@/hooks/use-general-cost-settings';
import { BaremPriceData } from '@/hooks/use-barem-rules';
import { ProfitSimulation } from './profit-simulation';

interface ProfitSimulationCardProps {
    settings: GeneralCostSettingsData;
    baremRules: BaremPriceData[];
}

export function ProfitSimulationCard({ settings, baremRules }: ProfitSimulationCardProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center">
                    <Calculator className="mr-2 h-5 w-5" /> Karlılık Simülasyonu
                </CardTitle>
                <CardDescription>
                    Ürün maliyeti, satış fiyatı ve diğer değişkenlere göre potansiyel kârınızı hesaplayın.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ProfitSimulation settings={settings} baremRules={baremRules} />
            </CardContent>
        </Card>
    );
} 