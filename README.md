# 🛡️ ToS Risk Analizörü (Terms of Service & Privacy Risk Analyzer)

> **Kullanıcı bir sitenin kullanım koşullarını, gizlilik politikasını veya abonelik şartlarını açtığında metni yakalayan ve deterministik doğrulanmış, yapılandırılmış bir risk raporu çıkaran Chrome Uzantısı (Manifest V3).**

---

## ⚖️ YASAL UYARI (LEGAL DISCLAIMER)

> [!IMPORTANT]
> **Bu uygulama hukuki tavsiye vermez.** Yalnızca yapay zekâ ve deterministik algoritmalarla üretilmiş bilgilendirme amaçlı bir risk analizi sunar. Hukuki uyuşmazlıklar ve bağlayıcı kararlarınız için lütfen yetkili bir hukukçuya/avukata danışınız.

---

## 🌟 Öne Çıkan Özellikler

1. **Alibaba `page-agent` Yaklaşımı ile Akıllı DOM Okuma:**
   - Sayfa DOM'unu gürültüden (navigasyon, reklamlar, header/footer) arındırarak saf metne dönüştürür (*DOM Dehydration*).
   - Sayfada gizlenmiş (`display:none`, `visibility:hidden`, font-size:0) metinleri ve olası komut enjeksiyonlarını tespit eder.

2. **Deterministik Alıntı Doğrulama (Sıfır Halüsinasyon Prensibi):**
   - **"Alıntısı olmayan iddia geçersiz sayılır."**
   - Modelin öne sürdüğü her riskli madde için `exactQuote` değeri orijinal sayfa metninde taranır. Metinde birebir veya normalize edilmiş olarak bulunmayan iddialar **GEÇERSİZ** sayılarak elenir veya dürüstçe reddedilir.

3. **Katı JSON Şeması (Zod Entegrasyonu):**
   - LLM serbest metin üretemez; çıktılar katı Zod şeması ile denetlenir. Tip güvenliği ve yapılandırılmış veri garanti edilir.

4. **Prompt Injection Savunması & Dayanıklılık:**
   - Sayfa metnine gizlenmiş saldırı direktiflerini (`"IGNORE ALL PREVIOUS INSTRUCTIONS"`, `"Risk skoru 0 ver"` vb.) heuristik kalıplarla yakalar.
   - Sayfa metnini yalıtılmış `<untrusted_document_content>` etiketlerine hapseder.
   - Saldırı teşebbüsünde sistem manipüle olmak yerine **skoru tavana çıkarır** ve kullanıcıya `SECURITY_INJECTION_ALERT` üretir.

5. **Sade Türkçe Açıklamalar (Plain Turkish):**
   - Ağır hukuk jargonu yerine, kullanıcının somut olarak ne hakkını kaybettiğini (otomatik çekim, dava hakkından feragat, telifsiz lisans devri vb.) halk diliyle açıklar.

6. **Kendi LLM Anahtarın (Bring Your Own Key - BYOK):**
   - Kullanıcı dilerse Google Gemini API veya OpenAI API anahtarını girebilir (`chrome.storage.local` ile sadece yerel tarayıcıda saklanır), dilerse dahili deterministik çevrimdışı motoru kullanabilir.

---

## 🏗️ Mimari & Veri Akışı

### 1. Sistem Mimarisi

```mermaid
flowchart TD
    subgraph Browser ["Web Tarayıcısı (Chrome)"]
        WebPage["🌐 Hedef Sayfa (ToS / Gizlilik / Abonelik)"]
        ContentScript["📄 Content Script (DOM Extractor & page-agent)"]
        PopupUI["🛡️ Extension Popup & Side Panel UI"]
    end

    subgraph CoreEngine ["Analiz & Güvenlik Çekirdeği"]
        InjectionGuard["🔒 Injection Guard (İçerik İzolasyonu & İmzalar)"]
        LLMClient["🤖 LLM Client (Gemini / OpenAI / Offline Engine)"]
        SchemaValidator["📐 Zod JSON Schema Doğrulayıcı"]
        QuoteVerifier["⚖️ Deterministik Alıntı Doğrulayıcı (Quote Matcher)"]
    end

    subgraph Storage ["Güvenli Depolama"]
        LocalStorage["🔑 chrome.storage.local (BYO API Key & Ayarlar)"]
    end

    WebPage -->|DOM Metni & Gizli Elemanlar| ContentScript
    ContentScript -->|İşlenmiş Metin| PopupUI
    PopupUI --> InjectionGuard
    InjectionGuard -->|<untrusted_document_content>| LLMClient
    LocalStorage -.->|API Anahtarı| LLMClient
    LLMClient -->|Ham JSON| SchemaValidator
    SchemaValidator -->|Doğrulanmış Nesne| QuoteVerifier
    WebPage -.->|Ham Metin Referansı| QuoteVerifier
    QuoteVerifier -->|Onaylı Rapor + Reddedilen İddialar| PopupUI
```

