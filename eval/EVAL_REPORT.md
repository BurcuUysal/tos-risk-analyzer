# 📊 5 Gerçek ToS Metni Üzerinde Mini Değerlendirme (Mini Eval) Raporu

Bu değerlendirme, **Spotify**, **Netflix**, **Zoom**, **Instagram** ve **X (Twitter)** platformlarının gerçek kullanım sözleşmeleri üzerinde gerçekleştirilmiştir.

### 🎯 Genel Özet Metrikler

| Metrik | Değer |
| :--- | :--- |
| **İncelenen Gerçek Sözleşme** | 5 Adet |
| **Yakalanan Riskli Madde (True Positive - TP)** | **9** |
| **Kaçırılan Madde (False Negative - FN)** | **6** |
| **Yanlış Alarm (False Positive - FP)** | **0** |
| **Precision (Hassasiyet)** | **%100.0** |
| **Recall (Duyarlılık)** | **%60.0** |
| **F1 Skoru** | **%75.0** |
| **Deterministik Alıntı Doğrulama Başarısı** | **%100.0** (Tüm iddialar metinle teyitli) |

### 📋 Sözleşme Bazında Ayrıntılı Değerlendirme Tablosu

| Platform / Servis | Karakter | Risk Skoru & Seviye | Yakalanan (TP) | Kaçırılan (FN) | Yanlış Alarm (FP) | F1 Skoru |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Spotify** | 1295 | 75 (CRITICAL) | 3 | 0 | 0 | %100.0 |
| **Netflix** | 1384 | 45 (MEDIUM) | 1 | 2 | 0 | %50.0 |
| **Zoom** | 1040 | 60 (HIGH) | 2 | 1 | 0 | %80.0 |
| **Instagram (Meta)** | 1391 | 55 (HIGH) | 2 | 1 | 0 | %80.0 |
| **X (formerly Twitter)** | 1298 | 35 (MEDIUM) | 1 | 2 | 0 | %50.0 |

### 🔬 Ayrıntılı Madde Analizleri

#### Spotify
- **Yakalanan Maddeler (TP):**
  - ✅ **Zorunlu Tahkim ve Toplu Dava Feragati** (ARBITRATION_CLASS_ACTION): *"Section 24: Arbitration Agreement...."* -> Bir anlaşmazlık çıktığında mahkemeye başvurma ve toplu dava açma hakkınızdan feragat ediyorsunuz. Uyuşmazlıklar bağlayıcı özel hakem heyetine götürülmek zorunda.
  - ✅ **Otomatik Abonelik Yenilemesi** (AUTO_RENEWAL_CANCELLATION): *"Your Paid Subscription will automatically renew at the end of the applicable subscription period, un..."* -> Aboneliğiniz dönem sonunda otomatik yenilenir. Dönem bitmeden iptal etmezseniz kartınızdan otomatik çekim yapılır.
  - ✅ **Kullanıcı İçerikleri Üzerinde Sınırsız Lisans** (IP_CONTENT_RIGHTS): *"You grant Spotify a non-exclusive, transferable, sub-licensable, royalty-free, perpetual, irrevocabl..."* -> Platforma yüklediğiniz fotoğraf, metin ve içerikler üzerinde şirkete dünya çapında, telifsiz ve devredilebilir kullanım hakkı veriyorsunuz.
- **Kaçırılan Madde:** Yok (Tam kapsama).
- **Yanlış Alarm:** Yok.

#### Netflix
- **Yakalanan Maddeler (TP):**
  - ✅ **Zorunlu Tahkim ve Toplu Dava Feragati** (ARBITRATION_CLASS_ACTION): *"Section 15: Arbitration Agreement...."* -> Bir anlaşmazlık çıktığında mahkemeye başvurma ve toplu dava açma hakkınızdan feragat ediyorsunuz. Uyuşmazlıklar bağlayıcı özel hakem heyetine götürülmek zorunda.
