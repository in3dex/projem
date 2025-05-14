import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { db as prisma } from "@/lib/db";
import { Plan } from "@prisma/client";
import { CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

async function getActivePlans(): Promise<Plan[]> {
  try {
    return await prisma.plan.findMany({
      where: { isActive: true }, // Sadece aktif planları al
      orderBy: { priceMonthly: 'asc' }, // Fiyata göre sırala (varsa)
    });
  } catch (error) {
    console.error("Error fetching active plans:", error);
    return []; // Hata durumunda boş dizi dön
  }
}

export async function RequiresSubscription() {
  const plans = await getActivePlans();

  return (
    <div className="container mx-auto flex flex-col items-center justify-center space-y-8 py-12">
      <div className="text-center">
         <XCircle className="mx-auto h-16 w-16 text-destructive mb-4" />
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Aktif Abonelik Gerekli</h2>
        <p className="mt-4 text-lg text-muted-foreground">
          Bu özelliğe erişmek için aktif bir aboneliğinizin olması gerekmektedir.
        </p>
         <p className="text-muted-foreground">
          Lütfen aşağıdaki planlardan birini seçerek aboneliğinizi başlatın veya yükseltin.
        </p>
      </div>

      {plans.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 w-full max-w-5xl">
          {plans.map((plan) => (
            <Card key={plan.id} className="flex flex-col">
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <p className="text-3xl font-bold">
                    {plan.priceMonthly ? `${plan.priceMonthly.toFixed(2)} ₺/ay` : (plan.priceYearly ? `${(plan.priceYearly / 12).toFixed(2)} ₺/ay` : 'Ücretsiz')}
                  </p>
                  {plan.priceYearly && plan.priceMonthly && (
                    <p className="text-sm text-muted-foreground">
                      veya {plan.priceYearly.toFixed(2)} ₺/yıl
                    </p>
                  )}
                   {/* Özellikler (varsa) */}
                  {Array.isArray(plan.features) && plan.features.length > 0 && (
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {(plan.features as string[]).map((feature, index) => (
                        <li key={index} className="flex items-center">
                          <CheckCircle className="mr-2 h-4 w-4 text-green-500 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {/* TODO: Buradaki Link'i veya Button'u ödeme sayfasına/işlemine yönlendir */}
                <Button asChild className="w-full mt-auto">
                   <Link href={`/abonelik/odeme?plan=${plan.id}`}>Planı Seç</Link> 
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">Aktif abonelik planı bulunamadı. Lütfen yönetici ile iletişime geçin.</p>
      )}
    </div>
  );
} 