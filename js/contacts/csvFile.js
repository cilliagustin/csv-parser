console.log("contacts/csvFile.js loaded ✅");

import { formatNameFromSingleColumn, formatPhoneForOutput } from "./steps.js";

export function buildAndDownloadContactsCSV(csvData, mapping) {
  const headers = ["Contact name", "Contact phone number"];
  const contacts = [];

  csvData.rows.forEach(row => {
    let name = "";
    if (mapping.contactName.length === 2) {
      const a = (row[mapping.contactName[0]] || "").toString().trim();
      const b = (row[mapping.contactName[1]] || "").toString().trim();
      name = [a, b].filter(Boolean).join(" ");
    } else if (mapping.contactName.length === 1) {
      const raw = (row[mapping.contactName[0]] || "").toString();
      name = mapping.nameFormat.enabled
        ? formatNameFromSingleColumn(raw, mapping.nameFormat.pattern)
        : raw;
    }

    const phoneRaw = row[mapping.contactPhone] || "";
    const phoneFormatted = formatPhoneForOutput(phoneRaw);
    if (!phoneFormatted) return;

    contacts.push({ name, phone: phoneFormatted });
  });

  // Deduplicate by phone
  const unique = Object.values(
    contacts.reduce((acc, cur) => {
      if (!acc[cur.phone]) acc[cur.phone] = cur;
      return acc;
    }, {})
  );

  // Sort alphabetically by name
  unique.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

  const data = unique.map(c => [c.name, c.phone]);

  const csvString = Papa.unparse({ fields: headers, data });
  const blob = new Blob(["\uFEFF" + csvString], { type: "text/csv;charset=utf-8;" });

  const base = (csvData.originalName || "contacts").replace(/[^\w.-]+/g, "_");
  const ymd = new Date().toISOString().slice(0, 10);
  const filename = `${base}-contacts_${ymd}.csv`;

  const a = document.createElement("a");
  const url = URL.createObjectURL(blob);
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  console.log(`✅ Exported ${unique.length} unique contacts.`);
}
