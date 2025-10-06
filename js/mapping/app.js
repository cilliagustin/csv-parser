console.log("app.js loaded with error modal + full step logic");

import {
  buildAndDownloadCSV,
  validateAndPrepareExport,
  exportErrorReport,
} from "./csvFile.js";
import {
  renderOriginalPreview,
  renderResultPreview,
  goToStep,
  renderErrorModal,
} from "./steps.js";

// ---------------- GLOBAL STATE ----------------
window.mapping = {
  contactName: [],
  nameFormat: { enabled: false, pattern: null },
  contactPhone: null,
  messageTimestamp: { field: null, order: null },
  messageDirection: { field: null, inbound: null, outbound: null },
  channelPhoneNumber: null,
  messageBody: null,
};



// ---------------- NAVIGATION ----------------
document.getElementById("nextBtn").addEventListener("click", () => {
  if (window.currentStep < 6) goToStep(window.currentStep + 1);
});
document.getElementById("backBtn").addEventListener("click", () => {
  if (window.currentStep > 1) goToStep(window.currentStep - 1);
});

// ---------------- FINISH ----------------
document.getElementById("finishBtn").addEventListener("click", () => {
  console.log("🔍 Validating before export...");
  const result = validateAndPrepareExport(window.csvData, window.mapping);

  if (result.errorRows.length > 0) {
    console.warn(`⚠️ ${result.errorRows.length} rows failed validation.`);
    renderErrorModal(result, window.csvData.headers);
    new bootstrap.Modal("#errorModal").show();
  } else {
    console.log("✅ No errors, exporting CSV...");
    buildAndDownloadCSV(window.csvData, window.mapping);
  }
});

// ---------------- STEP 1 — Name format ----------------
const nameFormatCheckbox = document.getElementById("nameFormatCheckbox");
const nameFormatSelect = document.getElementById("nameFormatSelect");

nameFormatCheckbox.addEventListener("change", function () {
  const canUse = window.mapping.contactName.length === 1;
  if (!canUse) {
    this.checked = false;
    nameFormatSelect.disabled = true;
    window.mapping.nameFormat.enabled = false;
    window.mapping.nameFormat.pattern = null;
  } else {
    window.mapping.nameFormat.enabled = this.checked;
    nameFormatSelect.disabled = !this.checked;
  }
  renderResultPreview(window.csvData, window.mapping);
});

nameFormatSelect.addEventListener("change", function () {
  window.mapping.nameFormat.pattern = this.value || null;
  renderResultPreview(window.csvData, window.mapping);
});

// ---------------- STEP 3 — Timestamp format ----------------
document
  .getElementById("timestampFormat")
  .addEventListener("change", function () {
    const val = this.value || null;
    window.mapping.messageTimestamp.order = val;
    console.log("📅 Timestamp format selected:", val);
    renderResultPreview(window.csvData, window.mapping);

    const cond =
      window.mapping.messageTimestamp.field &&
      window.mapping.messageTimestamp.order;
    document.getElementById("nextBtn").disabled = !cond;
  });

// ---------------- STEP 4 — Direction tokens ----------------
document.getElementById("inboundToken").addEventListener("input", function () {
  window.mapping.messageDirection.inbound = this.value.trim() || null;
  renderResultPreview(window.csvData, window.mapping);

  const cond =
    window.mapping.messageDirection.field &&
    window.mapping.messageDirection.inbound &&
    window.mapping.messageDirection.outbound;
  document.getElementById("nextBtn").disabled = !cond;
});

document.getElementById("outboundToken").addEventListener("input", function () {
  window.mapping.messageDirection.outbound = this.value.trim() || null;
  renderResultPreview(window.csvData, window.mapping);

  const cond =
    window.mapping.messageDirection.field &&
    window.mapping.messageDirection.inbound &&
    window.mapping.messageDirection.outbound;
  document.getElementById("nextBtn").disabled = !cond;
});

// ---------------- STEP 5 — Channel phone input ----------------
function formatUSPhoneNumber(value) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length === 0) return "";

  // Format 10 digits -> (555) 555-5555
  if (digits.length === 10)
    return `(${digits.substring(0, 3)}) ${digits.substring(
      3,
      6
    )}-${digits.substring(6)}`;

  // Format 11 digits starting with 1 -> 1 (555) 555-5555
  if (digits.length === 11 && digits.startsWith("1"))
    return `1 (${digits.substring(1, 4)}) ${digits.substring(
      4,
      7
    )}-${digits.substring(7)}`;

  // Otherwise just raw digits
  return digits;
}

document
  .getElementById("channelPhone")
  .addEventListener("input", function () {
    const formatted = formatUSPhoneNumber(this.value);
    this.value = formatted;

    const digits = this.value.replace(/\D/g, "");
    window.mapping.channelPhoneNumber =
      digits.length === 10 || (digits.length === 11 && digits.startsWith("1"))
        ? formatted
        : null;

    renderResultPreview(window.csvData, window.mapping);
    document.getElementById("nextBtn").disabled =
      !window.mapping.channelPhoneNumber;
  });

// ---------------- FULLSCREEN CSV PREVIEWS ----------------
document.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-preview]");
  if (!btn) return;
  const id = btn.dataset.preview;
  const tableDiv = document.getElementById(id + "Preview");
  if (!tableDiv) return;

  document.getElementById("fullscreenTableTitle").textContent =
    id.includes("Result") ? "Result Preview" : "Original Preview";
  document.getElementById("fullscreenTableContainer").innerHTML =
    tableDiv.innerHTML;
  new bootstrap.Modal("#fullscreenTableModal").show();
});

// ---------------- EXPORT BUTTONS (ERROR MODAL) ----------------
document.addEventListener("click", async (e) => {
  if (e.target.id === "exportValidBtn") {
    console.log("📦 Exporting only valid rows...");
    buildAndDownloadCSV(window.csvData, window.mapping, true);
  }
  if (e.target.id === "exportErrorBtn") {
    console.log("⚠️ Exporting error report...");
    exportErrorReport();
  }
});

export function startMappingFlow(csvData) {
  window.csvData = csvData;
  renderOriginalPreview(csvData);
  renderResultPreview(csvData, window.mapping);
  goToStep(1);

  const modal = new bootstrap.Modal(document.getElementById("mappingModal"));
  modal.show();
}