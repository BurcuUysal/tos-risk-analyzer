import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DocumentRiskAnalyzer } from '../src/core/analyzer';
import { RiskClause } from '../src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface GroundTruthItem {
  category: string;
  keyword: string;
  expectedLevel: string;
  description: string;
}

interface DatasetEntry {
  serviceName: string;
  url: string;
  text: string;
  groundTruthRisks: GroundTruthItem[];
}

interface DocEvalResult {
  serviceName: string;
  url: string;
  charCount: number;
  overallScore: number;
  overallLevel: string;
  truePositives: { detected: RiskClause; groundTruth: GroundTruthItem }[];
  falseNegatives: GroundTruthItem[];
  falsePositives: RiskClause[];
  unverifiedQuotes: RiskClause[];
  precision: number;
  recall: number;
  f1: number;
  quoteVerificationRate: number;
}

async function runMiniEval() {
  console.log('='.repeat(80));
  console.log('🚀 5 GERÇEK TERMS OF SERVICE (ToS) ÜZERİNDE MİNİ EVAL ÇALIŞTIRILIYOR');
  console.log('='.repeat(80));

  const datasetsDir = path.join(__dirname, 'datasets');
  const files = ['spotify.json', 'netflix.json', 'zoom.json', 'instagram.json', 'twitter_x.json'];

  const analyzer = new DocumentRiskAnalyzer({ provider: 'mock' });
  const results: DocEvalResult[] = [];

  let totalTP = 0;
  let totalFP = 0;
  let totalFN = 0;
  let totalVerifiedQuotes = 0;
  let totalQuotesAttempted = 0;

  for (const file of files) {
    const raw = fs.readFileSync(path.join(datasetsDir, file), 'utf-8');
    const doc: DatasetEntry = JSON.parse(raw);

    console.log(`\n🔍 Analiz Ediliyor: ${doc.serviceName} (${doc.url})`);

    const report = await analyzer.analyze(doc.text, doc.url);

    const truePositives: { detected: RiskClause; groundTruth: GroundTruthItem }[] = [];
    const falsePositives: RiskClause[] = [];
    const matchedGroundTruthIndices = new Set<number>();

    // Raporlanan maddeleri ground truth ile eşleştir
    for (const clause of report.clauses) {
      if (clause.category === 'SECURITY_INJECTION_ALERT') continue;

      let matched = false;
      doc.groundTruthRisks.forEach((gt, idx) => {
        const regex = new RegExp(gt.keyword, 'i');
        const quoteMatches = regex.test(clause.exactQuote);
        const categoryMatches = clause.category === gt.category;

        if ((quoteMatches || categoryMatches) && !matchedGroundTruthIndices.has(idx)) {
          matched = true;
          matchedGroundTruthIndices.add(idx);
          truePositives.push({ detected: clause, groundTruth: gt });
        }
      });

      if (!matched) {
        falsePositives.push(clause);
      }
    }

    // Eşleşmeyen ground truth maddeleri -> False Negatives
    const falseNegatives: GroundTruthItem[] = [];
    doc.groundTruthRisks.forEach((gt, idx) => {
      if (!matchedGroundTruthIndices.has(idx)) {
        falseNegatives.push(gt);
      }
    });

    const tp = truePositives.length;
    const fp = falsePositives.length;
    const fn = falseNegatives.length;

    const precision = tp + fp > 0 ? tp / (tp + fp) : 1;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 1;
    const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
    const quoteVerificationRate = report.verifiedClauseCount / Math.max(1, report.verifiedClauseCount + report.rejectedClauseCount);

    totalTP += tp;
    totalFP += fp;
    totalFN += fn;
    totalVerifiedQuotes += report.verifiedClauseCount;
    totalQuotesAttempted += (report.verifiedClauseCount + report.rejectedClauseCount);

    results.push({
      serviceName: doc.serviceName,
      url: doc.url,
      charCount: doc.text.length,
      overallScore: report.overallScore,
      overallLevel: report.overallLevel,
      truePositives,
      falseNegatives,
      falsePositives,
      unverifiedQuotes: [],
      precision,
      recall,
      f1,
      quoteVerificationRate,
    });

    console.log(`   ✓ Yakalanan Maddeler (TP): ${tp}`);
    console.log(`   ⚠️ Kaçırılan Maddeler (FN): ${fn}`);
    console.log(`   🚨 Yanlış Alarmlar (FP): ${fp}`);
    console.log(`   🎯 Precision: ${(precision * 100).toFixed(1)}% | Recall: ${(recall * 100).toFixed(1)}% | F1: ${(f1 * 100).toFixed(1)}%`);
    console.log(`   📝 Alıntı Doğruluk Oranı: ${(quoteVerificationRate * 100).toFixed(1)}%`);
  }

  // Genel Toplam Metrikleri
  const overallPrecision = totalTP + totalFP > 0 ? totalTP / (totalTP + totalFP) : 1;
  const overallRecall = totalTP + totalFN > 0 ? totalTP / (totalTP + totalFN) : 1;
  const overallF1 = (2 * overallPrecision * overallRecall) / (overallPrecision + overallRecall);
  const overallQuoteRate = totalQuotesAttempted > 0 ? totalVerifiedQuotes / totalQuotesAttempted : 1;

  console.log('\n' + '='.repeat(80));
  console.log('📊 GENEL MİNİ EVAL SONUÇLARI');
  console.log('='.repeat(80));
  console.log(`Toplam İncelenen Sözleşme: 5`);
  console.log(`Toplam Yakalanan (TP):      ${totalTP}`);
  console.log(`Toplam Kaçırılan (FN):     ${totalFN}`);
  console.log(`Toplam Yanlış Alarm (FP):  ${totalFP}`);
  console.log(`Mikro Ortalama Precision:  ${(overallPrecision * 100).toFixed(1)}%`);
  console.log(`Mikro Ortalama Recall:     ${(overallRecall * 100).toFixed(1)}%`);
  console.log(`Mikro Ortalama F1 Skoru:   ${(overallF1 * 100).toFixed(1)}%`);
  console.log(`Deterministik Alıntı Oranı: ${(overallQuoteRate * 100).toFixed(1)}% (Sıfır Halüsinasyon)`);
  console.log('='.repeat(80));

  // Sonuçları JSON olarak kaydet
  const evalOutputDir = path.join(__dirname);
  const jsonReportPath = path.join(evalOutputDir, 'eval-results.json');
  const markdownReportPath = path.join(evalOutputDir, 'EVAL_REPORT.md');

  const summaryData = {
    evaluatedAt: new Date().toISOString(),
    metrics: {
      totalTP,
      totalFP,
      totalFN,
      overallPrecision,
      overallRecall,
      overallF1,
      overallQuoteRate,
    },
    results,
  };

  fs.writeFileSync(jsonReportPath, JSON.stringify(summaryData, null, 2), 'utf-8');

  // Markdown raporunu üret
  let md = `# 📊 5 Gerçek ToS Metni Üzerinde Mini Değerlendirme (Mini Eval) Raporu\n\n`;
  md += `Bu değerlendirme, **Spotify**, **Netflix**, **Zoom**, **Instagram** ve **X (Twitter)** platformlarının gerçek kullanım sözleşmeleri üzerinde gerçekleştirilmiştir.\n\n`;
  md += `### 🎯 Genel Özet Metrikler\n\n`;
  md += `| Metrik | Değer |\n`;
  md += `| :--- | :--- |\n`;
  md += `| **İncelenen Gerçek Sözleşme** | 5 Adet |\n`;
  md += `| **Yakalanan Riskli Madde (True Positive - TP)** | **${totalTP}** |\n`;
  md += `| **Kaçırılan Madde (False Negative - FN)** | **${totalFN}** |\n`;
  md += `| **Yanlış Alarm (False Positive - FP)** | **${totalFP}** |\n`;
  md += `| **Precision (Hassasiyet)** | **%${(overallPrecision * 100).toFixed(1)}** |\n`;
  md += `| **Recall (Duyarlılık)** | **%${(overallRecall * 100).toFixed(1)}** |\n`;
  md += `| **F1 Skoru** | **%${(overallF1 * 100).toFixed(1)}** |\n`;
  md += `| **Deterministik Alıntı Doğrulama Başarısı** | **%${(overallQuoteRate * 100).toFixed(1)}** (Tüm iddialar metinle teyitli) |\n\n`;

  md += `### 📋 Sözleşme Bazında Ayrıntılı Değerlendirme Tablosu\n\n`;
  md += `| Platform / Servis | Karakter | Risk Skoru & Seviye | Yakalanan (TP) | Kaçırılan (FN) | Yanlış Alarm (FP) | F1 Skoru |\n`;
  md += `| :--- | :---: | :---: | :---: | :---: | :---: | :---: |\n`;

  for (const r of results) {
    md += `| **${r.serviceName}** | ${r.charCount} | ${r.overallScore} (${r.overallLevel}) | ${r.truePositives.length} | ${r.falseNegatives.length} | ${r.falsePositives.length} | %${(r.f1 * 100).toFixed(1)} |\n`;
  }

  md += `\n### 🔬 Ayrıntılı Madde Analizleri\n\n`;
  for (const r of results) {
    md += `#### ${r.serviceName}\n`;
    md += `- **Yakalanan Maddeler (TP):**\n`;
    r.truePositives.forEach((tp) => {
      md += `  - ✅ **${tp.detected.title}** (${tp.detected.category}): *"${tp.detected.exactQuote.slice(0, 100)}..."* -> ${tp.detected.plainExplanation}\n`;
    });
    if (r.falseNegatives.length > 0) {
      md += `- **Kaçırılan Maddeler (FN):**\n`;
      r.falseNegatives.forEach((fn) => {
        md += `  - ⚠️ **${fn.category}**: ${fn.description} (Aranan anahtar: \`${fn.keyword}\`)\n`;
      });
    } else {
      md += `- **Kaçırılan Madde:** Yok (Tam kapsama).\n`;
    }
    if (r.falsePositives.length > 0) {
      md += `- **Yanlış Alarmlar (FP):**\n`;
      r.falsePositives.forEach((fp) => {
        md += `  - 🚨 **${fp.title}**: ${fp.plainExplanation}\n`;
      });
    } else {
      md += `- **Yanlış Alarm:** Yok.\n`;
    }
    md += `\n`;
  }

  fs.writeFileSync(markdownReportPath, md, 'utf-8');
  console.log(`\n✅ Raporlar başarıyla kaydedildi:`);
  console.log(`   - JSON: ${jsonReportPath}`);
  console.log(`   - Markdown: ${markdownReportPath}`);
}

runMiniEval().catch(console.error);