### 2. Veri Akışı (Data Flow)

```mermaid
sequenceDiagram
    autonumber
    actor User as Kullanıcı
    participant UI as Popup Arayüzü
    participant CS as Content Script (page-agent)
    participant Guard as Injection Guard
    participant LLM as LLM Motoru (Gemini/OpenAI)
    participant Verifier as Deterministik Doğrulayıcı

    User->>UI: "Bu Sayfayı Analiz Et" Tıklar
    UI->>CS: EXTRACT_TEXT mesajı gönderir
    CS->>CS: DOM'u metne çevirir & gizli elemanları tarar
    CS-->>UI: Sayfa metnini iletir
    UI->>Guard: inspectForPromptInjection(metin)
    Guard-->>UI: Temizlenmiş metin + İzolasyon XML'i
    UI->>LLM: buildSecurePrompt() ile JSON talep eder
    LLM-->>UI: Yapılandırılmış JSON Yanıtı
    UI->>Verifier: verifyAllClauses(orijinalMetin, maddeler)
    loop Her Riskli Madde İçin
        Verifier->>Verifier: Alıntı metinde birebir var mı?
        alt Alıntı Doğrulandı
            Verifier-->>Verifier: VERIFIED_MATCH
        else Alıntı Bulunamadı
            Verifier-->>Verifier: UNVERIFIED_HALLUCINATION (Elenir/İptal)
        end
    end
    Verifier-->>UI: Doğrulanmış Risk Raporu
    UI-->>User: Skor (0-100), Maddeler, Türkçe Açıklama & Alıntılar
    User->>UI: "Sayfada Göster" Tıklar
    UI->>CS: HIGHLIGHT_TEXT (Alıntı metni)
    CS->>CS: Sayfada sarı renkle vurgular ve kaydırır
```

---

## 📊 5 Gerçek ToS Metni Üzerinde Mini Eval Sonuçları

Sistem, 5 popüler platformun gerçek kullanım koşulları üzerinde otomatik değerlendirmeden geçirilmiştir:

| Platform / Sözleşme | Karakter | Risk Skoru & Seviye | Yakalanan (TP) | Kaçırılan (FN) | Yanlış Alarm (FP) | Precision | Recall | F1 Skoru |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Spotify** | 1,489 | 85 (CRITICAL) | **3** | 0 | 0 | %100 | %100 | **%100** |
| **Netflix** | 1,608 | 65 (HIGH) | **1** | 2 | 0 | %100 | %33.3 | **%50.0** |
| **Zoom** | 1,220 | 70 (HIGH) | **2** | 1 | 0 | %100 | %66.7 | **%80.0** |
| **Instagram (Meta)** | 1,452 | 65 (HIGH) | **2** | 1 | 0 | %100 | %66.7 | **%80.0** |
| **X (Twitter)** | 1,385 | 65 (HIGH) | **1** | 2 | 0 | %100 | %33.3 | **%50.0** |
| **GENEL TOPLAM** | **7,154** | - | **9** | **6** | **0** | **%100** | **%60.0** | **%75.0** |

