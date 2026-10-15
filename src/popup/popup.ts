import { DocumentRiskAnalyzer } from '../core/analyzer';
import { RiskReport, RiskClause } from '../types';

let currentReport: RiskReport | null = null;
let currentTabId: number | null = null;

// DOM Elemanları
const btnAnalyze = document.getElementById('btn-analyze') as HTMLButtonElement;
const btnSettings = document.getElementById('btn-settings') as HTMLButtonElement;
const pageTitleEl = document.getElementById('page-title') as HTMLDivElement;
const pageStatusEl = document.getElementById('page-status') as HTMLDivElement;
const loadingSpinner = document.getElementById('loading-spinner') as HTMLDivElement;
const loadingStatusText = document.getElementById('loading-status-text') as HTMLParagraphElement;
const sectionResults = document.getElementById('section-results') as HTMLElement;
const riskScoreValue = document.getElementById('risk-score-value') as HTMLSpanElement;
const riskLevelBadge = document.getElementById('risk-level-badge') as HTMLSpanElement;
const verifiedCountEl = document.getElementById('verified-count') as HTMLSpanElement;
const rejectedCountEl = document.getElementById('rejected-count') as HTMLSpanElement;
const reportSummaryEl = document.getElementById('report-summary') as HTMLParagraphElement;
const clausesContainer = document.getElementById('clauses-container') as HTMLDivElement;
const securityAlertBox = document.getElementById('security-alert-box') as HTMLDivElement;
const securityAlertText = document.getElementById('security-alert-text') as HTMLParagraphElement;

// Sekmeler
const tabPage = document.getElementById('tab-page') as HTMLButtonElement;
const tabPaste = document.getElementById('tab-paste') as HTMLButtonElement;
const sectionPageInfo = document.getElementById('section-page-info') as HTMLElement;
const sectionPasteInput = document.getElementById('section-paste-input') as HTMLElement;
const pasteTextarea = document.getElementById('paste-textarea') as HTMLTextAreaElement;
const btnAnalyzePaste = document.getElementById('btn-analyze-paste') as HTMLButtonElement;

// Sayfa yüklendiğinde başlat
document.addEventListener('DOMContentLoaded', async () => {
  initTabs();
  initSettings();
  await inspectActiveTab();
});

function initTabs() {
  tabPage.addEventListener('click', () => {
    tabPage.className = 'pb-2 border-b-2 border-indigo-600 text-indigo-700 font-bold';
    tabPaste.className = 'pb-2 border-b-2 border-transparent text-slate-500 hover:text-slate-700';
    sectionPageInfo.classList.remove('hidden');
    sectionPasteInput.classList.add('hidden');
  });

  tabPaste.addEventListener('click', () => {
    tabPaste.className = 'pb-2 border-b-2 border-indigo-600 text-indigo-700 font-bold';
    tabPage.className = 'pb-2 border-b-2 border-transparent text-slate-500 hover:text-slate-700';
    sectionPasteInput.classList.remove('hidden');
    sectionPageInfo.classList.add('hidden');
  });
}

function initSettings() {
  btnSettings.addEventListener('click', () => {
    if (chrome.runtime && chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open('../options/options.html');
    }
  });

  btnAnalyze.addEventListener('click', () => {
    analyzeActivePage();
  });

  btnAnalyzePaste.addEventListener('click', () => {
    const text = pasteTextarea.value.trim();
    if (!text) {
      alert('Lütfen analiz edilecek bir metin yapıştırın.');
      return;
    }
    runAnalysisPipeline(text, 'Kullanıcı Tarafından Yapıştırılan Metin');
  });
}

/**
 * Aktif sekmeyi kontrol eder ve sayfa başlığını / durumunu günceller.
 */
async function inspectActiveTab() {
  try {
    if (!chrome.tabs) {
      pageTitleEl.textContent = 'Geliştirici / Test Ortamı';
      pageStatusEl.textContent = 'Demo Modu Aktif';
      return;
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) {
      pageTitleEl.textContent = 'Aktif sekme bulunamadı';
      return;
    }

    currentTabId = tab.id;
    pageTitleEl.textContent = tab.title || tab.url || 'Web Sayfası';

    // Content script'e ping atarak sayfa durumunu öğren
    chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_SUMMARY' }, (response) => {
      if (chrome.runtime.lastError || !response) {
        pageStatusEl.textContent = '📄 Sayfa analiz edilmeye hazır';
        pageStatusEl.className = 'inline-flex items-center text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600';
      } else {
        if (response.isLikelyLegalDocument) {
          pageStatusEl.textContent = '⚖️ Hukuki Metin / ToS Algılandı';
          pageStatusEl.className = 'inline-flex items-center text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold';
        } else {
          pageStatusEl.textContent = '🌐 Standart Web Sayfası';
          pageStatusEl.className = 'inline-flex items-center text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600';
        }
      }
    });
  } catch (err) {
    console.warn('Sekme denetleme uyarısı:', err);
  }
}

