"use client";

import { useState } from "react";
import { 
  Calendar, 
  FileText, 
  MapPin, 
  Package, 
  ShoppingBag, 
  Truck, 
  User, 
  ExternalLink,
  Receipt,
  Clock,
  Banknote,
  Percent,
  Tag,
  Hash,
  Box,
  Phone,
  Mail,
  Building,
  CircleCheck,
  Info,
  AlertCircle,
  Check,
  X
} from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface SiparisDetayModalProps {
  siparis: any | null;
  acik: boolean;
  setAcik: (value: boolean) => void;
}

function formatTarih(dateValue: any, formatStr: string = "d MMMM yyyy, HH:mm"): string {
  try {
    if (!dateValue) {
      return "Belirtilmemiş";
    }
    
    const tarih = new Date(dateValue);
    
    if (isNaN(tarih.getTime())) {
      return "Geçersiz Tarih";
    }
    
    return format(tarih, formatStr, { locale: tr });
  } catch (error) {
    console.error('Tarih formatlama hatası:', error, dateValue);
    return "Bilinmiyor";
  }
}

export function SiparisDetayModal({ siparis, acik, setAcik }: SiparisDetayModalProps) {
  const [activeTab, setActiveTab] = useState("genel");
  
  if (!siparis) return null;
  
  const tarihStr = formatTarih(siparis.orderDate);
  
  const toplamTutar = new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: siparis.currencyCode || 'TRY'
  }).format(siparis.totalPrice || 0);
  
  const durumRenkMap: Record<string, string> = {
    "Created": "bg-primary text-primary-foreground",
    "Picking": "bg-amber-600 text-amber-50",
    "Invoiced": "bg-violet-600 text-violet-50",
    "Shipped": "bg-emerald-600 text-emerald-50",
    "Cancelled": "bg-destructive text-destructive-foreground",
    "Delivered": "bg-green-600 text-green-50",
    "UnDelivered": "bg-rose-600 text-rose-50",
  };
  
  const durumAdMap: Record<string, string> = {
    "Created": "Oluşturuldu",
    "Picking": "Hazırlanıyor",
    "Invoiced": "Faturalandı",
    "Shipped": "Kargoya Verildi",
    "Cancelled": "İptal Edildi",
    "Delivered": "Teslim Edildi",
    "UnDelivered": "Teslim Edilemedi",
  };
  
  const getDurumIcon = (status: string) => {
    switch(status) {
      case "Created": return <FileText className="h-4 w-4" />;
      case "Picking": return <Package className="h-4 w-4" />;
      case "Invoiced": return <Receipt className="h-4 w-4" />;
      case "Shipped": return <Truck className="h-4 w-4" />;
      case "Delivered": return <CircleCheck className="h-4 w-4" />;
      case "Cancelled": return <X className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };
  
  return (
    <Dialog open={acik} onOpenChange={setAcik}>
      <DialogContent className="max-w-[95vw] lg:max-w-[1400px] w-full h-[90vh] md:h-[750px] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="p-4 border-b bg-muted/50 relative">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex-1">
            <div className="flex items-center gap-2">
              <Hash className="h-5 w-5 text-primary" />
                <DialogTitle className="text-xl font-semibold">Sipariş #{siparis.orderNumber}</DialogTitle>
            </div>
          <DialogDescription className="flex items-center gap-1.5 text-sm mt-1">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            {tarihStr} tarihinde oluşturuldu
          </DialogDescription>
            </div>
            
            <div className="flex items-center gap-3">
              <Badge variant="outline" className={cn("px-3 py-1.5", durumRenkMap[siparis.status])}>
                {getDurumIcon(siparis.status)}
                <span className="ml-1">{durumAdMap[siparis.status] || siparis.status}</span>
              </Badge>
              
              <DialogClose asChild>
                <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 absolute right-4 top-4">
                  <X className="h-4 w-4" />
                  <span className="sr-only">Kapat</span>
                </Button>
              </DialogClose>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          <Tabs 
            defaultValue="genel" 
            value={activeTab} 
            onValueChange={setActiveTab} 
            className="flex flex-col md:flex-row flex-1 overflow-hidden"
          >
            <div className="border-b md:border-b-0 md:border-r w-full md:w-44 lg:w-52 shrink-0 bg-muted/20">
              <ScrollArea className="md:h-[calc(750px-73px)]">
                <TabsList className="flex md:flex-col justify-start p-1 md:p-1.5 gap-1 bg-transparent border-0 w-full overflow-x-auto md:overflow-x-visible h-auto">
                <TabsTrigger 
                  value="genel" 
                    className="w-full justify-start px-3 py-2.5 gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary text-sm"
                >
                  <FileText className="h-4 w-4" />
                    <span>Genel Bilgiler</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="urunler" 
                    className="w-full justify-start px-3 py-2.5 gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary text-sm"
                >
                  <ShoppingBag className="h-4 w-4" />
                    <span>Sipariş Ürünleri</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="adresler" 
                    className="w-full justify-start px-3 py-2.5 gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary text-sm"
                >
                  <MapPin className="h-4 w-4" />
                    <span>Teslimat Bilgileri</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="kargo" 
                    className="w-full justify-start px-3 py-2.5 gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary text-sm"
                >
                  <Truck className="h-4 w-4" />
                    <span>Kargo Takibi</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="gecmis" 
                    className="w-full justify-start px-3 py-2.5 gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary text-sm"
                >
                  <Calendar className="h-4 w-4" />
                    <span>Durum Geçmişi</span>
                </TabsTrigger>
              </TabsList>
              </ScrollArea>
            </div>

            <div className="flex-1 overflow-hidden bg-card">
              <ScrollArea className="h-[calc(90vh-73px)] md:h-[calc(750px-73px)] w-full">
                <TabsContent value="genel" className="m-0 p-4 md:p-6 block">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                    <Card className="shadow-sm border">
                    <CardHeader className="pb-2 bg-muted/50">
                        <CardTitle className="text-md md:text-lg flex items-center gap-2">
                        <User className="h-5 w-5 text-primary" />
                        Müşteri Bilgileri
                      </CardTitle>
                    </CardHeader>
                      <CardContent className="pt-4 space-y-4">
                        <div className="flex items-center gap-3">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Ad Soyad</p>
                            <p className="text-sm font-medium">
                              {siparis.customer.firstName} {siparis.customer.lastName}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">E-posta</p>
                            <p className="text-sm font-medium">{siparis.customer.email}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                    <Card className="shadow-sm border">
                    <CardHeader className="pb-2 bg-muted/50">
                        <CardTitle className="text-md md:text-lg flex items-center gap-2">
                        <Banknote className="h-5 w-5 text-primary" />
                        Sipariş Özeti
                      </CardTitle>
                    </CardHeader>
                      <CardContent className="pt-4 space-y-4">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <Tag className="h-4 w-4 text-muted-foreground" />
                            <p className="text-sm">Ürün Tutarı:</p>
                          </div>
                          <p className="text-sm font-medium">
                            {new Intl.NumberFormat('tr-TR', {
                              style: 'currency',
                              currency: siparis.currencyCode || 'TRY'
                            }).format(siparis.grossAmount || 0)}
                          </p>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <Percent className="h-4 w-4 text-muted-foreground" />
                            <p className="text-sm">İndirim:</p>
                          </div>
                          <p className="text-sm font-medium text-destructive">
                            -{new Intl.NumberFormat('tr-TR', {
                              style: 'currency',
                              currency: siparis.currencyCode || 'TRY'
                            }).format(siparis.totalDiscount || 0)}
                          </p>
                        </div>
                        
                        <Separator />
                        
                        <div className="flex justify-between items-center pt-1">
                          <div className="flex items-center gap-2">
                            <Banknote className="h-4 w-4 text-primary" />
                            <p className="text-sm font-bold">Toplam:</p>
                          </div>
                          <p className="text-base font-bold text-primary">{toplamTutar}</p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {siparis.invoiceLink && (
                      <div className="lg:col-span-2 mt-2 flex justify-end">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="gap-2" 
                        asChild
                      >
                        <a href={siparis.invoiceLink} target="_blank" rel="noopener noreferrer">
                          <FileText className="h-4 w-4" />
                          Faturayı Görüntüle
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>
              
                <TabsContent value="urunler" className="m-0 h-full block">
                  <Card className="shadow-sm border h-full">
                    <CardHeader className="pb-2 bg-muted/50">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-md md:text-lg flex items-center gap-2">
                          <ShoppingBag className="h-5 w-5 text-primary" />
                          Sipariş Ürünleri
                        </CardTitle>
                        <Badge variant="outline" className="px-2 py-1 text-xs">
                          {siparis.items.length} ürün
                        </Badge>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-4">
                      <div className="space-y-4">
                        {siparis.items.map((item: any) => (
                          <div key={item.id} className="border rounded-lg overflow-hidden shadow-sm bg-card">
                            <div className="flex flex-col sm:flex-row w-full">
                              <div className="flex-1 p-4">
                                <div className="flex items-start gap-3">
                                  <Box className="h-5 w-5 text-muted-foreground mt-0.5" />
                                  <div className="space-y-2 overflow-hidden">
                                    <h4 className="font-medium text-balance line-clamp-2 sm:line-clamp-none">
                                      {item.productName}
                                    </h4>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <Badge variant="outline" className="h-5 text-xs">
                                        {item.merchantSku}
                                      </Badge>
                                      {item.barcode && (
                                        <Badge variant="outline" className="h-5 text-xs">
                                          {item.barcode}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex sm:flex-col justify-between items-center sm:items-end bg-muted/40 border-t sm:border-l sm:border-t-0 p-4 shrink-0 sm:w-32 md:w-40">
                                <div className="flex items-center gap-1 sm:mb-2">
                                  <Tag className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                                  <p className="text-xs sm:text-sm">
                                    {item.quantity} adet × {new Intl.NumberFormat('tr-TR', {
                                      style: 'currency',
                                      currency: siparis.currencyCode || 'TRY'
                                    }).format(item.price || 0)}
                                  </p>
                                </div>
                                
                                <p className="text-sm sm:text-base font-semibold text-primary">
                                  {new Intl.NumberFormat('tr-TR', {
                                    style: 'currency',
                                    currency: siparis.currencyCode || 'TRY'
                                  }).format((item.price || 0) * item.quantity)}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                    
                    <CardFooter className="flex justify-between items-center py-3 border-t bg-muted/50">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Toplam {siparis.items.length} ürün</p>
                      </div>
                      <div className="flex gap-2 items-center">
                        <p className="text-sm font-medium">Sipariş Toplamı:</p>
                        <p className="text-base font-bold text-primary">{toplamTutar}</p>
                      </div>
                    </CardFooter>
                  </Card>
                </TabsContent>
                
                <TabsContent value="adresler" className="m-0 p-4 md:p-6 block">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                    <Card className="shadow-sm border h-full">
                    <CardHeader className="pb-2 bg-muted/50">
                        <CardTitle className="text-md md:text-lg flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-primary" />
                        Teslimat Adresi
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      {siparis.shipmentAddress ? (
                          <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <p className="font-medium">{siparis.shipmentAddress.fullName || "-"}</p>
                          </div>
                          
                          <div className="flex gap-3">
                            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <div className="space-y-1">
                              <p className="text-sm text-pretty">{siparis.shipmentAddress.fullAddress || "-"}</p>
                              <p className="text-sm">
                                <span className="font-medium">{siparis.shipmentAddress.district || "-"}</span> / {siparis.shipmentAddress.city || "-"}
                              </p>
                            </div>
                          </div>
                          
                          {siparis.shipmentAddress.phone && (
                            <div className="flex items-center gap-3">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              <p className="text-sm">{siparis.shipmentAddress.phone}</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground p-4 bg-muted rounded-md">
                          <AlertCircle className="h-4 w-4" />
                          <p>Teslimat adresi bulunamadı.</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  
                    <Card className="shadow-sm border h-full">
                    <CardHeader className="pb-2 bg-muted/50">
                        <CardTitle className="text-md md:text-lg flex items-center gap-2">
                        <Receipt className="h-5 w-5 text-primary" />
                        Fatura Adresi
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      {siparis.invoiceAddress ? (
                          <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <p className="font-medium">{siparis.invoiceAddress.fullName || "-"}</p>
                          </div>
                          
                          {siparis.invoiceAddress.company && (
                            <div className="flex items-center gap-3">
                              <Building className="h-4 w-4 text-muted-foreground" />
                              <p className="text-sm">{siparis.invoiceAddress.company}</p>
                            </div>
                          )}
                          
                          <div className="flex gap-3">
                            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <div className="space-y-1">
                              <p className="text-sm text-pretty">{siparis.invoiceAddress.fullAddress || "-"}</p>
                              <p className="text-sm">
                                <span className="font-medium">{siparis.invoiceAddress.district || "-"}</span> / {siparis.invoiceAddress.city || "-"}
                              </p>
                            </div>
                          </div>
                          
                          {siparis.taxNumber && (
                            <div className="flex items-center gap-3">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <p className="text-sm">Vergi No: {siparis.taxNumber}</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground p-4 bg-muted rounded-md">
                          <AlertCircle className="h-4 w-4" />
                          <p>Fatura adresi bulunamadı.</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
                <TabsContent value="kargo" className="m-0 p-4 md:p-6 block">
                <Card className="shadow-sm border">
                  <CardHeader className="pb-2 bg-muted/50">
                      <CardTitle className="text-md md:text-lg flex items-center gap-2">
                      <Truck className="h-5 w-5 text-primary" />
                      Kargo Bilgileri
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 pb-6">
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="p-4 rounded-lg border bg-muted/30">
                          <div className="flex items-center gap-3">
                            <Truck className="h-5 w-5 text-primary" />
                            <div>
                              <p className="text-xs text-muted-foreground">Kargo Firması</p>
                              <p className="text-base font-semibold">{siparis.cargoProviderName || "Belirtilmemiş"}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="p-4 rounded-lg border bg-muted/30">
                          <div className="flex items-center gap-3">
                            <Package className="h-5 w-5 text-primary" />
                            <div>
                              <p className="text-xs text-muted-foreground">Takip Numarası</p>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <p className="text-base font-semibold font-mono">{siparis.cargoTrackingNumber || "Belirtilmemiş"}</p>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Kopyalamak için tıkla</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {siparis.cargoTrackingLink && (
                        <div className="flex justify-center mt-2">
                          <Button 
                            className="gap-2 min-w-[240px]"
                            asChild
                          >
                            <a href={siparis.cargoTrackingLink} target="_blank" rel="noopener noreferrer">
                              <Truck className="h-4 w-4" />
                              Kargo Takip Sayfasına Git
                              <ExternalLink className="h-3 w-3 ml-1" />
                            </a>
                          </Button>
                        </div>
                      )}
                      
                      <Separator />
                      
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="flex items-start gap-3 p-4 rounded-lg border bg-muted/30">
                          <Calendar className="h-5 w-5 text-primary mt-0.5" />
                          <div>
                            <p className="text-xs text-muted-foreground">Tahmini Teslimat</p>
                            <p className="text-base font-semibold">
                              {siparis.estimatedDeliveryStartDate 
                                ? formatTarih(siparis.estimatedDeliveryStartDate, "d MMMM yyyy")
                                : "Belirtilmemiş"}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-3 p-4 rounded-lg border bg-muted/30">
                          <Clock className="h-5 w-5 text-primary mt-0.5" />
                          <div>
                            <p className="text-xs text-muted-foreground">Sevkiyat Tarihi</p>
                            <p className="text-base font-semibold">
                              {siparis.originShipmentDate 
                                ? formatTarih(siparis.originShipmentDate, "d MMMM yyyy")
                                : "Henüz sevk edilmedi"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
                <TabsContent value="gecmis" className="m-0 p-4 md:p-6 block">
                <Card className="shadow-sm border">
                  <CardHeader className="pb-2 bg-muted/50">
                      <CardTitle className="text-md md:text-lg flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-primary" />
                        Sipariş Durum Geçmişi
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                      <div className="relative">
                      {siparis.statusHistory && siparis.statusHistory.length > 0 ? (
                          <div className="relative pl-6">
                            <div className="absolute w-[2px] bg-muted-foreground/20 top-0 bottom-0 left-[10px]"></div>
                            <div className="space-y-8">
                          {siparis.statusHistory.map((durum: any /* Prisma.TrendyolOrderStatusGetPayload<{}> */) => (
                                <div key={durum.id} className="relative">
                                  <div className={cn("w-5 h-5 rounded-full flex items-center justify-center z-10 absolute -left-6 mt-0.5", durumRenkMap[durum.status] || "bg-secondary")}>
                                <Check className="h-3 w-3" />
                              </div>
                                  <div>
                                <div className="flex items-center gap-2">
                                  {getDurumIcon(durum.status)}
                                  <p className="font-medium">
                                    {durumAdMap[durum.status] || durum.status}
                                  </p>
                                </div>
                                <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                                  <Clock className="h-3 w-3" />
                                  {formatTarih(durum.createdDate)}
                                </p>
                              </div>
                            </div>
                          ))}
                            </div>
                          </div>
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground p-4 bg-muted rounded-md">
                          <Info className="h-4 w-4" />
                          <p>Durum geçmişi bulunamadı.</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              </ScrollArea>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}