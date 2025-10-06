console.log("contacts/app.js loaded ✅");

import {
  renderOriginalPreview,
  renderResultPreview,
  goToStep,
} from "./steps.js";

import {
  buildAndDownloadContactsCSV,
} from "./csvFile.js";

// ---------------- GLOBAL STATE ----------------
window.contactMapping = {
  contactName: [],
  nameFormat: { enabled: false, pattern: null },
  contactPhone: null,
};

window.contactsCsvData = null;

// ---------------- EXPORT HANDLER (called from main.js) ----------------
export function startContactsFlow(csvData) {
  console.log("📂 Starting Contacts Exporter");

  window.contactsCsvData = csvData;
  renderOriginalPreview(csvData);
  renderResultPreview(csvData, window.contactMapping);
  goToStep(1);

  const modal = new bootstrap.Modal(document.getElementById("contactsModal"));
  modal.show();
}

// ---------------- DOM READY BLOCK ----------------
document.addEventListener("DOMContentLoaded", () => {
  // ---------------- NAVIGATION ----------------
  const nextBtn = document.getElementById("contactsNextBtn");
  const backBtn = document.getElementById("contactsBackBtn");
  const finishBtn = document.getElementById("contactsFinishBtn");

  if (nextBtn)
    nextBtn.addEventListener("click", () => {
      if (window.contactsCurrentStep < 2) goToStep(window.contactsCurrentStep + 1);
    });

  if (backBtn)
    backBtn.addEventListener("click", () => {
      if (window.contactsCurrentStep > 1) goToStep(window.contactsCurrentStep - 1);
    });

  if (finishBtn)
    finishBtn.addEventListener("click", () => {
      console.log("📤 Exporting contacts...");
      buildAndDownloadContactsCSV(window.contactsCsvData, window.contactMapping);
    });

  // ---------------- STEP 1 — Name format controls ----------------
  const nameFormatCheckbox = document.getElementById("contactsNameFormatCheckbox");
  const nameFormatSelect = document.getElementById("contactsNameFormatSelect");

  if (nameFormatCheckbox)
    nameFormatCheckbox.addEventListener("change", function () {
      const canUse = window.contactMapping.contactName.length === 1;
      if (!canUse) {
        this.checked = false;
        nameFormatSelect.disabled = true;
        window.contactMapping.nameFormat.enabled = false;
        window.contactMapping.nameFormat.pattern = null;
      } else {
        window.contactMapping.nameFormat.enabled = this.checked;
        nameFormatSelect.disabled = !this.checked;
      }
      renderResultPreview(window.contactsCsvData, window.contactMapping);
    });

  if (nameFormatSelect)
    nameFormatSelect.addEventListener("change", function () {
      window.contactMapping.nameFormat.pattern = this.value || null;
      renderResultPreview(window.contactsCsvData, window.contactMapping);
    });
});
