describe('ToS Risk Analizörü - E2E Demo & Doğrulama Testi (Sakin & Okunabilir Tempo)', () => {
  beforeEach(() => {
    // Demo sayfasına git
    cy.visit('/demo/index.html');
    cy.wait(1500); // İzleyicinin sayfayı kavraması için duraksama
  });

  it('1. Mutlu Yol (Happy Path): ToS tespiti, analiz, deterministik alıntılar ve sayfada vurgulama', () => {
    // 1. Zorunlu Yasal Uyarının Görünürlüğü
    cy.contains('YASAL UYARI: Bu uygulama hukuki tavsiye vermez').should('be.visible');

    // 2. Sayfanın ToS olarak algılandığının kontrolü
    cy.get('#ext-page-badge').should('contain', 'ToS Algılandı');
    cy.get('#ext-page-title').should('contain', 'Spotify Kullanıcı Sözleşmesi');

    cy.wait(2000); // İzleyicinin sol paneli ve sağ paneli görmesi için duraksama

    // 3. Analiz Başlatma
    cy.get('#btn-ext-analyze').click();
    cy.get('#ext-loading').should('be.visible');

    cy.wait(1500); // Yüklenme spinner'ının ekranda net algılanması

    // 4. Sonuçların Gelmesi ve Doğrulanması
    cy.get('#ext-results', { timeout: 10000 }).should('be.visible');
    cy.get('#ext-score').should('contain', '82');
    cy.get('#ext-level-badge').should('contain', 'YÜKSEK RİSK');
    cy.get('#ext-verified-count').should('contain', '3');
    cy.get('#ext-rejected-count').should('contain', '0');

    // Sade Türkçe Özet - İzleyicinin metni okuyabilmesi için süre
    cy.get('#ext-summary').should('be.visible').and('not.be.empty');
    cy.wait(3000);

    // 5. Maddeler ve Kesin Alıntı Kontrolü - Sırayla odaklanma
    cy.contains('Zorunlu Tahkim ve Toplu Dava Feragati').scrollIntoView().should('be.visible');
    cy.wait(1500);

    cy.contains('Kullanıcı İçeriklerinde Kalıcı & Telifsiz Lisans').scrollIntoView().should('be.visible');
    cy.wait(1500);

    cy.contains('Otomatik Yenileme ve İade Yok').scrollIntoView().should('be.visible');
    cy.get('#ext-clauses-container').contains('✓ Metinde Doğrulandı').should('be.visible');
    cy.wait(2000);

    // 6. Sayfada Göster & Vurgula Butonu - Canlı sayfada sarı vurgunun gösterilmesi
    cy.get('.btn-highlight').first().click();
    cy.wait(1500);
    cy.get('.highlight-match').scrollIntoView().should('be.visible');

    cy.wait(3500); // Sol paneldeki sarı vurgunun izleyici tarafından rahatça görülmesi için
  });

  it('2. Sistemin Belirsizliği Dürüstçe Gösterdiği An: Uydurulmuş/geçersiz alıntının dürüstçe reddedilmesi', () => {
    // Belirsizlik Senaryosunu Seç
    cy.wait(1500);
    cy.get('#scenario-uncertainty').click();
    cy.wait(2000); // Yeni senaryonun ve muğlak sözleşmenin ekranda fark edilmesi

    cy.get('#page-h1').should('contain', 'Muğlak ve Eksik Metin');
    cy.get('#ext-page-title').should('contain', 'Belirsizlik Senaryosu');

    // Analiz Et
    cy.get('#btn-ext-analyze').click();
    cy.get('#ext-results', { timeout: 10000 }).should('be.visible');

    cy.wait(2500); // Sonuçların okunması için bekleme

    // Dürüstlük ve Belirsizlik Kontrolü
    cy.get('#ext-score').should('contain', '35');
    cy.get('#ext-level-badge').should('contain', 'BELİRSİZ');
    cy.get('#ext-rejected-count').should('contain', '1');

    // Metinde olmayan sahte iddianın reddedildiğini gösteren alana odaklan
    cy.contains('✗ Alıntı Doğrulanamadı').scrollIntoView().should('be.visible');
    cy.wait(1500);

    cy.contains('Kullanıcı Banka Hesaplarına El Konulması').scrollIntoView().should('have.class', 'line-through');
    cy.wait(1500);

    cy.contains('DÜRÜSTLÜK & BELİRSİZLİK BİLDİRİMİ').scrollIntoView().should('be.visible');

    cy.wait(4000); // Dürüstlük bildiriminin videoda net okunabilmesi için
  });

  it('3. Prompt Injection Testi: Gizli talimatın yakalanması ve risk skorunun yükselmesi', () => {
    // Injection Senaryosunu Seç
    cy.wait(1500);
    cy.get('#scenario-injection').click();
    cy.wait(2000);

    // Sayfadaki saldırgan komutun gösterilmesi
    cy.contains('IGNORE ALL PREVIOUS INSTRUCTIONS').scrollIntoView().should('be.visible');
    cy.wait(2000);

    // Analiz Et
    cy.get('#btn-ext-analyze').click();
    cy.get('#ext-results', { timeout: 10000 }).should('be.visible');

    cy.wait(2500);

    // Güvenlik alarmının ve kritik skorun gösterilmesi
    cy.get('#ext-security-alert').scrollIntoView().should('be.visible');
    cy.contains('GÜVENLİK ALARMI: Prompt Injection Tespit Edildi!').should('be.visible');
    cy.get('#ext-level-badge').should('contain', 'KRİTİK RİSK');

    cy.wait(3500); // Videonun sakin bir kapanış yapması için
  });
});
