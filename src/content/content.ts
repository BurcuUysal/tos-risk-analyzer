import { extractPageContent } from '../core/page-extractor';

console.log('[ToS Risk Analizörü] Content script aktif.');

// Mesaj dinleyici
chrome.runtime?.onMessage?.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_PAGE_SUMMARY') {
    const data = extractPageContent(document);
    sendResponse({
      title: data.title,
      url: data.url,
      charCount: data.charCount,
      isLikelyLegalDocument: data.isLikelyLegalDocument,
      headings: data.headings.slice(0, 5),
    });
    return true;
  }

  if (request.type === 'EXTRACT_TEXT') {
    const data = extractPageContent(document);
    sendResponse({
      title: data.title,
      url: data.url,
      mainText: data.mainText,
      charCount: data.charCount,
      hiddenTexts: data.hiddenTexts,
      isLikelyLegalDocument: data.isLikelyLegalDocument,
    });
    return true;
  }

  if (request.type === 'HIGHLIGHT_TEXT') {
    const quote = request.quote;
    if (quote) {
      highlightQuoteInPage(quote);
      sendResponse({ success: true });
    }
    return true;
  }
});

/**
 * Sayfada verilen alıntıyı bulur, sarı mark etiketiyle vurgular ve ekrana kaydırır.
 */
function highlightQuoteInPage(quote: string) {
  // Önceki vurguları temizle
  document.querySelectorAll('.tos-analyzer-highlight').forEach((el) => {
    const parent = el.parentNode;
    if (parent) {
      parent.replaceChild(document.createTextNode(el.textContent || ''), el);
      parent.normalize();
    }
  });

  const cleanQuote = quote.trim();
  if (cleanQuote.length < 5) return;

  // Window.find API veya TreeWalker ile metni bul
  try {
    const win = window as any;
    if (win.find && win.find(cleanQuote, false, false, true, false, false, false)) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const span = document.createElement('mark');
        span.className = 'tos-analyzer-highlight';
        span.style.backgroundColor = '#fef08a';
        span.style.color = '#1e293b';
        span.style.padding = '2px 4px';
        span.style.borderRadius = '3px';
        span.style.boxShadow = '0 0 0 2px #eab308';
        span.style.transition = 'all 0.3s ease';

        range.surroundContents(span);
        span.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }
  } catch (err) {
    console.warn('Selection vurgulama hatası, fallback deneniyor:', err);
  }

  // Fallback: TreeWalker ile DOM text node'ları tarama
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node: Node | null = null;
  const lowerQuote = cleanQuote.toLowerCase();

  while ((node = walker.nextNode())) {
    const text = node.textContent?.toLowerCase() || '';
    const idx = text.indexOf(lowerQuote);
    if (idx !== -1 && node.parentElement) {
      node.parentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      node.parentElement.style.outline = '3px solid #eab308';
      node.parentElement.style.backgroundColor = '#fef9c3';
      setTimeout(() => {
        if (node?.parentElement) {
          node.parentElement.style.outline = '';
          node.parentElement.style.backgroundColor = '';
        }
      }, 4000);
      break;
    }
  }
}
