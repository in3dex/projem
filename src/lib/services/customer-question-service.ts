import { PrismaClient, Product, CustomerQuestion, ApiSettings } from '@prisma/client'
import { TrendyolApiClientService } from '@/lib/services/trendyol-api-client'

// Trendyol API'den gelen soru tipi (Dokümantasyona göre genişletilebilir)
interface TrendyolQuestion {
  id: number
  text: string
  creationDate: number // Timestamp (millisecond)
  status: string
  answer?: {
    id: number
    text: string
    creationDate: number // Timestamp (millisecond)
  }
  productName: string
  productMainId: string
  imageUrl?: string
  userName?: string
  showUserName: boolean
  webUrl?: string
  customerId?: number
}

interface TrendyolQuestionsResponse {
  content: TrendyolQuestion[]
  totalPages: number
  totalElements: number
  page: number
  size: number
}

export class CustomerQuestionService {
  private prisma: PrismaClient
  private apiClient: TrendyolApiClientService
  private userId: string
  private apiSettings: ApiSettings

  constructor(userId: string, apiSettings: ApiSettings) {
    this.prisma = new PrismaClient()
    this.apiClient = new TrendyolApiClientService({ 
        apiKey: apiSettings.apiKey, 
        apiSecret: apiSettings.apiSecret, 
        sellerId: apiSettings.sellerID 
    })
    this.userId = userId
    this.apiSettings = apiSettings
  }

