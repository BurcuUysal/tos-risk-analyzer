import { describe, it, expect } from 'vitest';
import { verifySingleQuote, verifyAllClauses } from '../src/core/quote-verifier';
describe('Deterministik Alıntı Doğrulayıcı (Deterministic Quote Verifier)', () => {
    const sampleDoc = `
    KULLANIM KOŞULLARI VE GİZLİLİK SÖZLEŞMESİ
    1. Otomatik Yenileme: Aboneliğiniz her ay otomatik olarak yenilenecektir. İptal etmek için faturalandırma tarihinden en az 48 saat önce bildirim yapmanız gerekmektedir. İade yapılmaz.
    2. Tahkim Şartı: Kullanıcı, işbu sözleşmeden doğan tüm uyuşmazlıklarda mahkemeye gitme ve toplu dava açma hakkından açıkça feragat eder. Tüm anlaşmazlıklar bağlayıcı hakem heyetince çözülür.
    3. Veri Paylaşımı: Toplanan kişisel verileriniz, reklam hedefleme ve pazarlama amacıyla üçüncü taraf iş ortaklarıyla paylaşılabilir.
  `;
    it('Orijinal metinde birebir bulunan alıntıyı VERIFIED_MATCH olarak onaylamalıdır', () => {
        const quote = 'Aboneliğiniz her ay otomatik olarak yenilenecektir.';
        const result = verifySingleQuote(sampleDoc, quote);
        expect(result.status).toBe('VERIFIED_MATCH');
        expect(result.matchLocation).toBeDefined();
        expect(result.matchLocation?.startIndex).toBeGreaterThan(0);
    });
    it('Farklı boşluk veya unicode tırnak içeren alıntıyı normalize ederek PARTIAL_MATCH ile onaylamalıdır', () => {
        // Birden fazla boşluk ve farklı satır sonu
        const quote = 'Aboneliğiniz   her  ay   otomatik olarak yenilenecektir.';
        const result = verifySingleQuote(sampleDoc, quote);
        expect(['VERIFIED_MATCH', 'PARTIAL_MATCH']).toContain(result.status);
    });
    it('Metinde OLMAYAN / Uydurulmuş alıntıyı kesinlikle UNVERIFIED_HALLUCINATION olarak reddetmelidir', () => {
        const fakeQuote = 'Şirket kullanıcıların kredi kartı şifrelerini açık metin olarak depolar.';
        const result = verifySingleQuote(sampleDoc, fakeQuote);
        expect(result.status).toBe('UNVERIFIED_HALLUCINATION');
        expect(result.reason).toContain('Alıntı orijinal ToS metninde bulunamadı');
    });
    it('Cümlenin sadece başı uyup devamı uydurma olan alıntıyı yakalayıp reddetmelidir', () => {
        const partialFakeQuote = 'Aboneliğiniz her ay otomatik olarak yenilenecektir ve şirket evinizi ipotek altına alabilir.';
        const result = verifySingleQuote(sampleDoc, partialFakeQuote);
        expect(result.status).toBe('UNVERIFIED_HALLUCINATION');
    });
    it('Tüm maddeleri süzüp sahte alıntıları deterministik olarak filtrelemelidir', () => {
        const rawClauses = [
            {
                title: 'Otomatik Yenileme',
                category: 'AUTO_RENEWAL_CANCELLATION',
                riskLevel: 'MEDIUM',
                plainExplanation: 'Aboneliğiniz otomatik yenilenir.',
                exactQuote: 'Aboneliğiniz her ay otomatik olarak yenilenecektir.', // GERÇEK
                confidence: 90,
            },
            {
                title: 'Uydurma Madde',
                category: 'ACCOUNT_TERMINATION',
                riskLevel: 'CRITICAL',
                plainExplanation: 'Bu madde metinde hiç yok.',
                exactQuote: 'Metinde asla geçmeyen tamamen uydurulmuş hayali bir cümle.', // SAHTE
                confidence: 80,
            },
            {
                title: 'Tahkim Zorunluluğu',
                category: 'ARBITRATION_CLASS_ACTION',
                riskLevel: 'HIGH',
                plainExplanation: 'Dava açamazsınız, hakeme gitmek zorundasınız.',
                exactQuote: 'Tüm anlaşmazlıklar bağlayıcı hakem heyetince çözülür.', // GERÇEK
                confidence: 95,
            },
        ];
        const result = verifyAllClauses(sampleDoc, rawClauses);
        expect(result.totalChecked).toBe(3);
        expect(result.verifiedCount).toBe(2);
        expect(result.rejectedCount).toBe(1);
        expect(result.verifiedClauses.map((c) => c.title)).toEqual([
            'Otomatik Yenileme',
            'Tahkim Zorunluluğu',
        ]);
        expect(result.rejectedClauses[0].title).toBe('Uydurma Madde');
        expect(result.rejectedClauses[0].verificationStatus).toBe('UNVERIFIED_HALLUCINATION');
    });
});
