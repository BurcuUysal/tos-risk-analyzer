import { z } from 'zod';

export const RiskLevelSchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

export const RiskCategorySchema = z.enum([
  'DATA_PRIVACY_SHARING',
  'AUTO_RENEWAL_CANCELLATION',
  'ARBITRATION_CLASS_ACTION',
  'IP_CONTENT_RIGHTS',
  'UNILATERAL_CHANGES',
  'LIABILITY_WARRANTY',
  'ACCOUNT_TERMINATION',
  'SECURITY_INJECTION_ALERT',
]);

/**
 * LLM'den beklenen katı JSON şeması.
 * Serbest metin kabul edilmez, doğrudan bu şemaya uyması zorunludur.
 */
export const LLMRawClauseSchema = z.object({
  title: z.string().min(3).max(120).describe('Maddenin kısa, net başlığı'),
  category: RiskCategorySchema.describe('Risk kategorisi'),
  riskLevel: RiskLevelSchema.describe('Risk seviyesi: LOW, MEDIUM, HIGH, CRITICAL'),
  plainExplanation: z.string().min(10).max(600).describe('Kullanıcı için sade ve anlaşılır Türkçe açıklama'),
  exactQuote: z.string().min(5).max(1200).describe('Sayfa metninden harfi harfine (verbatim) yapılmış alıntı'),
  confidence: z.number().min(0).max(100).describe('Tespit güven puanı (0-100)'),
});

export const LLMRawResponseSchema = z.object({
  title: z.string().default('Kullanım Koşulları & Gizlilik Risk Analizi'),
  summary: z.string().min(20).describe('Tüm sözleşmenin sade Türkçe risk özeti'),
  overallScore: z.number().min(0).max(100).describe('0-100 arası genel risk puanı'),
  clauses: z.array(LLMRawClauseSchema).describe('Tespit edilen riskli maddeler'),
  potentialInjectionDetected: z.boolean().default(false).describe('Metinde sisteme yönelik manipülatif veya gizli talimat sezildi mi?'),
  injectionDetails: z.string().optional().describe('Sezilen şüpheli talimat varsa açıklaması'),
});

export type LLMRawResponse = z.infer<typeof LLMRawResponseSchema>;
export type LLMRawClause = z.infer<typeof LLMRawClauseSchema>;

/**
 * LLM'in JSON çıktısını ayrıştıran ve Zod şeması ile doğrulayan yardımcı fonksiyon.
 * JSON code fence (```json ... ```) temizliği yapar.
 */
export function parseAndValidateLLMOutput(rawText: string): { success: true; data: LLMRawResponse } | { success: false; error: string } {
  try {
    let clean = rawText.trim();
    if (clean.startsWith('```json')) {
      clean = clean.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    } else if (clean.startsWith('```')) {
      clean = clean.replace(/^```\s*/i, '').replace(/```\s*$/, '').trim();
    }

    const parsedJson = JSON.parse(clean);
    const validationResult = LLMRawResponseSchema.safeParse(parsedJson);

    if (!validationResult.success) {
      return {
        success: false,
        error: `JSON Şema Uyuşmazlığı: ${validationResult.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ')}`,
      };
    }

    return {
      success: true,
      data: validationResult.data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: `JSON Ayrıştırma Hatası: ${err.message || String(err)}`,
    };
  }
}
