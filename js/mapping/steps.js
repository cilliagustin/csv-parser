console.log("steps.js loaded — with timestamp format debug logs");

window.currentStep = 1;

export function goToStep(step) {
  console.log("Entering step", step);

  if (step < currentStep) resetStep(currentStep);
  window.currentStep = step;

  const headerEl = document.querySelector("#mappingModal .modal-title");
  if (headerEl) {
    const titles = {
      1: "Step 1 of 6 – Map Contact Name",
      2: "Step 2 of 6 – Map Contact Phone Number",
      3: "Step 3 of 6 – Map Message Timestamp",
      4: "Step 4 of 6 – Map Message Direction",
      5: "Step 5 of 6 – Set Channel Phone Number",
      6: "Step 6 of 6 – Map Message Body",
    };
    headerEl.textContent = titles[step] || "";
  }

  document.getElementById("nameFormatControls").classList.toggle("hidden", step !== 1);
  document.getElementById("timestampFormatContainer").classList.toggle("hidden", step !== 3);
  document.getElementById("directionInputs").classList.toggle("hidden", step !== 4);
  document.getElementById("channelPhoneContainer").classList.toggle("hidden", step !== 5);

  document.getElementById("backBtn").classList.toggle("hidden", step === 1);
  if (step === 6) {
    document.getElementById("nextBtn").classList.add("hidden");
    document.getElementById("finishBtn").classList.remove("hidden");
  } else {
    document.getElementById("nextBtn").classList.remove("hidden");
    document.getElementById("finishBtn").classList.add("hidden");
  }

  document.getElementById("nextBtn").disabled = !validateStep(step);

  renderOriginalPreview(window.csvData);
  renderResultPreview(window.csvData, window.mapping);

  restoreInputsForStep(step);
}

function resetStep(step) {
  if (step === 1) {
    window.mapping.contactName = [];
    window.mapping.nameFormat = { enabled: false, pattern: null };
  }
  if (step === 2) window.mapping.contactPhone = null;
  if (step === 3) {
    console.log("🧹 Resetting Step 3 timestamp mapping");
    window.mapping.messageTimestamp = { field: null, order: null };
  }
  if (step === 4) window.mapping.messageDirection = { field: null, inbound: null, outbound: null };
  if (step === 5) window.mapping.channelPhoneNumber = null;
  if (step === 6) window.mapping.messageBody = null;
}

function restoreInputsForStep(step) {
  if (step === 1) {
    const cb = document.getElementById("nameFormatCheckbox");
    const sel = document.getElementById("nameFormatSelect");
    if (window.mapping.contactName.length === 1) {
      cb.disabled = false;
      cb.checked = window.mapping.nameFormat.enabled;
      sel.disabled = !cb.checked;
      sel.value = window.mapping.nameFormat.pattern || "";
    } else {
      cb.checked = false;
      cb.disabled = true;
      sel.disabled = true;
      sel.value = "";
    }
  }
  if (step === 3) {
    const current = window.mapping.messageTimestamp;
    console.log("🔄 restoreInputsForStep(3):", JSON.stringify(current, null, 2));
    document.getElementById("timestampFormat").value = current.order || "";
  }
  if (step === 4) {
    document.getElementById("inboundToken").value = window.mapping.messageDirection.inbound || "";
    document.getElementById("outboundToken").value = window.mapping.messageDirection.outbound || "";
  }
  if (step === 5) {
    document.getElementById("channelPhone").value = window.mapping.channelPhoneNumber || "";
  }
}

function validateStep(step) {
  if (step === 1) return window.mapping.contactName.length >= 1;
  if (step === 2) return !!window.mapping.contactPhone;
  if (step === 3) {
    const valid =
      !!window.mapping.messageTimestamp.field &&
      !!window.mapping.messageTimestamp.order;
    console.log(
      "✅ validateStep(3):",
      JSON.stringify(window.mapping.messageTimestamp, null, 2),
      "→",
      valid
    );
    return valid;
  }
  if (step === 4)
    return !!(
      window.mapping.messageDirection.field &&
      window.mapping.messageDirection.inbound &&
      window.mapping.messageDirection.outbound
    );
  if (step === 5) return !!window.mapping.channelPhoneNumber;
  if (step === 6) return !!window.mapping.messageBody;
  return false;
}