  /**
   * Trendyol'dan müşteri sorularını çeker ve veritabanına senkronize eder.
   * Belirli bir tarih aralığı veya statüye göre filtreleme yapabilir.
   */
  async syncCustomerQuestions(options: { startDate?: number, endDate?: number, status?: string, page?: number, size?: number } = {}): Promise<{ syncedCount: number, totalPages: number, currentPage: number }> {
    console.log('syncCustomerQuestions çağrıldı, seçenekler:', options)
    let syncedCount = 0
    let currentPage = options.page || 0
    const size = options.size || 50
    let totalPages = 1

    try {
      const endpoint = `/suppliers/${this.apiSettings.sellerID}/questions/filter`
      
      const params = {
          page: currentPage,
          size: size,
          ...(options.startDate && { startDate: options.startDate }),
          ...(options.endDate && { endDate: options.endDate }),
          ...(options.status && { status: options.status }),
          orderByField: 'CreatedDate',
          orderByDirection: 'DESC' 
      }

      const queryParams = new URLSearchParams()
      for (const key in params) {
        if (params.hasOwnProperty(key) && params[key as keyof typeof params] !== undefined) {
          queryParams.append(key, String(params[key as keyof typeof params]))
        }
      }
      const fullEndpoint = `${endpoint}?${queryParams.toString()}`

      console.log(`Trendyol API İsteği: GET ${fullEndpoint}`)
      const response: TrendyolQuestionsResponse = await this.apiClient.request<TrendyolQuestionsResponse>(fullEndpoint, 'GET')

      if (!response || response.page === undefined || response.totalPages === undefined || response.totalElements === undefined) {
          console.error("Trendyol API'den beklenen temel yanıt yapısı alınamadı:", response);
          throw new Error("Trendyol API'den geçersiz yanıt yapısı alındı.");
      }
      
      const questionsToProcess = response.content || [];

      console.log(`Trendyol API'den ${questionsToProcess.length} soru alındı. Sayfa: ${response.page}, Toplam Sayfa: ${response.totalPages}, Durum: ${options.status || 'TÜM SORULAR'}`) 

      totalPages = response.totalPages
      currentPage = response.page

      if (questionsToProcess.length > 0) {
        for (const question of questionsToProcess) {
          let product: Product | null = null
          if (question.productMainId) {
            product = await this.prisma.product.findFirst({
              where: {
                productMainId: question.productMainId,
                userId: this.userId
              }
            })
          }

          if (!product && question.productMainId) { 
              console.warn(`[Sync Questions] Ürün bulunamadı (productMainId: ${question.productMainId}). Soru (ID: ${question.id}) atlanıyor.`);
              continue;
          }

          const questionData = {
            userId: this.userId,
            trendyolQuestionId: BigInt(question.id),
            questionText: question.text,
            status: question.status,
            askedDate: new Date(question.creationDate),
            answerText: question.answer?.text,
            answeredDate: question.answer?.creationDate ? new Date(question.answer.creationDate) : undefined,
            trendyolAnswerId: question.answer?.id ? BigInt(question.answer.id) : undefined,
            customerName: question.showUserName ? question.userName : null,
            showUserName: question.showUserName,
            productName: question.productName,
            productImageUrl: question.imageUrl,
            productId: product?.id,
            webUrl: question.webUrl,
          }

          try {
              await this.prisma.customerQuestion.upsert({
                where: { trendyolQuestionId: BigInt(question.id), userId: this.userId },
                update: questionData,
                create: questionData
              })
              syncedCount++
          } catch (upsertError) {
              console.error(`[Sync Questions] Soru (ID: ${question.id}) kaydedilirken hata:`, upsertError);
          }
        }
      }
      console.log(`${syncedCount} soru veritabanına senkronize edildi/güncellendi.`)
      return { syncedCount, totalPages, currentPage }
    } catch (error: any) {
      console.error('Müşteri soruları senkronizasyonu sırasında hata:', error)
      if (error instanceof Error) {
        console.error('API Hatası Detayı:', error.message);
      }
      throw new Error(`Müşteri soruları senkronizasyonu başarısız: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Tüm soru durumları için senkronizasyon yapar (WAITING_FOR_ANSWER, ANSWERED, vs)
   * Bu fonksiyon ana senkronizasyon fonksiyonudur ve tüm durumlardaki soruları getirir
   */
  async syncAllQuestionTypes(): Promise<{ totalSynced: number }> {
    console.log('Tüm soru tipleri için senkronizasyon başlatılıyor...');
    let totalSynced = 0;
    
    try {
      // Önce bekleyen soruları senkronize et
      const waitingResult = await this.syncCustomerQuestions({ 
        status: 'WAITING_FOR_ANSWER',
        page: 0, 
        size: 50 
      });
      totalSynced += waitingResult.syncedCount;
      
      // Sonra cevaplanmış soruları senkronize et 
      const answeredResult = await this.syncCustomerQuestions({ 
        status: 'ANSWERED',
        page: 0, 
        size: 50 
      });
      totalSynced += answeredResult.syncedCount;
      
      // Diğer durumlar için de senkronizasyon yapılabilir: 
      // WAITING_FOR_APPROVE, REJECTED, REPORTED
      const waitingApproveResult = await this.syncCustomerQuestions({ 
        status: 'WAITING_FOR_APPROVE',
        page: 0, 
        size: 50 
      });
      totalSynced += waitingApproveResult.syncedCount;
      
      console.log(`Tüm soru tipleri senkronize edildi. Toplam: ${totalSynced} soru`);
      return { totalSynced };
    } catch (error) {
      console.error('Tüm soru tiplerini senkronize ederken hata:', error);
      throw error;
    }
  }

  /**
   * Veritabanındaki müşteri sorularını filtreleyerek ve sayfalayarak getirir.
   */
  async getCustomerQuestionsFromDb(options: { status?: string, page?: number, size?: number, searchTerm?: string }): Promise<{ questions: CustomerQuestion[], totalCount: number }> {
    const page = options.page || 1
    const size = options.size || 10
    const skip = (page - 1) * size

    const whereClause: any = {
      userId: this.userId,
    }

    if (options.status) {
      whereClause.status = options.status
    }

    if (options.searchTerm) {
      whereClause.OR = [
        { questionText: { contains: options.searchTerm } },
        { answerText: { contains: options.searchTerm } },
        { productName: { contains: options.searchTerm } },
        { customerName: { contains: options.searchTerm } },
      ]
    }

    const questions = await this.prisma.customerQuestion.findMany({
      where: whereClause,
      orderBy: {
        askedDate: 'desc'
      },
      skip: skip,
      take: size,
      include: {
      }
    })

    const totalCount = await this.prisma.customerQuestion.count({
      where: whereClause
    })

    return { questions, totalCount }
  }

  /**
   * Belirli bir müşteri sorusunu Trendyol API üzerinden cevaplar ve veritabanını günceller.
   * @param questionId Veritabanımızdaki sorunun ID'si
   * @param answerText Gönderilecek cevap metni
   */
  async answerQuestion(questionId: string, answerText: string): Promise<CustomerQuestion> {
    console.log(`answerQuestion çağrıldı: Soru ID: ${questionId}`) 

    if (answerText.length < 10 || answerText.length > 2000) {
      throw new Error("Cevap metni 10 ile 2000 karakter arasinda olmalidir.")
    }

    const question = await this.prisma.customerQuestion.findUnique({
      where: { id: questionId, userId: this.userId },
    })

    if (!question) {
      throw new Error("Soru bulunamadi veya bu kullaniciya ait degil.")
    }

    if (!question.trendyolQuestionId) {
      throw new Error("Sorunun Trendyol ID'si bulunamadi.")
    }

    // Sorunun durumunu kontrol et (zaten cevaplanmış olabilir)
    if (question.status !== 'WAITING_FOR_ANSWER') {
      // Soru zaten cevaplanmış veya farklı durumdaysa API'ye gönderme, ancak kullanıcıya yardımcı olmak için
      // yerel veritabanında güncelleme yap ve bilgilendirici mesaj döndür
      console.warn(`Soru (ID: ${questionId}) zaten cevaplanmış veya farklı bir durumda (${question.status}). API isteği gönderilmeyecek.`);
      
      // Eğer soru zaten cevaplanmışsa, mevcut cevabı güncellemek yerine senkronizasyon yapılır
      // Ancak burada yol olarak kullanıcıya düzgün bir yanıt vermeliyiz
      try {
        // Geri dönüş için güncel soru bilgilerini döndür (cevap güncellemeden)
        return await this.prisma.customerQuestion.update({
          where: { id: questionId },
          data: {
            // Sadece answerText'i güncelle, diğer durumu değiştirme
            answerText: answerText
          }
        });
      } catch (syncError) {
        console.error(`Zaten cevaplanmış veya farklı durumdaki soru (${questionId}) için durum güncelleme hatası:`, syncError);
        throw new Error(`Soru şu anda ${question.status} durumunda ve yanıtlanamaz.`);
      }
    }

    try {
      console.log(`Trendyol API'ye cevap gönderiliyor: Trendyol Soru ID: ${question.trendyolQuestionId}`) 
      const endpoint = `/suppliers/${this.apiSettings.sellerID}/questions/${question.trendyolQuestionId}/answers`

      const response = await this.apiClient.request<null>(endpoint, 'POST', { text: answerText })

      console.log('Trendyol API cevap gönderme başarılı:', response)

      const updatedQuestion = await this.prisma.customerQuestion.update({
        where: { id: questionId },
        data: {
          answerText: answerText,
          answeredDate: new Date(),
          status: 'WAITING_FOR_APPROVE'
        },
      })

      console.log(`Soru veritabanında güncellendi: ID ${questionId}`) 
      return updatedQuestion

    } catch (error: any) {
      console.error(`Soru cevaplama sırasında hata (Trendyol Soru ID: ${question.trendyolQuestionId}):`, error)
      
      // "has.already.answered" hatası için özel işleme
      if (error instanceof Error && (
          error.message.includes('has.already.answered') || 
          error.message.includes('Bu soru daha önce cevaplandı')
        )) {
          console.warn(`Trendyol API hatası: Soru ${question.trendyolQuestionId} zaten cevaplanmış. Veritabanı durumu güncelleniyor.`);
          
           try {
            // Zaten cevaplanmış soruyu güncellemek için senkronizasyon işlemi başlat
                await this.syncCustomerQuestions({ status: 'ANSWERED', page: 0, size: 10 });
            
            // Sorunun durumunu yerel veritabanında güncelle
                return await this.prisma.customerQuestion.update({
                    where: { id: questionId },
              data: { 
                status: 'ANSWERED',
                answerText: answerText, // Kullanıcının girmek istediği cevabı yine de kaydet
                answeredDate: new Date()
              }
                });
           } catch (syncError) {
                console.error(`Zaten cevaplanmış soru için (${questionId}) durum güncelleme hatası:`, syncError);
            throw new Error("Bu soru zaten yanıtlanmış. Sistem bilgileriniz güncellenirken bir hata oluştu.");
           }
       }
      
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Soru cevaplanirken bilinmeyen bir hata olustu.")
    }
  }

  // TODO: Tek bir soruyu ID ile getirme (getQuestionById)
} 