import { describe, it, expect } from 'vitest';
import { parseAndValidateLLMOutput } from '../src/schema/risk-report';
describe('JSON Şema ve Deterministik Doğrulama (Zod Validation Suite)', () => {
    it('Geçerli bir JSON çıktısını başarıyla ayrıştırıp şemaya göre onaylamalıdır', () => {
        const validRawJson = JSON.stringify({
            title: 'Spotify Kullanım Şartları Analizi',
            summary: 'Bu sözleşme genel olarak veri paylaşımı ve tahkim şartları içermektedir.',
            overallScore: 65,
            clauses: [
                {
                    title: 'Otomatik Yenileme',
                    category: 'AUTO_RENEWAL_CANCELLATION',
                    riskLevel: 'MEDIUM',
                    plainExplanation: 'Aboneliğiniz her ay otomatik olarak uzatılır.',
                    exactQuote: 'Your subscription will automatically renew at the end of the subscription period.',
                    confidence: 90,
                },
            ],
            potentialInjectionDetected: false,
        });
        const result = parseAndValidateLLMOutput(validRawJson);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.overallScore).toBe(65);
            expect(result.data.clauses.length).toBe(1);
        }
    });
    it('Markdown code block (```json ... ```) içine sarılmış çıktıyı başarıyla temizlemelidir', () => {
        const wrappedJson = `\`\`\`json
    {
      "title": "Temizlenmiş Test Raporu",
      "summary": "Geçerli bir özet metni buraya yazılmıştır.",
      "overallScore": 30,
      "clauses": [],
      "potentialInjectionDetected": false
    }
    \`\`\``;
        const result = parseAndValidateLLMOutput(wrappedJson);
        expect(result.success).toBe(true);
    });
    it('Serbest metin veya bozuk JSON verildiğinde deterministik olarak hata fırlatmalıdır', () => {
        const freeText = 'Sayın kullanıcı, yaptığım incelemeye göre bu sözleşmede 3 risk var...';
        const result = parseAndValidateLLMOutput(freeText);
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toContain('JSON Ayrıştırma Hatası');
        }
    });
    it('Zorunlu alanları eksik veya geçersiz enum içeren JSON çıktısını reddetmelidir', () => {
        const invalidSchemaJson = JSON.stringify({
            title: 'Eksik Rapor',
            // summary eksik
            overallScore: 120, // 100'den büyük olamaz
            clauses: [
                {
                    title: 'Hatalı Madde',
                    category: 'GEÇERSİZ_KATEGORİ',
                    riskLevel: 'VERY_DANGEROUS', // Enumda yok
                    plainExplanation: 'Kısa', // 10 karakterden az
                    exactQuote: 'Test',
                    confidence: 50,
                },
            ],
        });
        const result = parseAndValidateLLMOutput(invalidSchemaJson);
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toContain('JSON Şema Uyuşmazlığı');
        }
    });
});
