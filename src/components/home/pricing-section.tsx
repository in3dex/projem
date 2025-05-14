"use server";

import { Check } from "lucide-react";
import Link from "next/link";
import { db as prisma } from "@/lib/db"; 
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { StartSubscriptionButton } from "@/components/fiyatlandirma/start-subscription-button";
import { Plan } from "@prisma/client";

// Planlara dair tiplemeler
type PlanFeature = string;

// Plan tipini genişlet
type PlanWithCurrency = Plan & {
  currency?: string;
};

// Anasayfa Fiyatlandırma Bölümü
export async function HomePricingSection() {
  let plans: PlanWithCurrency[] = []; // Tipi PlanWithCurrency[] olarak güncelledik

  if (process.env.IS_DOCKER_BUILD === 'true') {
    console.log("[HomePricingSection] Docker build detected, returning empty plans array.");
    // plans boş kalacak
  } else {
    try {
      plans = await prisma.plan.findMany({
        where: { isActive: true },
        orderBy: {
          priceMonthly: { sort: 'asc', nulls: 'last' },
        },
        take: 3, // Anasayfada en fazla 3 plan göster
      });
    } catch (error) {
      console.error("Error fetching plans for HomePricingSection:", error);
      // Hata durumunda plans boş kalacak
    }
  }

  // Popüler planın indeksi (genellikle orta plan)
  const popularPlanIndex = plans.length > 1 ? 1 : 0;

  return (
    <div className="grid gap-6 mt-12 md:grid-cols-3 mx-auto max-w-5xl">
      {plans.length > 0 ? (
        plans.map((plan, index) => (
          <Card 
            key={plan.id} 
            className={`flex flex-col ${
              index === popularPlanIndex ? 'border-primary border-2 shadow-lg relative' : 'border shadow-sm'
            }`}
          >
            {index === popularPlanIndex && (
              <div className="absolute inset-x-0 -top-5 mx-auto w-fit bg-primary text-white text-xs font-semibold px-3 py-1 rounded-full">
                EN POPÜLER
              </div>
            )}
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              {plan.description && (
                <CardDescription>{plan.description}</CardDescription>
              )}
              <div className="mt-4 text-4xl font-bold">
                {plan.priceMonthly !== null ? (
                  <>
                    {formatCurrency(plan.priceMonthly, "TRY")}
                    <span className="text-base font-normal text-muted-foreground">/ay</span>
                  </>
                ) : plan.priceYearly !== null ? (
                  <>
                    {formatCurrency(plan.priceYearly / 12, "TRY")}
                    <span className="text-base font-normal text-muted-foreground">/ay</span>
                  </>
                ) : (
                  <span className="text-2xl font-semibold text-muted-foreground">Özel Fiyat</span>
                )}
              </div>
              {plan.priceYearly !== null && plan.priceMonthly !== null && (
                <p className="text-sm text-muted-foreground mt-1">
                  veya {formatCurrency(plan.priceYearly, "TRY")}/yıl
                </p>
              )}
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-3 text-sm">
                {plan.features && Array.isArray(plan.features) && (plan.features as any[]).length > 0 ? (
                  (plan.features as PlanFeature[]).map((feature, i) => (
                    <li key={i} className="flex items-center">
                      <Check className="mr-2 h-4 w-4 text-primary flex-shrink-0" />
                      <span>{typeof feature === "string" ? feature : "Özellik"}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-muted-foreground italic">Özellik belirtilmemiş.</li>
                )}
                {/* Limitler */}
                {plan.maxProducts !== null && (
                  <li className="flex items-center">
                    <Check className="mr-2 h-4 w-4 text-primary flex-shrink-0" />
                    <span>{plan.maxProducts} Ürün Limiti</span>
                  </li>
                )}
                {plan.maxMonthlyOrders !== null && (
                  <li className="flex items-center">
                    <Check className="mr-2 h-4 w-4 text-primary flex-shrink-0" />
                    <span>{plan.maxMonthlyOrders} Aylık Sipariş Limiti</span>
                  </li>
                )}
              </ul>
            </CardContent>
            <CardFooter>
              <StartSubscriptionButton planId={plan.id} planName={plan.name} />
            </CardFooter>
          </Card>
        ))
      ) : (
        <div className="col-span-3 text-center py-12">
          <p className="text-muted-foreground">Şu anda aktif plan bulunmamaktadır.</p>
        </div>
      )}
    </div>
  );
} 