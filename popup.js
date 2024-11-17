document.addEventListener("DOMContentLoaded", () => {
  const fillFormButton = document.getElementById("fillForm");
  const statusDiv = document.getElementById("status");
  const toggleWrapper = document.getElementById("toggleWrapper");
  const fieldList = document.getElementById("fieldList");

  let isExcludeMode = false;
  let excludedFields = new Set();

  // Create and append toggle switch
  const toggleSwitch = document.createElement("div");
  toggleSwitch.innerHTML = `
    <div class="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 cursor-pointer">
      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition translate-x-1"></span>
    </div>
    <span class="ml-2 text-sm font-medium text-gray-700">Auto-fill all fields</span>
  `;
  toggleWrapper.appendChild(toggleSwitch);

  // Toggle switch functionality
  toggleSwitch.addEventListener("click", async () => {
    isExcludeMode = !isExcludeMode;
    toggleSwitch.querySelector("div").classList.toggle("bg-blue-600");
    toggleSwitch
      .querySelector("span.inline-block")
      .classList.toggle("translate-x-6");
    toggleSwitch.querySelector("span.ml-2").textContent = isExcludeMode
      ? "Select fields to exclude"
      : "Auto-fill all fields";

    if (isExcludeMode) {
      // Get current form fields
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      chrome.tabs.sendMessage(
        tab.id,
        { action: "getFormFields" },
        (response) => {
          if (response && response.fields) {
            displayFieldList(response.fields);
          }
        }
      );
    } else {
      fieldList.innerHTML = "";
      fieldList.classList.add("hidden");
      excludedFields.clear();
    }
  });

  function displayFieldList(fields) {
    fieldList.innerHTML = "";
    fieldList.classList.remove("hidden");

    fields.forEach((field) => {
      const fieldItem = document.createElement("div");
      fieldItem.className = "field-item";
      fieldItem.innerHTML = `
        <input type="checkbox" 
               id="${field.name}" 
               class="field-checkbox"
               ${!excludedFields.has(field.name) ? "checked" : ""}>
        <label for="${field.name}">${field.name}</label>
      `;

      const checkbox = fieldItem.querySelector("input");
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) {
          excludedFields.delete(field.name);
        } else {
          excludedFields.add(field.name);
        }
      });

      fieldList.appendChild(fieldItem);
    });
  }

  function showStatus(message, isError = false) {
    statusDiv.textContent = message;
    statusDiv.style.backgroundColor = isError ? "#ffebee" : "#e8f5e9";
    statusDiv.style.display = "block";
    setTimeout(() => (statusDiv.style.display = "none"), 2000);
  }

  fillFormButton.addEventListener("click", async () => {
    try {
      showStatus("Filling form... Please wait...");

      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab) {
        showStatus("No active tab found", true);
        return;
      }

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"],
      });

      const response = await new Promise((resolve) => {
        chrome.tabs.sendMessage(
          tab.id,
          {
            action: "fillForm",
            excludedFields: Array.from(excludedFields),
          },
          (response) => {
            if (chrome.runtime.lastError) {
              resolve({ success: false, error: chrome.runtime.lastError });
            } else {
              resolve(response);
            }
          }
        );
      });

      if (response && response.success) {
        const filledCount = response.fields.length - excludedFields.size;
        showStatus(`Filled ${filledCount} fields`);
      } else {
        const errorMessage = response.error
          ? response.error.message
          : "Failed to fill forms";
        showStatus(errorMessage, true);
      }
    } catch (error) {
      console.error("Error:", error);
      showStatus("Error: " + error.message, true);
    }
  });
});
