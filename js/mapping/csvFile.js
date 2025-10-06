console.log("csvFile.js loaded (final version)");

// ---- imports ----
import { formatNameFromSingleColumn, formatTimestamp, formatPhoneForOutput } from "./steps.js";

// ============================================================================
// VALIDATION + EXPORT
// ============================================================================

export function validateAndPrepareExport(csvData, mapping) {
  const resultHeaders = [
    "Contact name",
    "Contact phone number",
    "Message timestamp",
    "Message direction",
    "Channel phone number",
    "Message body",
  ];

  const validRows = [];
  const errorRows = [];

  for (let i = 0; i < csvData.rows.length; i++) {
    const originalRow = csvData.rows[i];
    const mappedRow = mapRow(originalRow, mapping);

    const { hasError, errorsResult, errorsOriginal } = validateMappedRow(
      mappedRow,
      resultHeaders,
      originalRow,
      csvData.headers,
      mapping
    );

    if (!hasError) {
      validRows.push(mappedRow);
    } else {
      const combinedErrors = { ...errorsResult, ...errorsOriginal };
      errorRows.push({
        original: originalRow,
        result: mappedRow,
        errors: combinedErrors,
      });
    }
  }

  window.validRows = validRows;
  window.errorRows = errorRows;

  return { headers: resultHeaders, validRows, errorRows };
}

// ============================================================================
// CSV BUILD / EXPORT
// ============================================================================

export function buildAndDownloadCSV(csvData, mapping, skipValidation = false) {
  const headers = [
    "Contact name",
    "Contact phone number",
    "Message timestamp",
    "Message direction",
    "Channel phone number",
    "Message body",
  ];

  const rows =
    skipValidation && Array.isArray(window.validRows)
      ? window.validRows
      : csvData.rows.map((row) => mapRow(row, mapping));

  // ---- chunk large exports (max 35k rows per file) ----
  const MAX_ROWS = 34999;
  const totalChunks = Math.ceil(rows.length / MAX_ROWS);
  const base = (csvData.originalName || "export").replace(/[^\w.-]+/g, "_");
  const ymd = new Date().toISOString().slice(0, 10);

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    const start = chunkIndex * MAX_ROWS;
    const end = start + MAX_ROWS;
    const chunkRows = rows.slice(start, end);

    const csvString = Papa.unparse({ fields: headers, data: chunkRows });
    const blob = new Blob(["\uFEFF" + csvString], { type: "text/csv;charset=utf-8;" });

    const filename =
      totalChunks > 1
        ? `${base}-mapped_${ymd}_part${chunkIndex + 1}_of_${totalChunks}.csv`
        : `${base}-mapped_${ymd}.csv`;

    downloadBlob(blob, filename);
  }

  // ---- export Excel workbook for errors, if any ----
  if (Array.isArray(window.errorRows) && window.errorRows.length > 0) {
    exportErrorWorkbook(window.errorRows, csvData.headers, headers, csvData.originalName);
  }

  console.log(`✅ Export complete: ${rows.length} rows (${totalChunks} file(s))`);
}

// ============================================================================
// MAPPING HELPERS
// ============================================================================

function safeString(v) {
  return v == null ? "" : String(v);
}

function getContactName(row, mapping) {
  if (!mapping.contactName || mapping.contactName.length === 0) return "";
  if (mapping.contactName.length === 2) {
    const a = safeString(row[mapping.contactName[0]]).trim();
    const b = safeString(row[mapping.contactName[1]]).trim();
    return [a, b].filter(Boolean).join(" ");
  }
  const raw = safeString(row[mapping.contactName[0]]);
  if (mapping.nameFormat && mapping.nameFormat.enabled && mapping.nameFormat.pattern) {
    return formatNameFromSingleColumn(raw, mapping.nameFormat.pattern);
  }
  return raw;
}

function getTimestampOut(row, mapping) {
  if (!mapping.messageTimestamp?.field) return "";
  const raw = safeString(row[mapping.messageTimestamp.field]);
  return mapping.messageTimestamp.order
    ? formatTimestamp(raw, mapping.messageTimestamp.order)
    : "";
}

function getDirectionOut(row, mapping) {
  if (!mapping.messageDirection?.field) return "";
  const raw = safeString(row[mapping.messageDirection.field]).trim().toLowerCase();
  const inbound = safeString(mapping.messageDirection.inbound).toLowerCase();
  const outbound = safeString(mapping.messageDirection.outbound).toLowerCase();
  if (inbound && raw === inbound) return "Inbound";
  if (outbound && raw === outbound) return "Outbound";
  return "";
}

function getBody(row, mapping) {
  return mapping.messageBody ? safeString(row[mapping.messageBody]) : "";
}

