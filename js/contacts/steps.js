console.log("contacts/steps.js loaded ✅");

window.contactsCurrentStep = 1;

// ====================
// STEP NAVIGATION
// ====================
export function goToStep(step) {
  console.log("Entering contacts step", step);

  if (step < window.contactsCurrentStep) resetStep(window.contactsCurrentStep);
  window.contactsCurrentStep = step;

  const headerEl = document.querySelector("#contactsModal .modal-title");
  if (headerEl) {
    const titles = {
      1: "Step 1 of 2 – Map Contact Name",
      2: "Step 2 of 2 – Map Contact Phone Number",
    };
    headerEl.textContent = titles[step] || "";
  }

  document.getElementById("contactsNameFormatControls").classList.toggle("hidden", step !== 1);
  document.getElementById("contactsBackBtn").classList.toggle("hidden", step === 1);

  if (step === 2) {
    document.getElementById("contactsNextBtn").classList.add("hidden");
    document.getElementById("contactsFinishBtn").classList.remove("hidden");
  } else {
    document.getElementById("contactsNextBtn").classList.remove("hidden");
    document.getElementById("contactsFinishBtn").classList.add("hidden");
  }

  document.getElementById("contactsNextBtn").disabled = !validateStep(step);

  renderOriginalPreview(window.contactsCsvData);
  renderResultPreview(window.contactsCsvData, window.contactMapping);

  restoreInputsForStep(step);
}

// ====================
// RESET STEP
// ====================
function resetStep(step) {
  if (step === 1) {
    window.contactMapping.contactName = [];
    window.contactMapping.nameFormat = { enabled: false, pattern: null };
  }
  if (step === 2) {
    window.contactMapping.contactPhone = null;
  }
}

// ====================
// RESTORE INPUTS
// ====================
function restoreInputsForStep(step) {
  if (step === 1) {
    const cb = document.getElementById("contactsNameFormatCheckbox");
    const sel = document.getElementById("contactsNameFormatSelect");
    if (window.contactMapping.contactName.length === 1) {
      cb.disabled = false;
      cb.checked = window.contactMapping.nameFormat.enabled;
      sel.disabled = !cb.checked;
      sel.value = window.contactMapping.nameFormat.pattern || "";
    } else {
      cb.checked = false;
      cb.disabled = true;
      sel.disabled = true;
      sel.value = "";
    }
  }
}

// ====================
// VALIDATION
// ====================
function validateStep(step) {
  if (step === 1) return window.contactMapping.contactName.length >= 1;
  if (step === 2) return !!window.contactMapping.contactPhone;
  return false;
}

// ====================
// HIGHLIGHTING LOGIC
// ====================
function clearHighlights() {
  document.querySelectorAll(".map-step1-head, .map-step1-body, .map-step2-head, .map-step2-body")
    .forEach(el => el.classList.remove("map-step1-head", "map-step1-body", "map-step2-head", "map-step2-body"));
}

function applyHighlights(originalTable, resultTable, mapping) {
  if (!originalTable || !resultTable) return;
  clearHighlights();

  const stepColors = {
    1: { head: "map-step1-head", body: "map-step1-body", resultCol: "Contact name" },
    2: { head: "map-step2-head", body: "map-step2-body", resultCol: "Contact phone number" },
  };

  Object.keys(stepColors).forEach(step => {
    const { head, body, resultCol } = stepColors[step];
    const stepNum = parseInt(step, 10);

    const shouldHighlightResult =
      stepNum === window.contactsCurrentStep ||
      (stepNum === 1 && mapping.contactName.length > 0) ||
      (stepNum === 2 && mapping.contactPhone);

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

// ====================
// RENDER PREVIEWS
// ====================
export function renderOriginalPreview(csvData) {
  const container = document.getElementById("contactsOriginalPreview");
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

  const resultTable = document.querySelector("#contactsResultPreview table");
  if (window.contactMapping && resultTable) applyHighlights(table, resultTable, window.contactMapping);
}

export function renderResultPreview(csvData, mapping = {}) {
  const container = document.getElementById("contactsResultPreview");
  container.innerHTML = "";
  const table = document.createElement("table");
  table.className = "table table-bordered";
  const headers = ["Contact name", "Contact phone number"];
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
  csvData.previewRows.forEach(row => {
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

      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  container.appendChild(table);

  const originalTable = document.querySelector("#contactsOriginalPreview table");
  if (window.contactMapping && originalTable) applyHighlights(originalTable, table, mapping);
}

// ====================
// UTILITIES
// ====================
export function formatNameFromSingleColumn(raw, pattern) {
  if (!raw) return "";
  const clean = String(raw).replace(/,/g, " ").trim().replace(/\s+/g, " ");
  const parts = clean.split(" ");
  if (parts.length === 1) return clean;
  switch (pattern) {
    case "LAST_FIRST":
      return `${parts.slice(1).join(" ")} ${parts[0]}`.trim();
    case "FIRST_LAST_SECONDLAST":
      return `${parts[0]} ${parts.slice(1).join(" ")}`.trim();
    default:
      return clean;
  }
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

// ====================
// HEADER CLICK
// ====================
function handleHeaderClick(header) {
  if (window.contactsCurrentStep === 1) {
    const selected = window.contactMapping.contactName;
    if (selected.includes(header)) {
      window.contactMapping.contactName = selected.filter(h => h !== header);
    } else {
      if (selected.length >= 2) return;
      window.contactMapping.contactName.push(header);
    }
    renderResultPreview(window.contactsCsvData, window.contactMapping);
    renderOriginalPreview(window.contactsCsvData);
    document.getElementById("contactsNextBtn").disabled = !validateStep(1);
    restoreInputsForStep(1);
  }
  if (window.contactsCurrentStep === 2) {
    window.contactMapping.contactPhone = header;
    renderResultPreview(window.contactsCsvData, window.contactMapping);
    renderOriginalPreview(window.contactsCsvData);
    document.getElementById("contactsNextBtn").disabled = !validateStep(2);
  }
}
