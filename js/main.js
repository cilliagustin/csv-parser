console.log("main.js loaded 🧭");

import * as MappingApp from "./mapping/app.js";
import * as ContactsApp from "./contacts/app.js";

document.getElementById("csvUpload").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  Papa.parse(file, {
    header: true,
    skipEmptyLines: false,
    complete: function (results) {
      results.data = results.data.map((row, i) => ({ __rowIndex: i + 2, ...row }));

      window.csvData = {
        headers: results.meta.fields,
        rows: results.data,
        previewRows: results.data.slice(0, 5),
        originalName: file.name.replace(/\.csv$/i, ""),
      };

      console.log("✅ CSV parsed:", results.data.length, "rows");
      document.getElementById("mapConversationsBtn").disabled = false;
      document.getElementById("mapContactsBtn").disabled = false;
    },
  });
});

document.getElementById("mapConversationsBtn").addEventListener("click", () => {
  MappingApp.startMappingFlow(window.csvData);
});

document.getElementById("mapContactsBtn").addEventListener("click", () => {
  ContactsApp.startContactsFlow(window.csvData);
});
