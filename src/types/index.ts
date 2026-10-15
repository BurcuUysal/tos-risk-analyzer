export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type RiskCategory =
  | 'DATA_PRIVACY_SHARING'      // Kişisel verilerin satışı, 3. taraflarla paylaşımı, reklam hedefleme
  | 'AUTO_RENEWAL_CANCELLATION'  // Otomatik yenileme, gizli ücretler, zor/imkansız iptal süreçleri
  | 'ARBITRATION_CLASS_ACTION'   // Zorunlu tahkim, mahkeme ve toplu dava hakkından feragat
  | 'IP_CONTENT_RIGHTS'          // Kullanıcı içeriklerinin mülkiyetini alma, telifsiz sınırsız lisans
  | 'UNILATERAL_CHANGES'         // Kullanıcıya bildirmeden şartları tek taraflı değiştirme hakkı
  | 'LIABILITY_WARRANTY'         // Şirketin hiçbir sorumluluk kabul etmemesi, 'as-is' koşulu
  | 'ACCOUNT_TERMINATION'        // Önceden haber vermeksizin ve gerekçesiz hesap kapatma/içeriği silme
  | 'SECURITY_INJECTION_ALERT';  // Metin içine gizlenmiş prompt injection veya şüpheli talimat

export type VerificationStatus =
  | 'VERIFIED_MATCH'              // Alıntı orijinal metinde harfi harfine / deterministik olarak doğrulandı
  | 'PARTIAL_MATCH'               // Alıntı küçük noktalama/boşluk farklarıyla bulundu
  | 'UNVERIFIED_HALLUCINATION'    // Alıntı metinde YOK (Model halüsinasyonu - geçersiz sayılır!)
  | 'SUSPICIOUS_PROMPT_INJECTION';// Sayfadaki gizli talimattan kaynaklanan manipülasyon teşebbüsü

export interface RiskClause {
  id: string;
  title: string;
  category: RiskCategory;
  riskLevel: RiskLevel;
  plainExplanation: string;       // Sade Türkçe açıklama
  exactQuote: string;             // Orijinal ToS metninden alıntı
  verificationStatus: VerificationStatus;
  confidence: number;             // Modelin güven puanı (0-100)
  matchLocation?: {
    startIndex: number;
    endIndex: number;
  };
  rejectionReason?: string;       // Eğer doğrulanamadıysa nedeni
}

export interface RiskReport {
  overallScore: number;           // 0 (Çok Güvenli) - 100 (Aşırı Riskli)
  overallLevel: RiskLevel;
  title: string;
  summary: string;                // Sade Türkçe genel değerlendirme
  legalDisclaimer: string;        // "Bu uygulama hukuki tavsiye vermez..."
  clauses: RiskClause[];
  verifiedClauseCount: number;
  rejectedClauseCount: number;
  securityNotice?: string;        // Prompt injection ya da gizli talimat uyarısı
  analyzedAt: string;
  sourceUrl?: string;
  pageCharCount: number;
}

export interface AnalysisRequest {
  documentText: string;
  sourceUrl?: string;
  customApiKey?: string;
  modelProvider?: 'gemini' | 'openai' | 'mock';
}
