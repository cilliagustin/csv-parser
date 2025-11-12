console.log("csvFile.js loaded (final version with ZIP export)");

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
// CSV BUILD / EXPORT (ZIP version)
// ============================================================================

export async function buildAndDownloadCSV(csvData, mapping, skipValidation = false) {
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

  const MAX_ROWS = 34999;
  const totalChunks = Math.ceil(rows.length / MAX_ROWS);
  const base = (csvData.originalName || "export").replace(/[^\w.-]+/g, "_");
  const ymd = new Date().toISOString().slice(0, 10);

  const zip = new JSZip();

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    const start = chunkIndex * MAX_ROWS;
    const end = start + MAX_ROWS;
    const chunkRows = rows.slice(start, end);

    const csvString = Papa.unparse({ fields: headers, data: chunkRows });
    const fileName =
      totalChunks > 1
        ? `${base}-mapped_${ymd}_part${chunkIndex + 1}_of_${totalChunks}.csv`
        : `${base}-mapped_${ymd}.csv`;

    zip.file(fileName, "\uFEFF" + csvString);
  }

  // ---- add error workbook if any ----
  if (Array.isArray(window.errorRows) && window.errorRows.length > 0) {
    const errorBlob = createErrorWorkbookBlob(
      window.errorRows,
      csvData.headers,
      headers,
      csvData.originalName
    );
    const errorFileName = `${base}-errors_${ymd}.xlsx`;
    zip.file(errorFileName, errorBlob);
  }

  const zipBlob = await zip.generateAsync({ type: "blob" });
  const zipName =
    totalChunks > 1
      ? `${base}-mapped_${ymd}_${totalChunks}files.zip`
      : `${base}-mapped_${ymd}.zip`;

  downloadBlob(zipBlob, zipName);

  console.log(
    `✅ Export complete: ${rows.length} rows zipped into ${zipName} (${totalChunks} csv file(s)${
      window.errorRows?.length ? " + errors workbook" : ""
    })`
  );
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

  if (!phone) {
    errorsResult["Contact phone number"] = "Missing phone";
    if (mapping.contactPhone) errorsOriginal[mapping.contactPhone] = "Missing phone";
  }

  if (!isValidTimestamp(ts)) {
    errorsResult["Message timestamp"] = "Invalid or empty timestamp";
    if (mapping.messageTimestamp?.field)
      errorsOriginal[mapping.messageTimestamp.field] = "Invalid timestamp";
  }

  if (!(dir === "Inbound" || dir === "Outbound")) {
    errorsResult["Message direction"] = "Invalid direction";
    if (mapping.messageDirection?.field)
      errorsOriginal[mapping.messageDirection.field] = "Invalid direction";
  }

  if (!isValidChannel(channel)) {
    errorsResult["Channel phone number"] = "Invalid channel phone";
  }

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
  const isoLike = /^\d{4}-\d{2}-\d{2}/.test(value);
  const dmyLike = /^\d{1,2}\/\d{1,2}\/\d{4}/.test(value);

  if (isoLike || !dmyLike) {
    const d = new Date(value);
    return !isNaN(d.getTime());
  }

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

function createErrorWorkbookBlob(errorRows, originalHeaders, resultHeaders, originalName) {
  const wb = XLSX.utils.book_new();

  const originalJson = errorRows.map((r) => {
    const obj = {};
    originalHeaders.forEach((h) => (obj[h] = r.original[h] ?? ""));
    return obj;
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(originalJson), "Original");

  const resultJson = errorRows.map((r) => {
    const rowObj = {};
    resultHeaders.forEach((h, i) => (rowObj[h] = r.result[i] ?? ""));
    rowObj.__errors = JSON.stringify(r.errors || {});
    return rowObj;
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resultJson), "Result");

  const wbArray = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return new Blob([wbArray], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

// ============================================================================
// PUBLIC WRAPPER FOR ERROR EXPORT BUTTON
// ============================================================================

export async function exportErrorReport() {
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

  const base = (csvData.originalName || "export").replace(/[^\w.-]+/g, "_");
  const ymd = new Date().toISOString().slice(0, 10);

  const zip = new JSZip();
  const errorBlob = createErrorWorkbookBlob(
    window.errorRows,
    originalHeaders,
    resultHeaders,
    csvData.originalName
  );
  const errorXlsxName = `${base}-errors_${ymd}.xlsx`;
  zip.file(errorXlsxName, errorBlob);

  const zipBlob = await zip.generateAsync({ type: "blob" });
  const zipName = `${base}-errors_${ymd}.zip`;
  downloadBlob(zipBlob, zipName);

  console.log(`📄 Exported ${window.errorRows.length} error rows as ${zipName}`);
}
