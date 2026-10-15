"use strict";
// Background Service Worker (Manifest V3)
chrome.runtime.onInstalled.addListener(() => {
    console.log('[ToS Risk Analizörü] Uzantı başarıyla yüklendi.');
    // Varsayılan ayarları kaydet
    chrome.storage.local.get(['llmProvider'], (result) => {
        if (!result.llmProvider) {
            chrome.storage.local.set({
                llmProvider: 'mock', // Başlangıçta kullanıcının API keysiz hemen deneyebilmesi için
            });
        }
    });
});
// Sekme değişikliklerini dinle
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        const isLegalUrl = /terms|privacy|policy|tos|sozlesme|gizlilik|kosullar/i.test(tab.url);
        if (isLegalUrl) {
            chrome.action.setBadgeText({ tabId, text: 'ToS' });
            chrome.action.setBadgeBackgroundColor({ tabId, color: '#4f46e5' });
        }
        else {
            chrome.action.setBadgeText({ tabId, text: '' });
        }
    }
});
