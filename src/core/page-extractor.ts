/**
 * DOM Metin Çıkarıcı & Sayfa Analizörü
 * 
 * Alibaba page-agent yaklaşımını ve DOM dehydration tekniklerini kullanarak
 * sayfadaki Terms of Service, Privacy Policy ve Abonelik şartlarını okur.
 * Ayrıca CSS ile gizlenmiş (hidden/zero-font) metinleri tarar.
 */

export interface ExtractedPageData {
  title: string;
  url: string;
  mainText: string;
  charCount: number;
  headings: string[];
  hiddenTexts: string[];
  isLikelyLegalDocument: boolean;
}

/**
 * Sayfadan ana metni, başlıkları ve gizli elemanları çıkarır.
 */
export function extractPageContent(doc: Document = document): ExtractedPageData {
  const url = doc.location?.href || '';
  const title = doc.title || 'İsimsiz Sayfa';

  // 1. Gizli elemanları (hidden instructions / CSS injection) tara
  const hiddenTexts: string[] = [];
  try {
    const allElements = doc.querySelectorAll('p, span, div, section, article');
    allElements.forEach((el) => {
      const style = window.getComputedStyle ? window.getComputedStyle(el) : null;
      if (style) {
        const isHidden =
          style.display === 'none' ||
          style.visibility === 'hidden' ||
          parseFloat(style.opacity || '1') === 0 ||
          parseFloat(style.fontSize || '16') <= 1;

        if (isHidden && el.textContent && el.textContent.trim().length > 10) {
          hiddenTexts.push(el.textContent.trim());
        }
      }
    });
  } catch (e) {
    // Tarayıcı dışı ortamlarda sessiz geç
  }

  // 2. Sayfanın ana içeriğini hedefle (Navigasyon, header, footer hariç)
  const clone = doc.body ? (doc.body.cloneNode(true) as HTMLElement) : null;
  let mainText = '';
  const headings: string[] = [];

  if (clone) {
    // İstenmeyen gürültü elemanlarını temizle
    const unwanted = clone.querySelectorAll(
      'script, style, noscript, nav, header, footer, svg, [role="navigation"], [aria-hidden="true"]'
    );
    unwanted.forEach((el) => el.remove());

    // Başlıkları topla
    const headingEls = clone.querySelectorAll('h1, h2, h3, h4');
    headingEls.forEach((h) => {
      const text = h.textContent?.trim();
      if (text) headings.push(text);
    });

    // Metni çıkar ve normalize et
    mainText = (clone.textContent || '')
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s*\n+/g, '\n\n')
      .trim();
  } else {
    mainText = doc.body?.innerText || doc.documentElement?.innerText || '';
  }

  // Sayfanın ToS / Hukuki metin olup olmadığını heuristik olarak sına
  const legalKeywords = [
    'terms', 'conditions', 'privacy', 'policy', 'koşullar', 'şartlar',
    'gizlilik', 'sözleşme', 'abonelik', 'subscription', 'arbitration',
    'tahkim', 'liability', 'sorumluluk', 'rights', 'rights reserved'
  ];
  const lowerText = (title + ' ' + url + ' ' + mainText.slice(0, 1000)).toLowerCase();
  const isLikelyLegalDocument = legalKeywords.some((kw) => lowerText.includes(kw));

  return {
    title,
    url,
    mainText,
    charCount: mainText.length,
    headings,
    hiddenTexts,
    isLikelyLegalDocument,
  };
}