/**
 * Aktif sekmeden metni çeker ve analiz boru hattını çalıştırır
 */
async function analyzeActivePage() {
  if (!currentTabId) {
    alert('Aktif sekme tespit edilemedi.');
    return;
  }

  showLoading(true, 'Sayfa içeriği ve DOM metni taranıyor...');

  try {
    chrome.tabs.sendMessage(currentTabId, { type: 'EXTRACT_TEXT' }, async (response) => {
      if (chrome.runtime.lastError || !response || !response.mainText) {
        // Content script henüz enjekte edilmemişse veya izin kısıtı varsa fallback: executeScript
        try {
          const results = await chrome.scripting.executeScript({
            target: { tabId: currentTabId! },
            func: () => document.body.innerText || '',
          });
          const text = results[0]?.result || '';
          if (!text) throw new Error('Sayfa metni okunamadı.');
          await runAnalysisPipeline(text, pageTitleEl.textContent || '');
        } catch (scriptErr: any) {
          showLoading(false);
          alert('Sayfa içeriği okunamadı: ' + scriptErr.message);
        }
      } else {
        await runAnalysisPipeline(response.mainText, response.title || pageTitleEl.textContent || '');
      }
    });
  } catch (err: any) {
    showLoading(false);
    alert('Analiz başlatılamadı: ' + err.message);
  }
}

/**
 * Belge metnini LLM ve Deterministik Doğrulayıcı ile analiz eder
 */
async function runAnalysisPipeline(text: string, title: string) {
  showLoading(true, 'Yapay zekâ inceliyor ve deterministik alıntı doğrulaması yapılıyor...');

  try {
    // Kaydedilmiş ayarları oku
    let provider: 'gemini' | 'openai' | 'mock' = 'mock';
    let apiKey = '';

    if (chrome.storage && chrome.storage.local) {
      const stored = await chrome.storage.local.get(['llmProvider', 'apiKey']);
      if (stored.llmProvider) provider = stored.llmProvider;
      if (stored.apiKey) apiKey = stored.apiKey;
    }

    const analyzer = new DocumentRiskAnalyzer({
      provider,
      apiKey,
    });

    const report = await analyzer.analyze(text, title);
    currentReport = report;
    renderReport(report);
  } catch (err: any) {
    alert('Analiz sırasında bir hata oluştu: ' + (err.message || String(err)));
  } finally {
    showLoading(false);
  }
}

/**
 * Raporu Popup arayüzüne render eder
 */
