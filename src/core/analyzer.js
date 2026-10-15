import { LLMClient } from './llm-client';
import { verifyAllClauses } from './quote-verifier';
import { inspectForPromptInjection } from './injection-guard';
export const LEGAL_DISCLAIMER_TEXT = 'Bu uygulama hukuki tavsiye vermez. Yalnızca yapay zekâ ve deterministik doğrulama yöntemleriyle hazırlanmış bilgilendirme amaçlı bir risk analizi sunar. Hukuki bağlayıcılığı olan kararlarınız için lütfen yetkili bir hukukçuya danışınız.';
export class DocumentRiskAnalyzer {
    llmClient;
    constructor(config) {
        this.llmClient = new LLMClient(config);
    }
    updateConfig(config) {
        this.llmClient.setConfig(config);
    }
    /**
     * Tüm analiz boru hattını (pipeline) baştan sona icra eder:
     * 1. Güvenlik & Prompt Injection Taraması
     * 2. LLM Analizi (JSON Şema güvencesiyle)
     * 3. Deterministik Alıntı Doğrulayıcı (Alıntısı olmayan iddialar elenir)
     * 4. Hukuki Feragatname ve Nihai Rapor Üretimi
     */
    async analyze(documentText, sourceUrl) {
        if (!documentText || documentText.trim().length < 20) {
            throw new Error('Analiz edilecek metin çok kısa veya boş. Lütfen geçerli bir metin sağlayın.');
        }
        // 1. Prompt Injection & Gizli Komut Taraması
        const injectionCheck = inspectForPromptInjection(documentText);
        // 2. LLM Çağrısı (Zod ile şema kontrolü yapılmış)
        const rawResult = await this.llmClient.analyzeDocument(documentText);
        // 3. Deterministik Alıntı Doğrulama
        const verification = verifyAllClauses(documentText, rawResult.clauses);
        // 4. Eğer injection tespit edildiyse ve model listeye eklemediyse güvenlik maddesi ekle
        const finalVerifiedClauses = [...verification.verifiedClauses];
        if (injectionCheck.hasSuspiciousPayload) {
            finalVerifiedClauses.unshift({
                id: `security-alert-${Date.now()}`,
                title: 'Sayfa İçi Gizli Talimat / Prompt Injection Teşebbüsü',
                category: 'SECURITY_INJECTION_ALERT',
                riskLevel: 'CRITICAL',
                plainExplanation: 'Bu sayfada yapay zekayı aldatmaya yönelik gizli direktifler saptandı (örn. kendini zararsız gösterme veya talimatları unutturma çabası). Bu durum siteye olan güveni ciddi ölçüde sarsmaktadır.',
                exactQuote: injectionCheck.patternsFound.join('; '),
                verificationStatus: 'VERIFIED_MATCH',
                confidence: 100,
            });
        }
        // 5. Risk Seviyesini ve Skorunu Hesapla
        let calculatedScore = rawResult.overallScore;
        if (injectionCheck.hasSuspiciousPayload) {
            calculatedScore = Math.max(calculatedScore, 85);
        }
        let overallLevel = 'LOW';
        if (calculatedScore >= 75)
            overallLevel = 'CRITICAL';
        else if (calculatedScore >= 50)
            overallLevel = 'HIGH';
        else if (calculatedScore >= 25)
            overallLevel = 'MEDIUM';
        return {
            overallScore: calculatedScore,
            overallLevel,
            title: rawResult.title || 'Kullanım Koşulları & Gizlilik Politikası Risk Raporu',
            summary: rawResult.summary,
            legalDisclaimer: LEGAL_DISCLAIMER_TEXT,
            clauses: finalVerifiedClauses,
            verifiedClauseCount: verification.verifiedCount,
            rejectedClauseCount: verification.rejectedCount,
            securityNotice: injectionCheck.hasSuspiciousPayload
                ? injectionCheck.securityRecommendation
                : undefined,
            analyzedAt: new Date().toISOString(),
            sourceUrl,
            pageCharCount: documentText.length,
        };
    }
}