/* --------- HIGHLIGHTING --------- */
function applyHighlights(originalTable, resultTable, mapping) {
  if (!originalTable || !resultTable) return;
  const stepColors = {
    1: { head: "map-step1-head", body: "map-step1-body", resultCol: "Contact name" },
    2: { head: "map-step2-head", body: "map-step2-body", resultCol: "Contact phone number" },
    3: { head: "map-step3-head", body: "map-step3-body", resultCol: "Message timestamp" },
    4: { head: "map-step4-head", body: "map-step4-body", resultCol: "Message direction" },
    5: { head: "map-step5-head", body: "map-step5-body", resultCol: "Channel phone number" },
    6: { head: "map-step6-head", body: "map-step6-body", resultCol: "Message body" },
  };
  Object.keys(stepColors).forEach(step => {
    const { head, body, resultCol } = stepColors[step];
    const stepNum = parseInt(step, 10);

    const shouldHighlightResult =
      stepNum === currentStep ||
      (stepNum === 1 && mapping.contactName.length > 0) ||
      (stepNum === 2 && mapping.contactPhone) ||
      (stepNum === 3 && mapping.messageTimestamp.field) ||
      (stepNum === 4 && mapping.messageDirection.field) ||
      (stepNum === 5 && mapping.channelPhoneNumber) ||
      (stepNum === 6 && mapping.messageBody);

    if (shouldHighlightResult) {
      const resultHeaders = [...resultTable.querySelectorAll("thead th")];
      const resultIndex = resultHeaders.findIndex(th => th.textContent === resultCol);
      if (resultIndex !== -1) {
        resultHeaders[resultIndex].classList.add(head);
        resultTable.querySelectorAll("tbody tr").forEach(tr => {
          tr.children[resultIndex].classList.add(body);
        });
      }
    }

    if (stepNum === 1 && mapping.contactName.length > 0) {
      mapping.contactName.forEach(h =>
        highlightOriginalColumn(originalTable, h, head, body)
      );
    }
    if (stepNum === 2 && mapping.contactPhone) {
      highlightOriginalColumn(originalTable, mapping.contactPhone, head, body);
    }
    if (stepNum === 3 && mapping.messageTimestamp.field) {
      highlightOriginalColumn(originalTable, mapping.messageTimestamp.field, head, body);
    }
    if (stepNum === 4 && mapping.messageDirection.field) {
      highlightOriginalColumn(originalTable, mapping.messageDirection.field, head, body);
    }
    if (stepNum === 6 && mapping.messageBody) {
      highlightOriginalColumn(originalTable, mapping.messageBody, head, body);
    }
  });
}

function highlightOriginalColumn(originalTable, headerName, headClass, bodyClass) {
  const headers = [...originalTable.querySelectorAll("thead th")];
  const colIndex = headers.findIndex(th => th.textContent === headerName);
  if (colIndex === -1) return;
  headers[colIndex].classList.add(headClass);
  originalTable.querySelectorAll("tbody tr").forEach(tr => {
    tr.children[colIndex].classList.add(bodyClass);
  });
}

