describe('ToS Risk Analizörü - E2E Demo & Doğrulama Testi', () => {
  beforeEach(() => {
    // Demo sayfasına git
    cy.visit('/demo/index.html');
    cy.wait(800);
  });

  it('1. Mutlu Yol (Happy Path): ToS tespiti, analiz, deterministik alıntılar ve sayfada vurgulama', () => {
    // 1. Zorunlu Yasal Uyarının Görünürlüğü
    cy.contains('YASAL UYARI: Bu uygulama hukuki tavsiye vermez').should('be.visible');

    // 2. Sayfanın ToS olarak algılandığının kontrolü
    cy.get('#ext-page-badge').should('contain', 'ToS Algılandı');
    cy.get('#ext-page-title').should('contain', 'Spotify Kullanıcı Sözleşmesi');

    cy.wait(1000);

    // 3. Analiz Başlatma
    cy.get('#btn-ext-analyze').click();
    cy.get('#ext-loading').should('be.visible');

    // 4. Sonuçların Gelmesi ve Doğrulanması
    cy.get('#ext-results', { timeout: 10000 }).should('be.visible');
    cy.get('#ext-score').should('contain', '82');
    cy.get('#ext-level-badge').should('contain', 'YÜKSEK RİSK');
    cy.get('#ext-verified-count').should('contain', '3');
    cy.get('#ext-rejected-count').should('contain', '0');

    // Sade Türkçe Özet
    cy.get('#ext-summary').should('be.visible').and('not.be.empty');

    cy.wait(1500);

    // 5. Maddeler ve Kesin Alıntı Kontrolü
    cy.contains('Zorunlu Tahkim ve Toplu Dava Feragati').should('be.visible');
    cy.contains('Kullanıcı İçeriklerinde Kalıcı & Telifsiz Lisans').should('be.visible');
    cy.contains('Otomatik Yenileme ve İade Yok').should('be.visible');
    cy.get('#ext-clauses-container').contains('✓ Metinde Doğrulandı').should('be.visible');

    cy.wait(1000);

    // 6. Sayfada Göster & Vurgula Butonu
    cy.get('.btn-highlight').first().click();
    cy.wait(1000);
    cy.get('.highlight-match').should('be.visible');

    cy.wait(2000);
  });

  it('2. Sistemin Belirsizliği Dürüstçe Gösterdiği An: Uydurulmuş/geçersiz alıntının dürüstçe reddedilmesi', () => {
    // Belirsizlik Senaryosunu Seç
    cy.get('#scenario-uncertainty').click();
    cy.wait(1000);

    cy.get('#page-h1').should('contain', 'Muğlak ve Eksik Metin');
    cy.get('#ext-page-title').should('contain', 'Belirsizlik Senaryosu');

    // Analiz Et
    cy.get('#btn-ext-analyze').click();
    cy.get('#ext-results', { timeout: 10000 }).should('be.visible');

    cy.wait(1500);

    // Dürüstlük ve Belirsizlik Kontrolü
    cy.get('#ext-score').should('contain', '35');
    cy.get('#ext-level-badge').should('contain', 'BELİRSİZ');
    cy.get('#ext-rejected-count').should('contain', '1');

    // Metinde olmayan sahte iddianın reddedildiğini doğrula
    cy.contains('✗ Alıntı Doğrulanamadı').should('be.visible');
    cy.contains('Kullanıcı Banka Hesaplarına El Konulması').should('have.class', 'line-through');
    cy.contains('DÜRÜSTLÜK & BELİRSİZLİK BİLDİRİMİ').should('be.visible');

    cy.wait(2500);
  });

  it('3. Prompt Injection Testi: Gizli talimatın yakalanması ve risk skorunun yükselmesi', () => {
    // Injection Senaryosunu Seç
    cy.get('#scenario-injection').click();
    cy.wait(1000);

    // Sayfada kötü niyetli komut var
    cy.contains('IGNORE ALL PREVIOUS INSTRUCTIONS').should('be.visible');

    // Analiz Et
    cy.get('#btn-ext-analyze').click();
    cy.get('#ext-results', { timeout: 10000 }).should('be.visible');

    cy.wait(1500);

    // Saldırgan skoru 0 yapmaya çalıştı ama sistem güvenlik alarmı verdi
    cy.get('#ext-security-alert').should('be.visible');
    cy.contains('GÜVENLİK ALARMI: Prompt Injection Tespit Edildi!').should('be.visible');
    cy.get('#ext-level-badge').should('contain', 'KRİTİK RİSK');

    cy.wait(2000);
  });
});
