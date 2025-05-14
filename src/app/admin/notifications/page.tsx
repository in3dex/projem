import { db } from "@/lib/db";
import { DataTable } from "@/components/ui/data-table"; 
import { columns, NotificationData } from "@/components/admin/notifications/columns"; // Oluşturulacak
// import { NotificationsTable } from "@/components/admin/notifications/notifications-table"; // Veya özel tablo

export const dynamic = "force-dynamic"; // Her zaman güncel veri için

// Admin bildirim sayfası için veri çekme
async function getNotifications() {
  try {
    const notifications = await db.notification.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } }, // Kullanıcı bilgisi ekleyelim
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    // Gelen veriyi NotificationData tipine cast edebiliriz (ilişkilerle birlikte)
    return notifications as NotificationData[]; 
  } catch (error) {
    console.error("Admin bildirimleri çekilirken hata:", error);
    return []; // Hata durumunda boş dizi dön
  }
}

export default async function AdminNotificationsPage() {
  const notifications = await getNotifications();

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Bildirimler Yönetimi</h2>
      <p className="text-sm text-muted-foreground">
        Sistemdeki tüm kullanıcı bildirimlerini görüntüleyin.
      </p>
      {/* Genel DataTable veya özel NotificationsTable kullanılabilir */}
      <DataTable 
          columns={columns} 
          data={notifications} 
          filterColumnId="message" // Varsayılan filtreleme sütunu (değiştirilebilir)
          filterPlaceholder="Mesaja göre filtrele..."
       /> 
      {/* <NotificationsTable columns={columns} data={notifications} /> */}
    </div>
  );
} 