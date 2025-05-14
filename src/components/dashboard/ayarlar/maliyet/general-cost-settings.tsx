'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomCostSettings } from './custom-cost-settings';
import { GeneralSettingsForm } from './general-settings/general-settings-form';
import { VatSettingsForm } from './general-settings/vat-settings-form';
import { BaremRulesTable } from './barem-rules/barem-rules-table';
import { AddBaremDialog } from './barem-rules/add-barem-dialog';
import { EditBaremDialog } from './barem-rules/edit-barem-dialog';
import { ProfitSimulationCard } from './profit-simulation/profit-simulation-card';
import { useGeneralCostSettings } from '@/hooks/use-general-cost-settings';
import { useBaremRules } from '@/hooks/use-barem-rules';
import { BaremPriceData } from '@/hooks/use-barem-rules';

export function GeneralCostSettings() {
    const generalSettingsHook = useGeneralCostSettings();
    const baremRulesHook = useBaremRules();

    // Yükleme durumu kontrolü (her iki hook da yüklendi mi?)
    if (generalSettingsHook.isLoading || baremRulesHook.isLoadingBarem) {
      return (
          <Card>
              <CardHeader>
                    <CardTitle>Maliyet Ayarları</CardTitle>
                  <CardDescription>Ayarlar yükleniyor...</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center items-center h-60">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </CardContent>
          </Card>
      );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Maliyet Ayarları</h2>

      <Tabs defaultValue="general">
        <TabsList className="grid w-full grid-cols-5 mb-6">
          <TabsTrigger value="general">Genel Ayarlar</TabsTrigger>
          <TabsTrigger value="vat">KDV Ayarları</TabsTrigger>
          <TabsTrigger value="barem">Barem Kuralları</TabsTrigger>
          <TabsTrigger value="simulation">Karlılık Simülasyonu</TabsTrigger>
          <TabsTrigger value="custom">Özel Ayarlar</TabsTrigger>
        </TabsList>

                {/* Genel Ayarlar Sekmesi */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
                <CardTitle>Genel Maliyet Parametreleri</CardTitle>
              <CardDescription>
                  Ürün maliyeti hesaplamalarında kullanılacak varsayılan değerler.
              </CardDescription>
            </CardHeader>
                        <CardContent>
                            <GeneralSettingsForm
                                settings={generalSettingsHook.settings}
                                calculatedShippingCost={generalSettingsHook.calculatedShippingCost}
                                calculateLoading={generalSettingsHook.calculateLoading}
                                isSaving={generalSettingsHook.isSaving}
                                handleInputChange={generalSettingsHook.handleInputChange}
                                handleCarrierChange={generalSettingsHook.handleCarrierChange}
                                handleProfitMethodChange={generalSettingsHook.handleProfitMethodChange}
                                handleApplyCalculatedCost={generalSettingsHook.handleApplyCalculatedCost}
                            />
              </CardContent>
                <CardFooter>
                             <Button onClick={generalSettingsHook.handleSave} disabled={generalSettingsHook.isSaving}>
                                {generalSettingsHook.isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Genel Ayarları Kaydet
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

                {/* KDV Ayarları Sekmesi */}
          <TabsContent value="vat" className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>KDV Ayarları</CardTitle>
                    <CardDescription>
                        Satış, kargo, komisyon, hizmet bedeli ve maliyet KDV oranlarını yönetin.
                    </CardDescription>
                </CardHeader>
                        <CardContent>
                            <VatSettingsForm
                                settings={generalSettingsHook.settings}
                                isSaving={generalSettingsHook.isSaving}
                                handleInputChange={generalSettingsHook.handleInputChange}
                            />
                </CardContent>
                <CardFooter>
                             <Button onClick={generalSettingsHook.handleSave} disabled={generalSettingsHook.isSaving}>
                                {generalSettingsHook.isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    KDV Ayarlarını Kaydet
                  </Button>
                </CardFooter>
            </Card>
          </TabsContent>

                {/* Barem Kuralları Sekmesi */}
          <TabsContent value="barem" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Kargo Barem Fiyatları</CardTitle>
                    <CardDescription>
                      Kargo firması, sipariş tutarı ve desiye göre kargo maliyetlerini tanımlayın.
                    </CardDescription>
                </div>
                             {/* AddBaremDialog'u buraya taşıdım ve onOpenChange'i güncelledim */}
                             <AddBaremDialog
                                isOpen={baremRulesHook.isAddBaremDialogOpen}
                                onOpenChange={baremRulesHook.setIsAddBaremDialogOpen} // Doğru state setter fonksiyonu
                                newBaremRule={baremRulesHook.newBaremRule}
                                carrierOptions={baremRulesHook.carrierOptions}
                                suggestedTrendyolRates={baremRulesHook.suggestedTrendyolRates}
                                handleInputChange={baremRulesHook.handleInputChange}
                                handleCarrierChange={baremRulesHook.handleCarrierChange}
                                handleApplySuggestedRate={baremRulesHook.handleApplySuggestedRate}
                                onSave={baremRulesHook.handleAddBaremRule}
                                isSaving={baremRulesHook.isSavingBarem}
                            />
                      </CardHeader>
                      <CardContent>
                            <BaremRulesTable
                                baremRules={baremRulesHook.baremRules}
                                isLoading={baremRulesHook.isLoadingBarem} // Hook'tan gelen loading
                                isDeleting={baremRulesHook.isDeletingBarem}
                                ruleToDelete={baremRulesHook.ruleToDelete}
                                onEdit={baremRulesHook.openEditBaremDialog}
                                onDelete={baremRulesHook.openDeleteConfirmation}
                                handleConfirmDelete={baremRulesHook.handleDeleteBaremRule}
                                closeDeleteConfirmation={baremRulesHook.closeDeleteConfirmation}
                            />
                </CardContent>
              </Card>
                     {/* Barem Düzenleme Dialogu (Render'ı hook kontrol eder) */}
                     <EditBaremDialog
                        isOpen={baremRulesHook.isEditBaremDialogOpen}
                        onOpenChange={baremRulesHook.closeEditBaremDialog}
                        ruleToEdit={baremRulesHook.ruleToEdit}
                        carrierOptions={baremRulesHook.carrierOptions}
                        suggestedTrendyolRates={baremRulesHook.suggestedTrendyolRates}
                        handleInputChange={baremRulesHook.handleInputChange}
                        handleCarrierChange={baremRulesHook.handleCarrierChange}
                        handleApplySuggestedRate={baremRulesHook.handleApplySuggestedRate}
                        onSave={baremRulesHook.handleUpdateBaremRule}
                        isSaving={baremRulesHook.isSavingBarem}
                    />
            </TabsContent>

                {/* Karlılık Simülasyonu Sekmesi */}
            <TabsContent value="simulation" className="space-y-6">
              <ProfitSimulationCard
                settings={generalSettingsHook.settings}
                baremRules={baremRulesHook.baremRules}
              />
            </TabsContent>

                {/* Özel Ayarlar Sekmesi */}
            <TabsContent value="custom" className="space-y-6">
              <CustomCostSettings />
            </TabsContent>
          </Tabs>
        </div>
  );
} 