function mapRow(row, mapping) {
  const name = getContactName(row, mapping);
  const phone = mapping.contactPhone
    ? formatPhoneForOutput(safeString(row[mapping.contactPhone]))
    : "";
  const ts = getTimestampOut(row, mapping);
  const dir = getDirectionOut(row, mapping);
  const channel = mapping.channelPhoneNumber
    ? formatPhoneForOutput(mapping.channelPhoneNumber)
    : "";
  const body = getBody(row, mapping);
  return [name, phone, ts, dir, channel, body];
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

function validateMappedRow(mappedRow, resultHeaders, originalRow, originalHeaders, mapping) {
  const [name, phone, ts, dir, channel, body] = mappedRow;

  const errorsResult = {};
  const errorsOriginal = {};

  // Contact phone (required)
  if (!phone) {
    errorsResult["Contact phone number"] = "Missing phone";
    if (mapping.contactPhone) errorsOriginal[mapping.contactPhone] = "Missing phone";
  }

  // Timestamp (required valid)
  if (!isValidTimestamp(ts)) {
    errorsResult["Message timestamp"] = "Invalid or empty timestamp";
    if (mapping.messageTimestamp?.field)
      errorsOriginal[mapping.messageTimestamp.field] = "Invalid timestamp";
  }

  // Direction
  if (!(dir === "Inbound" || dir === "Outbound")) {
    errorsResult["Message direction"] = "Invalid direction";
    if (mapping.messageDirection?.field)
      errorsOriginal[mapping.messageDirection.field] = "Invalid direction";
  }

  // Channel phone (10 or 11 digits starting with 1)
  if (!isValidChannel(channel)) {
    errorsResult["Channel phone number"] = "Invalid channel phone";
  }

  // Body (required)
  if (!body || !body.trim()) {
  errorsResult["Message body"] = "Empty body";
  if (mapping.messageBody) errorsOriginal[mapping.messageBody] = "Empty body";
}

  const hasError =
    Object.keys(errorsResult).length > 0 || Object.keys(errorsOriginal).length > 0;
  return { hasError, errorsResult, errorsOriginal };
}

function isValidTimestamp(value) {
  if (!value) return false;

  // ISO or MM/DD/YYYY → let JS handle
  const isoLike = /^\d{4}-\d{2}-\d{2}/.test(value);
  const dmyLike = /^\d{1,2}\/\d{1,2}\/\d{4}/.test(value);

  if (isoLike || !dmyLike) {
    const d = new Date(value);
    return !isNaN(d.getTime());
  }

  // Handle DMY manually (e.g. "30/12/2024 20:01")
  const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2}))?$/);
  if (!match) return false;

  const [_, d, m, y, hh = "0", mm = "0"] = match.map(Number);
  if (d < 1 || m < 1 || y < 1000 || m > 12 || d > 31) return false;
  if (hh > 23 || mm > 59) return false;

  const date = new Date(y, m - 1, d, hh, mm);
  return date.getDate() === d && date.getMonth() === m - 1;
}

function isValidChannel(formattedPhone) {
  if (!formattedPhone) return false;
  const digits = String(formattedPhone).replace(/\D+/g, "");
  return digits.length === 10 || (digits.length === 11 && digits.startsWith("1"));
}

// ============================================================================
// FILE HELPERS
// ============================================================================

function downloadBlob(blob, filename) {
  const a = document.createElement("a");
  const url = URL.createObjectURL(blob);
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ============================================================================
// ERROR WORKBOOK EXPORT
// ============================================================================

function exportErrorWorkbook(errorRows, originalHeaders, resultHeaders, originalName) {
  const wb = XLSX.utils.book_new();

  // Original sheet
  const originalJson = errorRows.map((r) => {
    const obj = {};
    originalHeaders.forEach((h) => (obj[h] = r.original[h] ?? ""));
    return obj;
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(originalJson), "Original");

  // Result sheet
  const resultJson = errorRows.map((r) => {
    const rowObj = {};
    resultHeaders.forEach((h, i) => (rowObj[h] = r.result[i] ?? ""));
    return rowObj;
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resultJson), "Result");

  const base = (originalName || "export").replace(/[^\w.-]+/g, "_");
  const ymd = new Date().toISOString().slice(0, 10);
  const filename = `${base}-errors_${ymd}.xlsx`;
  XLSX.writeFile(wb, filename);
}

// ============================================================================
// PUBLIC WRAPPER FOR ERROR EXPORT BUTTON
// ============================================================================

export function exportErrorReport() {
  if (!Array.isArray(window.errorRows) || window.errorRows.length === 0) {
    console.warn("⚠️ No error rows to export.");
    return;
  }

  const csvData = window.csvData || {};
  const originalHeaders = csvData.headers || [];
  const resultHeaders = [
    "Contact name",
    "Contact phone number",
    "Message timestamp",
    "Message direction",
    "Channel phone number",
    "Message body",
  ];

  console.log(`📄 Exporting ${window.errorRows.length} error rows to workbook...`);
  exportErrorWorkbook(window.errorRows, originalHeaders, resultHeaders, csvData.originalName);
}
