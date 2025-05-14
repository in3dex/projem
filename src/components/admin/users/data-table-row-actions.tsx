"use client"

import { DotsHorizontalIcon } from "@radix-ui/react-icons"
import { Row } from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { UserColumn } from "./columns" // User tipini alalım
import { toast } from "sonner"
import { UserCog, Trash2, ShieldCheck, ShieldOff } from "lucide-react"

interface DataTableRowActionsProps<TData extends UserColumn> { // Tipi UserColumn olarak sınırla
  row: Row<TData>
}

export function DataTableRowActions<TData extends UserColumn>(
  { row }: DataTableRowActionsProps<TData>
) {
  const user = row.original // Satırın orijinal verisini al (UserColumn tipinde)

  const handleRoleChange = async (newRole: "ADMIN" | "USER") => {
    // TODO: API çağrısı ile rol güncelleme işlemi
    toast.info(`${user.name ?? user.email} rolü ${newRole} olarak güncellenecek... (API Bağlantısı Bekleniyor)`);
    // Örn: await updateUserRole(user.id, newRole);
    // Başarılı olursa tabloyu yenilemek için router.refresh() veya state yönetimi
  };

  const handleStatusChange = async (newStatus: boolean) => {
    // TODO: API çağrısı ile kullanıcı durumu güncelleme işlemi
    toast.info(`${user.name ?? user.email} durumu ${newStatus ? 'Aktif' : 'Pasif'} olarak güncellenecek... (API Bağlantısı Bekleniyor)`);
    // Örn: await updateUserStatus(user.id, newStatus);
  }

  const handleDeleteUser = async () => {
    // TODO: API çağrısı ile kullanıcı silme işlemi (onay mekanizması ekle!)
     if (confirm(`${user.name ?? user.email} kullanıcısını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`)) {
        toast.warning(`${user.name ?? user.email} kullanıcısı silinecek... (API Bağlantısı Bekleniyor)`);
         // Örn: await deleteUser(user.id);
     }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
        >
          <DotsHorizontalIcon className="h-4 w-4" />
          <span className="sr-only">Menüyü aç</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[180px]">
        <DropdownMenuItem onClick={() => toast.info("Kullanıcı detayları görüntülenecek...")}>
           <UserCog className="mr-2 h-4 w-4" />
          Detayları Görüntüle
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuSub> {/* Rol Değiştirme Alt Menüsü */} 
          <DropdownMenuSubTrigger>
             <ShieldCheck className="mr-2 h-4 w-4" /> Rolü Değiştir
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem 
              onClick={() => handleRoleChange('ADMIN')} 
              disabled={user.role === 'ADMIN'} // Zaten admin ise pasif yap
            >
              Admin Yap
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => handleRoleChange('USER')} 
              disabled={user.role === 'USER'} // Zaten user ise pasif yap
            >
              Kullanıcı Yap
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
         <DropdownMenuItem onClick={() => handleStatusChange(!user.isActive)}> {/* Durumu Tersine Çevir */} 
          {user.isActive ? 
             <><ShieldOff className="mr-2 h-4 w-4 text-destructive" /> Pasif Yap</> : 
             <><ShieldCheck className="mr-2 h-4 w-4 text-green-600" /> Aktif Yap</>
          }
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleDeleteUser} className="text-destructive focus:text-destructive focus:bg-destructive/10">
           <Trash2 className="mr-2 h-4 w-4" />
          Kullanıcıyı Sil
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 