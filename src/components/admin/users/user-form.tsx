"use client";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DialogFooter } from "@/components/ui/dialog";
import { Role } from "@prisma/client"; // Prisma'dan rol enum'ını import et
import { createUser } from "@/actions/admin/user-actions"; // Server action import edilecek
import { toast } from "sonner";
import { useState } from "react";

// Zod şeması (Prisma şemasına benzer alanlar)
const userFormSchema = z.object({
  name: z.string().min(2, { message: "İsim en az 2 karakter olmalıdır." }).optional(),
  email: z.string().email({ message: "Geçerli bir e-posta adresi girin." }),
  password: z.string().min(6, { message: "Şifre en az 6 karakter olmalıdır." }),
  role: z.nativeEnum(Role), // Prisma'dan gelen enum'ı kullan
  companyName: z.string().optional(),
});

type UserFormValues = z.infer<typeof userFormSchema>;

interface UserFormProps {
  onSuccess?: () => void; // Başarılı işlem sonrası callback
}

export function UserForm({ onSuccess }: UserFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: Role.USER, // Varsayılan rol USER
      companyName: "",
    },
  });

  async function onSubmit(data: UserFormValues) {
    setIsLoading(true);
    try {
      const result = await createUser(data);
      if (result.success) {
        toast.success("Kullanıcı başarıyla oluşturuldu!");
        form.reset(); // Formu sıfırla
        onSuccess?.(); // Başarı callback'ini çağır (dialogu kapatmak için)
      } else {
        // Hata mesajını göster (örneğin, email zaten kullanılıyor)
        toast.error(result.error || "Bir hata oluştu.");
      }
    } catch (error) {
      console.error("Kullanıcı oluşturma hatası:", error);
      toast.error("Sunucu hatası oluştu. Lütfen tekrar deneyin.");
    }
    setIsLoading(false);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>İsim (Opsiyonel)</FormLabel>
              <FormControl>
                <Input placeholder="Ad Soyad" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-posta *</FormLabel>
              <FormControl>
                <Input type="email" placeholder="kullanici@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Şifre *</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••" {...field} />
              </FormControl>
              <FormDescription>En az 6 karakter olmalıdır.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rol *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Rol seçin" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.values(Role).map((role) => (
                    <SelectItem key={role} value={role}>
                      {role} 
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="companyName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Şirket Adı (Opsiyonel)</FormLabel>
              <FormControl>
                <Input placeholder="Örnek A.Ş." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <DialogFooter className="pt-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
} 