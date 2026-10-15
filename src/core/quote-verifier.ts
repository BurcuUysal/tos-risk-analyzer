import { LLMRawClause } from '../schema/risk-report';
import { RiskClause, VerificationStatus } from '../types';

export interface QuoteVerificationResult {
  verifiedClauses: RiskClause[];
  rejectedClauses: RiskClause[];
  totalChecked: number;
  verifiedCount: number;
  rejectedCount: number;
  verificationRate: number; // 0 - 1.0 (Yüzde doğruluk oranı)
}

/**
 * Metinleri deterministik arama için normalleştirir.
 * Çoklu boşlukları, özel satır sonlarını ve Unicode tırnak işaretlerini standartlaştırır.
 */
export function normalizeText(text: string): string {
  return text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u00A0/g, ' ') // non-breaking space
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Verilen alıntının orijinal metinde geçip geçmediğini deterministik olarak doğrular.
 * Alıntı metinde birebir veya normalize edilmiş olarak bulunamazsa GEÇERSİZ kabul edilir.
 */
export function verifySingleQuote(
  originalDocText: string,
  exactQuote: string
): {
  status: VerificationStatus;
  matchLocation?: { startIndex: number; endIndex: number };
  reason?: string;
} {
  if (!exactQuote || exactQuote.trim().length < 5) {
    return {
      status: 'UNVERIFIED_HALLUCINATION',
      reason: 'Alıntı metni çok kısa veya boş (En az 5 karakter gerekli).',
    };
  }

  const trimmedQuote = exactQuote.trim();

  // 1. Doğrudan Birebir Tam Eşleşme (Exact Verbatim Match)
  const exactIndex = originalDocText.indexOf(trimmedQuote);
  if (exactIndex !== -1) {
    return {
      status: 'VERIFIED_MATCH',
      matchLocation: {
        startIndex: exactIndex,
        endIndex: exactIndex + trimmedQuote.length,
      },
    };
  }

  // 2. Büyük/Küçük harf duyarsız eşleşme
  const lowerDoc = originalDocText.toLowerCase();
  const lowerQuote = trimmedQuote.toLowerCase();
  const caseInsensitiveIndex = lowerDoc.indexOf(lowerQuote);
  if (caseInsensitiveIndex !== -1) {
    return {
      status: 'VERIFIED_MATCH',
      matchLocation: {
        startIndex: caseInsensitiveIndex,
        endIndex: caseInsensitiveIndex + trimmedQuote.length,
      },
    };
  }

  // 3. Normalize Edilmiş Eşleşme (Whitespace & Unicode normalizasyonu)
  const normDoc = normalizeText(originalDocText);
  const normQuote = normalizeText(trimmedQuote);
  const normIndex = normDoc.indexOf(normQuote);

  if (normIndex !== -1) {
    return {
      status: 'PARTIAL_MATCH',
      reason: 'Alıntı metinde bulundu (Boşluk/noktalama normalizasyonu ile doğrulandı).',
    };
  }

  // 4. Parçalı Alt Eşleşme Kontrolü (LLM cümlenin başını veya sonunu hafif değiştirmişse)
  // Eğer alıntının ilk 40 karakteri metinde varsa ama tamamı yoksa kısmi belirsizlik durumu
  if (normQuote.length > 50) {
    const head = normQuote.slice(0, 40);
    if (normDoc.includes(head)) {
      return {
        status: 'UNVERIFIED_HALLUCINATION',
        reason: 'Alıntının sadece bir kısmı metinde bulundu, tamamı uyuşmuyor (Kısmi halüsinasyon).',
      };
    }
  }

  // Hiçbir şekilde bulunamadı -> Kesinlikle Halüsinasyon / Geçersiz İddia
  return {
    status: 'UNVERIFIED_HALLUCINATION',
    reason: 'Alıntı orijinal ToS metninde bulunamadı. Kural gereği doğrulanamayan iddia geçersiz sayıldı.',
  };
}

/**
 * LLM çıktısındaki tüm maddeleri deterministik kontrolden geçirir.
 * Alıntısı metinde bulunmayan maddeleri reddedilenler listesine ayırır.
 */
export function verifyAllClauses(
  originalDocText: string,
  rawClauses: LLMRawClause[]
): QuoteVerificationResult {
  const verifiedClauses: RiskClause[] = [];
  const rejectedClauses: RiskClause[] = [];

  rawClauses.forEach((raw, idx) => {
    const verification = verifySingleQuote(originalDocText, raw.exactQuote);

    const clause: RiskClause = {
      id: `clause-${idx + 1}-${Date.now()}`,
      title: raw.title,
      category: raw.category,
      riskLevel: raw.riskLevel,
      plainExplanation: raw.plainExplanation,
      exactQuote: raw.exactQuote,
      confidence: raw.confidence,
      verificationStatus: verification.status,
      matchLocation: verification.matchLocation,
      rejectionReason: verification.reason,
    };

    if (verification.status === 'VERIFIED_MATCH' || verification.status === 'PARTIAL_MATCH') {
      verifiedClauses.push(clause);
    } else {
      rejectedClauses.push(clause);
    }
  });

  const totalChecked = rawClauses.length;
  const verifiedCount = verifiedClauses.length;
  const rejectedCount = rejectedClauses.length;
  const verificationRate = totalChecked > 0 ? verifiedCount / totalChecked : 1.0;

  return {
    verifiedClauses,
    rejectedClauses,
    totalChecked,
    verifiedCount,
    rejectedCount,
    verificationRate,
  };
}