/* -------- Rendering -------- */
export function renderOriginalPreview(csvData) {
  const container = document.getElementById("originalPreview");
  container.innerHTML = "";
  const table = document.createElement("table");
  table.className = "table table-bordered";
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  csvData.headers.forEach(header => {
    const th = document.createElement("th");
    th.textContent = header;
    th.style.cursor = "pointer";
    th.addEventListener("click", () => handleHeaderClick(header));
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);
  const tbody = document.createElement("tbody");
  csvData.previewRows.forEach(row => {
    const tr = document.createElement("tr");
    csvData.headers.forEach(header => {
      const td = document.createElement("td");
      td.textContent = row[header] || "";
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  container.appendChild(table);
  const resultTable = document.querySelector("#resultPreview table");
  if (window.mapping && resultTable) applyHighlights(table, resultTable, window.mapping);
}

export function renderResultPreview(csvData, mapping = {}) {
  const container = document.getElementById("resultPreview");
  container.innerHTML = "";
  const table = document.createElement("table");
  table.className = "table table-bordered";
  const headers = [
    "Contact name",
    "Contact phone number",
    "Message timestamp",
    "Message direction",
    "Channel phone number",
    "Message body",
  ];
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  headers.forEach(h => {
    const th = document.createElement("th");
    th.textContent = h;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  csvData.previewRows.forEach((row, i) => {
    const tr = document.createElement("tr");
    headers.forEach(header => {
      const td = document.createElement("td");

      if (header === "Contact name" && mapping.contactName.length > 0) {
        let nameOut = "";
        if (mapping.contactName.length === 2) {
          const a = (row[mapping.contactName[0]] || "").toString().trim();
          const b = (row[mapping.contactName[1]] || "").toString().trim();
          nameOut = [a, b].filter(Boolean).join(" ");
        } else if (mapping.contactName.length === 1) {
          const raw = (row[mapping.contactName[0]] || "").toString();
          if (mapping.nameFormat.enabled && mapping.nameFormat.pattern) {
            nameOut = formatNameFromSingleColumn(raw, mapping.nameFormat.pattern);
          } else {
            nameOut = raw;
          }
        }
        td.textContent = nameOut;
      }

      if (header === "Contact phone number" && mapping.contactPhone) {
        const raw = row[mapping.contactPhone] || "";
        td.textContent = formatPhoneForOutput(raw);
      }

      if (header === "Message timestamp" && mapping.messageTimestamp.field) {
        const raw = row[mapping.messageTimestamp.field] || "";
        const formatted =
          raw && mapping.messageTimestamp.order
            ? formatTimestamp(raw, mapping.messageTimestamp.order)
            : "";
        td.textContent = formatted;
        if (i === 0) {
          console.log(
            `🕒 Sample format Row 0: raw="${raw}" | order="${mapping.messageTimestamp.order}" | formatted="${formatted}"`
          );
        }
      }

      if (header === "Message direction" && mapping.messageDirection.field) {
        const raw = (row[mapping.messageDirection.field] || "").toString();
        if (
          mapping.messageDirection.inbound &&
          raw.toLowerCase() === mapping.messageDirection.inbound.toLowerCase()
        ) {
          td.textContent = "Inbound";
        } else if (
          mapping.messageDirection.outbound &&
          raw.toLowerCase() === mapping.messageDirection.outbound.toLowerCase()
        ) {
          td.textContent = "Outbound";
        } else {
          td.textContent = "";
        }
      }

      if (header === "Channel phone number" && mapping.channelPhoneNumber) {
        td.textContent = formatPhoneForOutput(mapping.channelPhoneNumber);
      }

      if (header === "Message body" && mapping.messageBody) {
        td.textContent = row[mapping.messageBody] || "";
      }

      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  container.appendChild(table);

  const originalTable = document.querySelector("#originalPreview table");
  if (window.mapping && originalTable) applyHighlights(originalTable, table, mapping);
}

/* -------- Utilities -------- */
export function formatNameFromSingleColumn(raw, pattern) {
  if (!raw) return "";
  const clean = String(raw).replace(/,/g, " ").trim().replace(/\s+/g, " ");
  const parts = clean.split(" ");
  if (parts.length === 1) return clean;
  switch (pattern) {
    case "LAST_FIRST":
      return `${parts.slice(1).join(" ")} ${parts[0]}`.trim();
    case "LAST_FIRST_MIDDLE":
      return `${parts[1]} ${parts.slice(2).join(" ")} ${parts[0]}`.trim();
    case "LAST_SECONDLAST_FIRST":
      return `${parts.slice(2).join(" ")} ${parts[0]} ${parts[1]}`.trim();
    case "LAST_SECONDLAST_FIRST_MIDDLE":
      return `${parts[2]} ${parts.slice(3).join(" ")} ${parts[0]} ${parts[1]}`.trim();
    case "FIRST_MIDDLE_LAST":
      return `${parts[0]} ${parts.slice(1, -1).join(" ")} ${parts[parts.length - 1]}`.trim();
    case "FIRST_LAST_SECONDLAST":
      return `${parts[0]} ${parts[1]} ${parts.slice(2).join(" ")}`.trim();
    case "FIRST_MIDDLE_LAST_SECONDLAST":
      return `${parts[0]} ${parts.slice(1, -2).join(" ")} ${parts.slice(-2).join(" ")}`.trim();
    default:
      return clean;
  }
}

// ============================================================================
// FORMAT TIMESTAMP — Always zero-pads DD/MM/YYYY HH:MM
// ============================================================================

export function formatTimestamp(raw, order = "DMY") {
  if (!raw) return "";

  const str = String(raw).trim();
  const pad2 = (n) => String(n).padStart(2, "0");

  // Match flexible separators and optional time
  const match = str.match(/^(\d{1,4})[\/\-](\d{1,2})[\/\-](\d{1,4})(?:\s+(\d{1,2}):(\d{1,2}))?$/);
  let d, m, y, hh = 0, mm = 0;

  if (match) {
    const [_, p1, p2, p3, phh, pmm] = match;
    const n1 = Number(p1), n2 = Number(p2), n3 = Number(p3);
    hh = Number(phh) || 0;
    mm = Number(pmm) || 0;

    // Map based on order
    if (order === "DMY") {
      [d, m, y] = [n1, n2, n3];
    } else if (order === "MDY") {
      [m, d, y] = [n1, n2, n3];
    } else if (order === "YMD") {
      [y, m, d] = [n1, n2, n3];
    }
  } else {
    // Handle ISO YYYY-MM-DD formats safely
    const iso = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})(?:[T\s](\d{1,2}):(\d{1,2}))?/);
    if (iso) {
      const [_, y1, m1, d1, hh1, mm1] = iso.map(Number);
      [y, m, d, hh, mm] = [y1, m1, d1, hh1 || 0, mm1 || 0];
    } else {
      // If the format is unknown, return the raw string
      return str;
    }
  }

  // Always pad everything: DD/MM/YYYY HH:MM
  return `${pad2(d)}/${pad2(m)}/${y} ${pad2(hh)}:${pad2(mm)}`;
}



export function formatPhoneForOutput(value) {
  if (!value) return "";
  const digits = String(value).replace(/\D+/g, "");
  if (digits.length === 10)
    return `(${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6)}`;
  if (digits.length === 11 && digits.startsWith("1"))
    return `1 (${digits.substring(1, 4)}) ${digits.substring(4, 7)}-${digits.substring(7)}`;
  return digits;
}

/* -------- Header click handler -------- */
function handleHeaderClick(header) {
  if (currentStep === 1) {
    const selected = window.mapping.contactName;
    if (selected.includes(header)) {
      window.mapping.contactName = selected.filter(h => h !== header);
    } else {
      if (selected.length >= 2) return;
      window.mapping.contactName.push(header);
    }
    renderResultPreview(window.csvData, window.mapping);
    renderOriginalPreview(window.csvData);
    document.getElementById("nextBtn").disabled = !validateStep(1);
    restoreInputsForStep(1);
  }
  if (currentStep === 2) {
    window.mapping.contactPhone = header;
    renderResultPreview(window.csvData, window.mapping);
    renderOriginalPreview(window.csvData);
    document.getElementById("nextBtn").disabled = !validateStep(2);
  }
  if (currentStep === 3) {
    console.log("🖱️ Clicked timestamp column:", header);
    window.mapping.messageTimestamp.field = header;
    console.log("➡️ mapping.messageTimestamp after click:", window.mapping.messageTimestamp);
    renderResultPreview(window.csvData, window.mapping);
    renderOriginalPreview(window.csvData);
    document.getElementById("nextBtn").disabled = !validateStep(3);
  }
  if (currentStep === 4) {
    window.mapping.messageDirection.field = header;
    renderResultPreview(window.csvData, window.mapping);
    renderOriginalPreview(window.csvData);
    document.getElementById("nextBtn").disabled = !validateStep(4);
  }
  if (currentStep === 6) {
    window.mapping.messageBody = header;
    renderResultPreview(window.csvData, window.mapping);
    renderOriginalPreview(window.csvData);
    document.getElementById("nextBtn").disabled = !validateStep(6);
  }
}

// Handle Step 3 — timestamp format change
document.getElementById("timestampFormat")?.addEventListener("change", function () {
  const val = this.value || null;
  window.mapping.messageTimestamp.order = val;
  console.log("📅 [Step 3] Timestamp format selected:", val);
  renderResultPreview(window.csvData, window.mapping);

  const cond =
    window.mapping.messageTimestamp.field &&
    window.mapping.messageTimestamp.order;
  document.getElementById("nextBtn").disabled = !cond;
});


/* -------- Error Modal Renderer -------- */
export function renderErrorModal(result, headers) {
  const MAX_INITIAL_ROWS = 50;
  const CHUNK_SIZE = 50;
  let visibleCount = 0;
  let loading = false;

  const totalErrors = result.errorRows.length;
  const errSummary = document.getElementById("errorSummary");
  errSummary.textContent = `⚠️ ${totalErrors} rows could not be transformed. Showing up to ${MAX_INITIAL_ROWS} initially. Scroll to load more.`;

  const origDiv = document.getElementById("errorOriginalPreview");
  const resDiv = document.getElementById("errorResultPreview");
  origDiv.innerHTML = "";
  resDiv.innerHTML = "";

  // ---- build static table heads ----
  const origTable = document.createElement("table");
  origTable.className = "table table-bordered mb-0";
  const origHead = document.createElement("thead");
  const origHeadRow = document.createElement("tr");

  // gray row-number header
  const rowNumTh1 = document.createElement("th");
  rowNumTh1.textContent = "Original Row";
  rowNumTh1.style.background = "#f1f1f1";
  rowNumTh1.style.color = "#555";
  origHeadRow.appendChild(rowNumTh1);

  headers.forEach((h) => {
    const th = document.createElement("th");
    th.textContent = h;
    origHeadRow.appendChild(th);
  });
  origHead.appendChild(origHeadRow);
  origTable.appendChild(origHead);
  const origBody = document.createElement("tbody");
  origTable.appendChild(origBody);
  origDiv.appendChild(origTable);

  const resTable = document.createElement("table");
  resTable.className = "table table-bordered mb-0";
  const resHead = document.createElement("thead");
  const resHeadRow = document.createElement("tr");

  // gray row-number header for result table too
  const rowNumTh2 = document.createElement("th");
  rowNumTh2.textContent = "Original Row";
  rowNumTh2.style.background = "#f1f1f1";
  rowNumTh2.style.color = "#555";
  resHeadRow.appendChild(rowNumTh2);

  result.headers.forEach((h) => {
    const th = document.createElement("th");
    th.textContent = h;
    resHeadRow.appendChild(th);
  });
  resHead.appendChild(resHeadRow);
  resTable.appendChild(resHead);
  const resBody = document.createElement("tbody");
  resTable.appendChild(resBody);
  resDiv.appendChild(resTable);

  // ---- render next chunk ----
  function appendChunk() {
    if (loading) return;
    loading = true;
    const slice = result.errorRows.slice(visibleCount, visibleCount + CHUNK_SIZE);
    if (slice.length === 0) return;

    slice.forEach((r) => {
      // Original table row
      const trO = document.createElement("tr");
      const numTd1 = document.createElement("td");
      numTd1.textContent = r.original.__rowIndex ?? "";
      numTd1.style.background = "#f9f9f9";
      numTd1.style.color = "#666";
      trO.appendChild(numTd1);

      headers.forEach((h) => {
        const td = document.createElement("td");
        td.textContent = r.original[h] || "";
        if (r.errors[h]) td.classList.add("error-cell");
        trO.appendChild(td);
      });
      origBody.appendChild(trO);

      // Result table row
      const trR = document.createElement("tr");
      const numTd2 = document.createElement("td");
      numTd2.textContent = r.original.__rowIndex ?? "";
      numTd2.style.background = "#f9f9f9";
      numTd2.style.color = "#666";
      trR.appendChild(numTd2);

      result.headers.forEach((h, i) => {
        const td = document.createElement("td");
        td.textContent = r.result[i] || "";
        if (r.errors[h]) td.classList.add("error-cell");
        trR.appendChild(td);
      });
      resBody.appendChild(trR);
    });

    visibleCount += slice.length;
    loading = false;
  }

  // ---- initial render ----
  appendChunk();

  // ---- lazy load on scroll ----
  const modalBody = document.querySelector("#errorModal .modal-body");
  modalBody.onscroll = () => {
    if (modalBody.scrollTop + modalBody.clientHeight >= modalBody.scrollHeight - 200) {
      if (visibleCount < totalErrors) appendChunk();
    }
  };

  // ---- counter ----
  const counter = document.createElement("div");
  counter.id = "errorRowCounter";
  counter.className = "text-muted small mt-2";
  counter.textContent = `Showing ${visibleCount} of ${totalErrors} error rows`;
  modalBody.appendChild(counter);

  const observer = new MutationObserver(() => {
    counter.textContent = `Showing ${Math.min(visibleCount, totalErrors)} of ${totalErrors} error rows`;
  });
  observer.observe(origBody, { childList: true });
}