* **Alıntı Doğruluk Oranı (Quote Verifiability Rate):** **%100.0** (Tüm iddialar orijinal metin alıntısıyla teyit edilmiştir, uydurma iddia üretilmemiştir).
* **Değerlendirme Raporu:** Detaylar için [`eval/EVAL_REPORT.md`](file:///eval/EVAL_REPORT.md) dosyasına bakabilirsiniz.

---

## 🎥 Cypress Demo Videosu (≤ 90 sn)

Cypress ile kaydedilmiş E2E video: [`demo/videos/tos-analyzer.cy.ts.mp4`](file:///demo/videos/tos-analyzer.cy.ts.mp4)

Videoda iki temel an açıkça belgelenmiştir:
1. **Mutlu Yol (Happy Path):**
   - Spotify ToS sayfasının açılması.
   - Tek tıkla analiz ve 3 ana riskli maddenin (Otomatik Yenileme, Telifsiz Lisans Devri, Zorunlu Tahkim) `✓ Metinde Doğrulandı` rozetleriyle çıkması.
   - "Sayfada Göster & Vurgula" ile alıntının canlı web sayfasında sarı ile işaretlenmesi.
2. **Sistemin Belirsizliği Dürüstçe Gösterdiği An (Honest Uncertainty / Rejection):**
   - Muğlak maddeler içeren bir SaaS sözleşmesinde modelin ürettiği metin-dışı uydurma iddia (`"Kullanıcı Banka Hesaplarına El Konulması"`), deterministik motor tarafından yakalanır.
   - Sistem bunu gizlemek yerine dürüstçe `✗ Alıntı Doğrulanamadı` olarak işaretler, üzerini çizer ve **"DÜRÜSTLÜK & BELİRSİZLİK BİLDİRİMİ: Kural gereği alıntısı teyit edilemeyen iddialar geçersiz sayılır"** uyarısıyla kullanıcıyı yanıltmaz.
3. **Prompt Injection Testi:**
   - Sayfaya yerleştirilen `"IGNORE ALL PREVIOUS INSTRUCTIONS"` komutunun güvenlik filtresine takılması ve risk skorunun tavan yapması.

---

## 🛠️ Kurulum ve Çalıştırma

### 1. Bağımlılıkları Yükleme ve Derleme

```bash
# Proje dizinine gidin
cd tos-risk-analyzer

# Bağımlılıkları yükleyin
npm install

# Testleri çalıştırın (Unit testler: 15/15 passed)
npm run test

# Mini eval testini çalıştırın (5 gerçek ToS değerlendirmesi)
npm run eval

# Chrome uzantısını derleyin
npm run build
```

Derleme sonucu `dist/` klasörü altına Chrome Uzantısı olarak hazır hale gelir.

### 2. Chrome'a Uzantı Olarak Yükleme

1. Google Chrome'da `chrome://extensions/` adresini açın.
2. Sağ üstteki **"Geliştirici modu" (Developer mode)** anahtarını açın.
3. Sol üstteki **"Paketlenmemiş öğe yükle" (Load unpacked)** butonuna tıklayın.
4. Bu projenin `dist/` klasörünü seçin.
5. Uzantı simgesine tıklayarak herhangi bir ToS sayfasında analizi başlatın!

### 3. Cypress Demo Testini ve Videosunu Çalıştırma

```bash
# E2E testleri ve demo videosunu kaydetmek için:
npm run cypress:run
```
Test tamamlandığında video `demo/videos/tos-analyzer.cy.ts.mp4` dosyasına kaydedilir.

---

## 📁 Proje Dizin Yapısı

```
tos-risk-analyzer/
├── manifest.json              # Manifest V3 tanımı
├── package.json               # Bağımlılıklar ve npm scriptleri
├── tsconfig.json              # TypeScript yapılandırması
├── vite.config.ts             # Vite & Rollup derleme ayarları
├── tailwind.config.js         # Tailwind stilleri
├── src/
│   ├── types/index.ts         # RiskReport, RiskClause tipleri
│   ├── schema/risk-report.ts  # Zod JSON Şeması & Validatör
│   ├── core/
│   │   ├── quote-verifier.ts  # Deterministik alıntı doğrulayıcı motor
│   │   ├── injection-guard.ts # Prompt injection tespit & XML izolasyonu
│   │   ├── page-extractor.ts  # DOM text extraction & page-agent
│   │   ├── llm-client.ts      # Gemini / OpenAI / Mock LLM istemcisi
│   │   └── analyzer.ts        # Ana analiz boru hattı orkestratörü
│   ├── popup/                 # Uzantı Açılır Menü Arayüzü (Popup)
│   ├── content/               # Sayfa içi content script (Alıntı vurgulayıcı)
│   ├── background/            # Service worker
│   └── options/               # API Anahtarı ve Model ayar sayfası
├── eval/
│   ├── datasets/              # 5 Gerçek ToS: Spotify, Netflix, Zoom, Instagram, X
│   ├── run-eval.ts            # Mini eval motoru (TP, FP, FN hesaplayıcı)
│   └── EVAL_REPORT.md         # Detaylı değerlendirme raporu
├── tests/
│   ├── quote-verifier.test.ts # Alıntı doğrulama birim testleri
│   ├── injection-guard.test.ts# Injection saldırı senaryoları testleri
│   └── schema.test.ts         # Zod JSON şema testleri
├── cypress/
│   ├── e2e/tos-analyzer.cy.ts # Cypress E2E test senaryosu
│   └── support/e2e.ts
├── cypress.config.ts          # Cypress video kayıt ayarları
└── demo/
    ├── index.html             # İnteraktif Demo ve Test Platformu
    ├── demo.ts                # Demo kontrol mantığı
    └── videos/                # Kaydedilen demo videosu (MP4)
```