- **Kaçırılan Maddeler (FN):**
  - ⚠️ **UNILATERAL_CHANGES**: Fiyat ve planları tek taraflı değiştirme hakkı (Aranan anahtar: `change without notice|sole and absolute discretion|adjust pricing`)
  - ⚠️ **LIABILITY_WARRANTY**: Hizmetin olduğu gibi sunulması ve tüm sorumlulukların reddi (Aranan anahtar: `AS IS|WITHOUT WARRANTY OF ANY KIND|LIMITATIONS ON LIABILITY`)
- **Yanlış Alarm:** Yok.

#### Zoom
- **Yakalanan Maddeler (TP):**
  - ✅ **Zorunlu Tahkim ve Toplu Dava Feragati** (ARBITRATION_CLASS_ACTION): *"Section 20: Dispute Resolution and Arbitration Agreement...."* -> Bir anlaşmazlık çıktığında mahkemeye başvurma ve toplu dava açma hakkınızdan feragat ediyorsunuz. Uyuşmazlıklar bağlayıcı özel hakem heyetine götürülmek zorunda.
  - ✅ **Kullanıcı İçerikleri Üzerinde Sınırsız Lisans** (IP_CONTENT_RIGHTS): *"You grant Zoom a perpetual, worldwide, non-exclusive, royalty-free license to use, process, and tran..."* -> Platforma yüklediğiniz fotoğraf, metin ve içerikler üzerinde şirkete dünya çapında, telifsiz ve devredilebilir kullanım hakkı veriyorsunuz.
- **Kaçırılan Maddeler (FN):**
  - ⚠️ **ACCOUNT_TERMINATION**: Gerekçesiz ve habersiz anlık hesap kapatma yetkisi (Aranan anahtar: `at any time, for any reason or no reason, without notice`)
- **Yanlış Alarm:** Yok.

#### Instagram (Meta)
- **Yakalanan Maddeler (TP):**
  - ✅ **Kişisel Verilerin 3. Taraflarla Paylaşımı & Reklam Hedefleme** (DATA_PRIVACY_SHARING): *"We use your personal data, such as information about your activity and interests, to show you ads th..."* -> Kişisel bilgileriniz, ilgi alanlarınız ve kullanım alışkanlıklarınız reklam ortakları ve iş ortakları ile paylaşılabilir.
  - ✅ **Kullanıcı İçerikleri Üzerinde Sınırsız Lisans** (IP_CONTENT_RIGHTS): *"Specifically, when you share, post, or upload content that is covered by intellectual property right..."* -> Platforma yüklediğiniz fotoğraf, metin ve içerikler üzerinde şirkete dünya çapında, telifsiz ve devredilebilir kullanım hakkı veriyorsunuz.
- **Kaçırılan Maddeler (FN):**
  - ⚠️ **UNILATERAL_CHANGES**: Kullanmaya devam ederek güncellenen şartları zımnen kabul etme (Aranan anahtar: `bound by the updated Terms`)
- **Yanlış Alarm:** Yok.

#### X (formerly Twitter)
- **Yakalanan Maddeler (TP):**
  - ✅ **Kullanıcı İçerikleri Üzerinde Sınırsız Lisans** (IP_CONTENT_RIGHTS): *"By submitting, posting or displaying Content on or through the Services, you grant us a worldwide, n..."* -> Platforma yüklediğiniz fotoğraf, metin ve içerikler üzerinde şirkete dünya çapında, telifsiz ve devredilebilir kullanım hakkı veriyorsunuz.
- **Kaçırılan Maddeler (FN):**
  - ⚠️ **ACCOUNT_TERMINATION**: Gerekçesiz ve habersiz anlık hesap kapatma yetkisi (Aranan anahtar: `at any time for any or no reason, without notice`)
  - ⚠️ **LIABILITY_WARRANTY**: Tazminat sorumluluğunun maksimum 100 Dolar ile sınırlandırılması (Aranan anahtar: `EXCEED THE GREATER OF ONE HUNDRED U.S. DOLLARS|NOT BE LIABLE FOR ANY INDIRECT`)
- **Yanlış Alarm:** Yok.

