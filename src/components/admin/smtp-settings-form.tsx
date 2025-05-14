'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
    updateSmtpSettings,
    sendTestEmail,
} from "@/actions/admin/email-settings-actions";
import { SmtpSettings } from "@prisma/client";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Send } from "lucide-react";
import { useState } from "react";

// Zod şeması (action dosyasındaki ile aynı olmalı)
const smtpSettingsSchema = z.object({
    host: z.string().min(3, "Host gerekli"),
    port: z.coerce.number().int().positive("Geçerli bir port girin"),
    secure: z.boolean(),
    username: z.string().optional().transform(e => e === "" ? undefined : e), // user -> username
    password: z.string().optional().transform(e => e === "" ? undefined : e), // pass -> password
    from: z.string().email("Geçerli bir gönderen e-posta adresi girin").optional().transform(e => e === "" ? undefined : e), // fromEmail -> from
    fromName: z.string().min(2, "Gönderen adı gerekli"),
});

type SmtpSettingsFormValues = z.infer<typeof smtpSettingsSchema>;

interface SmtpSettingsFormProps {
    currentSettings: SmtpSettings | null; // SmtpSettings tipi Prisma'dan doğru alan adlarıyla geliyor.
}

export function SmtpSettingsForm({ currentSettings }: SmtpSettingsFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [testEmail, setTestEmail] = useState("");

    const form = useForm<SmtpSettingsFormValues>({
        resolver: zodResolver(smtpSettingsSchema),
        defaultValues: {
            host: currentSettings?.host || "",
            port: currentSettings?.port || 587,
            secure: currentSettings?.secure ?? true,
            username: currentSettings?.username || "", // currentSettings.user -> currentSettings.username
            password: currentSettings?.password || "", // currentSettings.pass -> currentSettings.password
            from: currentSettings?.from || "", // currentSettings.fromEmail -> currentSettings.from
            fromName: currentSettings?.fromName || "",
        },
    });

    async function onSubmit(data: SmtpSettingsFormValues) {
        setIsSubmitting(true);
        try {
            const result = await updateSmtpSettings(data);
            if (result.success) {
                toast.success("SMTP ayarları kaydedildi.");
            } else {
                toast.error(result.error || "Ayarlar kaydedilirken bir hata oluştu.");
            }
        } catch (error) {
            toast.error("Bir hata oluştu.");
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleSendTestEmail() {
        if (!testEmail) {
            toast.warning("Lütfen test e-postası gönderilecek adresi girin.");
            return;
        }
        setIsTesting(true);
        try {
            // Önce formdaki mevcut (belki kaydedilmemiş) ayarları kullanarak test etmek yerine,
            // kaydedilmiş ayarları kullanmak daha mantıklı olabilir. Action bunu yapıyor.
            const result = await sendTestEmail(testEmail);
            if (result.success) {
                toast.success(`Test e-postası ${testEmail} adresine gönderildi.`);
            } else {
                toast.error(result.error || "Test e-postası gönderilemedi.");
            }
        } catch (error) {
            toast.error("Test e-postası gönderilirken bir hata oluştu.");
            console.error(error);
        } finally {
            setIsTesting(false);
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>SMTP Ayarları</CardTitle>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="host"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>SMTP Host</FormLabel>
                                        <FormControl>
                                            <Input placeholder="smtp.example.com" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="port"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Port</FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="587" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name="secure"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                    <div className="space-y-0.5">
                                        <FormLabel>Güvenli Bağlantı (TLS/SSL)</FormLabel>
                                        <FormDescription>
                                            Genellikle 465 portu için kapalı, 587 için açık olur.
                                        </FormDescription>
                                    </div>
                                    <FormControl>
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="username" // user -> username
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Kullanıcı Adı (Opsiyonel)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="smtp_user" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="password" // pass -> password
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Şifre (Opsiyonel)</FormLabel>
                                        <FormControl>
                                            <Input type="password" placeholder="••••••••" {...field} />
                                        </FormControl>
                                        <FormDescription>
                                            Kaydedildiğinde şifre gösterilmez.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="from" // fromEmail -> from
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Gönderen E-posta</FormLabel>
                                        <FormControl>
                                            <Input type="email" placeholder="noreply@example.com" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="fromName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Gönderen Adı</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Projem Destek" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <Button type="submit" disabled={isSubmitting || isTesting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 
                            Ayarları Kaydet
                        </Button>
                    </form>
                </Form>
            </CardContent>
            <CardFooter className="border-t pt-6 mt-6">
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
                     <Input 
                        type="email"
                        placeholder="Test edilecek e-posta adresi" 
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                        className="flex-1"
                        disabled={isTesting || isSubmitting}
                    />
                    <Button variant="outline" onClick={handleSendTestEmail} disabled={isTesting || isSubmitting || !testEmail}>
                         {isTesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 
                        <Send className="mr-2 h-4 w-4" />
                        Test E-postası Gönder
                    </Button>
                </div>
            </CardFooter>
        </Card>
    );
} 