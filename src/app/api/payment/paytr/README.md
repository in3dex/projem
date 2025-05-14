# PayTR API Entegrasyonu

Bu klasör, PayTR ödeme entegrasyonu için gerekli tüm API endpoint'lerini içerir.

## Genel Bakış

PayTR entegrasyonu aşağıdaki endpoint'leri içerir:

- `create-token`: Yeni abonelik için PayTR ödeme tokenı oluşturur
- `pay-invoice`: Var olan fatura için PayTR ödeme tokenı oluşturur
- `callback`: PayTR'dan gelen ödeme sonuçlarını işler
- `process-test-payment`: Test modunda ödeme simülasyonu yapar
- `settings`: PayTR ayarlarını getirir

## Endpoint'ler

### `/api/payment/paytr/create-token`

**Açıklama**: Yeni bir abonelik oluşturmak için PayTR ödeme tokenı oluşturur.

**Request**:
```json
{
  "planId": "string",  
  "totalAmount": 1000, // Kuruş olarak
  "pendingSubscriptionId": "string" // Opsiyonel
}
```

**Response**:
```json
{
  "status": "success",
  "token": "paytr-token",
  "merchant_oid": "ORDER123abc"
}
```

### `/api/payment/paytr/pay-invoice`

**Açıklama**: Var olan bir fatura için PayTR ödeme tokenı oluşturur.

**Request**:
```json
{
  "merchant_oid": "subscription_id_timestamp"
}
```

**Response**:
```json
{
  "status": "success",
  "token": "paytr-token",
  "merchant_oid": "subscription_id_timestamp",
  "invoice_id": "invoice_id"
}
```

### `/api/payment/paytr/callback`

**Açıklama**: PayTR'dan gelen ödeme bildirimleri için webhook. Bu endpoint doğrudan PayTR tarafından çağrılır.

**Form Data**:
```
merchant_oid
status
total_amount
hash
...
```

**Response**:
```
"OK"
```

### `/api/payment/paytr/process-test-payment`

**Açıklama**: Test modunda ödeme simülasyonu yapan endpoint.

**Request**:
```json
{
  "merchant_oid": "merchant_oid_from_token_request"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Test ödemesi başarıyla işlendi",
  "subscriptionId": "subscription_id"
}
```

### `/api/payment/paytr/settings`

**Açıklama**: PayTR ayarlarını getirir.

**Response**:
```json
{
  "success": true,
  "isTestMode": true,
  "callbackUrl": "https://domain.com/api/payment/paytr/callback",
  "paytrActive": true
}
```

## Kullanım Örneği

1. Frontend'den `/api/payment/paytr/create-token` veya `/api/payment/paytr/pay-invoice` endpointine istek gönderilir
2. Dönen token ile iframe gösterilir: `<iframe src="https://www.paytr.com/odeme/guvenli/{TOKEN}"></iframe>`
3. Ödeme başarılı/başarısız olduğunda PayTR, `/api/payment/paytr/callback` endpointini çağırır
4. Kullanıcı başarılı ödeme sonrasında `/odeme/basarili` sayfasına yönlendirilir

## Test Modu

PayTR test modunda gerçek ödeme işlemi yapılamaz. Bu durumda `/api/payment/paytr/process-test-payment` endpointi kullanılarak başarılı bir ödeme simüle edilebilir.

## Eski Endpoint

`/api/paytr/get-token` endpointi artık kullanımdan kaldırılmış ve yerini `/api/payment/paytr/pay-invoice` endpointi almıştır. Geriye dönük uyumluluk için eski endpoint korunmuş olup, yeni endpointe yönlendirme yapmaktadır. 