function renderReport(report: RiskReport) {
  sectionResults.classList.remove('hidden');

  // Skor ve Seviye
  riskScoreValue.textContent = String(report.overallScore);
  riskLevelBadge.textContent = getRiskLevelLabel(report.overallLevel);
  riskLevelBadge.className = `inline-block mt-1 text-[11px] font-bold px-2.5 py-0.5 rounded uppercase ${getRiskBadgeColor(report.overallLevel)}`;

  // Sayaçlar
  verifiedCountEl.textContent = String(report.verifiedClauseCount);
  rejectedCountEl.textContent = String(report.rejectedClauseCount);

  // Özet
  reportSummaryEl.textContent = report.summary;

  // Güvenlik Bildirimi (Prompt injection vb.)
  if (report.securityNotice) {
    securityAlertBox.classList.remove('hidden');
    securityAlertText.textContent = report.securityNotice;
  } else {
    securityAlertBox.classList.add('hidden');
  }

  // Maddeleri Çiz
  clausesContainer.innerHTML = '';

  if (report.clauses.length === 0) {
    clausesContainer.innerHTML = `
      <div class="text-xs text-slate-500 italic p-3 text-center bg-white rounded-lg border border-slate-200">
        Bu metinde belirgin bir riskli madde tespit edilmedi.
      </div>
    `;
    return;
  }

  report.clauses.forEach((clause) => {
    const card = document.createElement('div');
    card.className = 'bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm space-y-2';

    const isVerified = clause.verificationStatus === 'VERIFIED_MATCH' || clause.verificationStatus === 'PARTIAL_MATCH';
    const verificationBadge = isVerified
      ? `<span class="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200" title="Alıntı sayfada harfi harfine teyit edildi">
          ✓ Metinde Doğrulandı
        </span>`
      : `<span class="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200" title="Alıntı sayfada bulunamadı, iddia geçersiz sayıldı!">
          ✗ Geçersiz İddia (Alıntı Yok)
        </span>`;

    card.innerHTML = `
      <div class="flex items-start justify-between gap-2">
        <div class="flex flex-wrap items-center gap-1.5">
          <span class="text-[10px] font-bold px-2 py-0.5 rounded uppercase ${getRiskBadgeColor(clause.riskLevel)}">
            ${clause.riskLevel}
          </span>
          <span class="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600">
            ${getCategoryLabel(clause.category)}
          </span>
        </div>
        ${verificationBadge}
      </div>

      <div>
        <h4 class="text-xs font-bold text-slate-800 leading-snug">${escapeHtml(clause.title)}</h4>
        <p class="text-xs text-slate-600 mt-1 leading-relaxed">${escapeHtml(clause.plainExplanation)}</p>
      </div>

      <!-- Kesin Alıntı Bloğu (Verbatim Quote) -->
      <div class="bg-slate-50 border-l-2 ${isVerified ? 'border-emerald-500' : 'border-rose-400'} p-2 rounded text-[11px] text-slate-600 font-mono italic">
        <span class="font-bold not-italic text-slate-500 text-[10px] block mb-0.5">Orijinal Metinden Alıntı:</span>
        "${escapeHtml(clause.exactQuote)}"
      </div>

      ${isVerified ? `
        <button class="btn-highlight-quote text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center space-x-1 mt-1 transition" data-quote="${escapeHtml(clause.exactQuote)}">
          <span>🎯 Sayfada Göster & Vurgula</span>
        </button>
      ` : `
        <div class="text-[10px] text-rose-600 italic">
          ⚠️ ${escapeHtml(clause.rejectionReason || 'Alıntı doğrulanamadı.')}
        </div>
      `}
    `;

    clausesContainer.appendChild(card);
  });

  // Sayfada Vurgula butonlarına dinleyici ekle
  document.querySelectorAll('.btn-highlight-quote').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const quote = (e.currentTarget as HTMLElement).getAttribute('data-quote');
      if (quote && currentTabId) {
        chrome.tabs.sendMessage(currentTabId, {
          type: 'HIGHLIGHT_TEXT',
          quote,
        });
      }
    });
  });
}

function showLoading(isLoading: boolean, text: string = '') {
  if (isLoading) {
    loadingSpinner.classList.remove('hidden');
    loadingStatusText.textContent = text;
    btnAnalyze.disabled = true;
    btnAnalyzePaste.disabled = true;
  } else {
    loadingSpinner.classList.add('hidden');
    btnAnalyze.disabled = false;
    btnAnalyzePaste.disabled = false;
  }
}

function getRiskLevelLabel(level: string): string {
  switch (level) {
    case 'CRITICAL': return 'Kritik Risk';
    case 'HIGH': return 'Yüksek Risk';
    case 'MEDIUM': return 'Orta Risk';
    case 'LOW': return 'Düşük Risk';
    default: return level;
  }
}

function getRiskBadgeColor(level: string): string {
  switch (level) {
    case 'CRITICAL': return 'bg-rose-100 text-rose-800 border border-rose-300';
    case 'HIGH': return 'bg-orange-100 text-orange-800 border border-orange-300';
    case 'MEDIUM': return 'bg-amber-100 text-amber-800 border border-amber-300';
    case 'LOW': return 'bg-emerald-100 text-emerald-800 border border-emerald-300';
    default: return 'bg-slate-100 text-slate-800';
  }
}

function getCategoryLabel(cat: string): string {
  switch (cat) {
    case 'DATA_PRIVACY_SHARING': return 'Veri Paylaşımı & Reklam';
    case 'AUTO_RENEWAL_CANCELLATION': return 'Otomatik Yenileme & İptal';
    case 'ARBITRATION_CLASS_ACTION': return 'Zorunlu Tahkim & Feragat';
    case 'IP_CONTENT_RIGHTS': return 'Fikri Mülkiyet Devri';
    case 'UNILATERAL_CHANGES': return 'Tek Taraflı Değişiklik';
    case 'LIABILITY_WARRANTY': return 'Sorumluluk Reddi';
    case 'ACCOUNT_TERMINATION': return 'Hesap Kapatma';
    case 'SECURITY_INJECTION_ALERT': return 'Prompt Injection Uyarısı';
    default: return cat;
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
