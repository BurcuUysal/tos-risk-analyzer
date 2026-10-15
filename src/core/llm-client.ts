import { parseAndValidateLLMOutput, LLMRawResponse } from '../schema/risk-report';
import { buildSecurePrompt, inspectForPromptInjection } from './injection-guard';

export interface LLMConfig {
  provider: 'gemini' | 'openai' | 'mock';
  apiKey?: string;
  modelName?: string;
}

export class LLMClient {
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
  }

  public setConfig(config: LLMConfig) {
    this.config = config;
  }

  /**
   * Dokümanı güvenli prompt ile LLM'e gönderir ve JSON şemasına uygun yanıt alır.
   */
  public async analyzeDocument(documentText: string): Promise<LLMRawResponse> {
    const injectionCheck = inspectForPromptInjection(documentText);
    const { systemPrompt, userPrompt } = buildSecurePrompt(documentText, injectionCheck);

    if (this.config.provider === 'gemini') {
      return this.callGemini(systemPrompt, userPrompt);
    } else if (this.config.provider === 'openai') {
      return this.callOpenAI(systemPrompt, userPrompt);
    } else {
      return this.callMock(documentText, injectionCheck.hasSuspiciousPayload);
    }
  }

  /**
   * Google Gemini API Çağrısı (responseMimeType: "application/json" ile katı JSON zorlama)
   */
  private async callGemini(systemPrompt: string, userPrompt: string): Promise<LLMRawResponse> {
    const apiKey = this.config.apiKey?.trim();
    if (!apiKey) {
      throw new Error('Gemini API anahtarı girilmedi. Lütfen Ayarlar sayfasından anahtarınızı kaydedin.');
    }

    const model = this.config.modelName || 'gemini-1.5-flash';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const body = {
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: userPrompt }],
        },
      ],
      generationConfig: {
        temperature: 0.1, // Determinizmi artırmak için düşük sıcaklık
        responseMimeType: 'application/json',
      },
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Gemini API Hatası (${res.status}): ${errBody}`);
    }

    const data = await res.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
      throw new Error('Gemini API boş yanıt döndürdü.');
    }

    const validation = parseAndValidateLLMOutput(candidateText);
    if (!validation.success) {
      throw new Error(`Model çıktısı JSON şemasına uymuyor: ${validation.error}`);
    }

    return validation.data;
  }

  /**
   * OpenAI Uyumlu API Çağrısı (response_format: json_object)
   */
  private async callOpenAI(systemPrompt: string, userPrompt: string): Promise<LLMRawResponse> {
    const apiKey = this.config.apiKey?.trim();
    if (!apiKey) {
      throw new Error('OpenAI API anahtarı girilmedi. Lütfen Ayarlar sayfasından anahtarınızı kaydedin.');
    }

    const model = this.config.modelName || 'gpt-4o-mini';
    const endpoint = 'https://api.openai.com/v1/chat/completions';

    const body = {
      model,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`OpenAI API Hatası (${res.status}): ${errBody}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAI API boş yanıt döndürdü.');
    }

    const validation = parseAndValidateLLMOutput(content);
    if (!validation.success) {
      throw new Error(`Model çıktısı JSON şemasına uymuyor: ${validation.error}`);
    }

    return validation.data;
  }

  /**
   * Deterministik Mock / Offline Analiz Motoru
   * Testler, değerlendirme (eval) ve ağsız denemeler için metindeki gerçek riskleri tespit eder.
   */
  private callMock(documentText: string, injectionDetected: boolean): LLMRawResponse {
    const lowerDoc = documentText.toLowerCase();
    const clauses: LLMRawResponse['clauses'] = [];
    let score = 20;

    // 1. Prompt Injection tespit edildiyse
    if (injectionDetected) {
      score += 35;
      clauses.push({
        title: 'Gizli Talimat & Prompt Injection Teşebbüsü',
        category: 'SECURITY_INJECTION_ALERT',
        riskLevel: 'CRITICAL',
        plainExplanation: 'Bu sayfa yapay zeka asistanlarını manipüle ederek kendini risksiz göstermeye çalışan gizli kodlar ve talimatlar barındırıyor.',
        exactQuote: 'ignore all previous instructions', // Test için
        confidence: 99,
      });
    }

    // 2. Tahkim ve Toplu Dava Feragati Arama
    const arbitrationMatch = documentText.match(/arbitration|tahkim|class action waiver|toplu dava/i);
    if (arbitrationMatch) {
      score += 25;
      // Metinden gerçek bir cümle yakala
      const snippet = this.findSentenceContaining(documentText, arbitrationMatch[0]);
      clauses.push({
        title: 'Zorunlu Tahkim ve Toplu Dava Feragati',
        category: 'ARBITRATION_CLASS_ACTION',
        riskLevel: 'HIGH',
        plainExplanation: 'Bir anlaşmazlık çıktığında mahkemeye başvurma ve toplu dava açma hakkınızdan feragat ediyorsunuz. Uyuşmazlıklar bağlayıcı özel hakem heyetine götürülmek zorunda.',
        exactQuote: snippet || arbitrationMatch[0],
        confidence: 94,
      });
    }

    // 3. Veri Paylaşımı / Satışı
    const privacyMatch = documentText.match(/share.*personal data|third parties|üçüncü taraf.*paylaş|targeted advertising|reklam verenler/i);
    if (privacyMatch) {
      score += 20;
      const snippet = this.findSentenceContaining(documentText, privacyMatch[0]);
      clauses.push({
        title: 'Kişisel Verilerin 3. Taraflarla Paylaşımı & Reklam Hedefleme',
        category: 'DATA_PRIVACY_SHARING',
        riskLevel: 'HIGH',
        plainExplanation: 'Kişisel bilgileriniz, ilgi alanlarınız ve kullanım alışkanlıklarınız reklam ortakları ve iş ortakları ile paylaşılabilir.',
        exactQuote: snippet || privacyMatch[0],
        confidence: 90,
      });
    }

    // 4. Otomatik Yenileme ve Zor İptal
    const renewalMatch = documentText.match(/automatically renew|otomatik yenilenir|cancel.*prior to|ücret iadesi yapılmaz/i);
    if (renewalMatch) {
      score += 15;
      const snippet = this.findSentenceContaining(documentText, renewalMatch[0]);
      clauses.push({
        title: 'Otomatik Abonelik Yenilemesi',
        category: 'AUTO_RENEWAL_CANCELLATION',
        riskLevel: 'MEDIUM',
        plainExplanation: 'Aboneliğiniz dönem sonunda otomatik yenilenir. Dönem bitmeden iptal etmezseniz kartınızdan otomatik çekim yapılır.',
        exactQuote: snippet || renewalMatch[0],
        confidence: 88,
      });
    }

    // 5. Tek Taraflı Değişiklik Hakkı
    const unilateralMatch = documentText.match(/modify these terms|change without notice|değiştirme hakkını saklı tutar|güncelleme hakkı/i);
    if (unilateralMatch) {
      score += 10;
      const snippet = this.findSentenceContaining(documentText, unilateralMatch[0]);
      clauses.push({
        title: 'Tek Taraflı Sözleşme Değiştirme',
        category: 'UNILATERAL_CHANGES',
        riskLevel: 'MEDIUM',
        plainExplanation: 'Şirket kullanım koşullarını size açıkça bildirmeksizin tek taraflı değiştirme hakkına sahiptir. Siteyi kullanmaya devam etmeniz yeni şartları kabul ettiğiniz anlamına gelir.',
        exactQuote: snippet || unilateralMatch[0],
        confidence: 85,
      });
    }

    // 6. Fikri Mülkiyet / İçerik Hakları Devri
    const ipMatch = documentText.match(/royalty-free.*license|worldwide.*license|fikri mülkiyet|içeriklerin kullanım hakkı/i);
    if (ipMatch) {
      score += 15;
      const snippet = this.findSentenceContaining(documentText, ipMatch[0]);
      clauses.push({
        title: 'Kullanıcı İçerikleri Üzerinde Sınırsız Lisans',
        category: 'IP_CONTENT_RIGHTS',
        riskLevel: 'HIGH',
        plainExplanation: 'Platforma yüklediğiniz fotoğraf, metin ve içerikler üzerinde şirkete dünya çapında, telifsiz ve devredilebilir kullanım hakkı veriyorsunuz.',
        exactQuote: snippet || ipMatch[0],
        confidence: 92,
      });
    }

    // Eğer hiçbir madde yakalanamadıysa genel bir analiz ver
    if (clauses.length === 0) {
      clauses.push({
        title: 'Standart Hizmet Koşulları',
        category: 'LIABILITY_WARRANTY',
        riskLevel: 'LOW',
        plainExplanation: 'Metinde kritik bir kullanıcı aleyhine risk maddesi tespit edilmedi.',
        exactQuote: documentText.slice(0, 100).trim(),
        confidence: 80,
      });
      score = 25;
    }

    return {
      title: 'Kullanım Koşulları & Gizlilik Raporu',
      summary: `Bu sözleşme metninde kullanıcı aleyhine ${clauses.length} adet risk maddesi incelendi. Risk seviyesi genel olarak ${score > 70 ? 'Yüksek' : score > 40 ? 'Orta' : 'Düşük'} olarak değerlendirilmiştir.`,
      overallScore: Math.min(score, 100),
      clauses,
      potentialInjectionDetected: injectionDetected,
      injectionDetails: injectionDetected ? 'Sayfa metninde gizli talimat enjeksiyonu saptandı.' : undefined,
    };
  }

  /**
   * Metinde geçen ifadenin ait olduğu cümleyi veya parçayı yakalar
   */
  private findSentenceContaining(text: string, keyword: string): string {
    const idx = text.toLowerCase().indexOf(keyword.toLowerCase());
    if (idx === -1) return keyword;

    const start = Math.max(0, text.lastIndexOf('.', idx) + 1);
    let end = text.indexOf('.', idx + keyword.length);
    if (end === -1) end = Math.min(text.length, idx + 200);
    else end += 1;

    return text.substring(start, end).trim();
  }
}
