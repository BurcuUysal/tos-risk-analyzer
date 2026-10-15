"use strict";
// Options Controller
const providerSelect = document.getElementById('provider-select');
const apiKeyInput = document.getElementById('api-key-input');
const modelNameInput = document.getElementById('model-name-input');
const btnSave = document.getElementById('btn-save');
const saveStatus = document.getElementById('save-status');
const toggleKeyBtn = document.getElementById('toggle-key-visibility');
const apiKeyGroup = document.getElementById('api-key-group');
const modelNameGroup = document.getElementById('model-name-group');
document.addEventListener('DOMContentLoaded', async () => {
    // Mevcut ayarları yükle
    if (chrome.storage && chrome.storage.local) {
        const data = await chrome.storage.local.get(['llmProvider', 'apiKey', 'modelName']);
        if (data.llmProvider)
            providerSelect.value = data.llmProvider;
        if (data.apiKey)
            apiKeyInput.value = data.apiKey;
        if (data.modelName)
            modelNameInput.value = data.modelName;
    }
    updateVisibility();
    providerSelect.addEventListener('change', updateVisibility);
    toggleKeyBtn.addEventListener('click', () => {
        if (apiKeyInput.type === 'password') {
            apiKeyInput.type = 'text';
            toggleKeyBtn.textContent = '🙈';
        }
        else {
            apiKeyInput.type = 'password';
            toggleKeyBtn.textContent = '👁️';
        }
    });
    btnSave.addEventListener('click', async () => {
        const provider = providerSelect.value;
        const apiKey = apiKeyInput.value.trim();
        const modelName = modelNameInput.value.trim();
        if (provider !== 'mock' && !apiKey) {
            alert('Lütfen seçtiğiniz sağlayıcı için geçerli bir API anahtarı girin veya "Dahili Çevrimdışı / Mock" seçeneğini kullanın.');
            return;
        }
        if (chrome.storage && chrome.storage.local) {
            await chrome.storage.local.set({
                llmProvider: provider,
                apiKey,
                modelName,
            });
        }
        saveStatus.classList.remove('hidden');
        setTimeout(() => {
            saveStatus.classList.add('hidden');
        }, 3000);
    });
});
function updateVisibility() {
    const isMock = providerSelect.value === 'mock';
    apiKeyGroup.style.opacity = isMock ? '0.4' : '1';
    modelNameGroup.style.opacity = isMock ? '0.4' : '1';
}
