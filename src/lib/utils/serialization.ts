/**
 * Bir nesne içindeki tüm BigInt değerlerini string'e çevirir.
 * JSON.stringify'ın BigInt desteği olmadığı için kullanılır.
 * @param obj Dönüştürülecek nesne
 * @returns BigInt değerleri string'e çevrilmiş yeni nesne
 */
export function serializeBigInts<T>(obj: T): any {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(serializeBigInts);
    }

    const newObj: { [key: string]: any } = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const value = obj[key];
            if (typeof value === 'bigint') {
                newObj[key] = value.toString();
            } else if (typeof value === 'object') {
                newObj[key] = serializeBigInts(value);
            } else {
                newObj[key] = value;
            }
        }
    }
    return newObj;
} 