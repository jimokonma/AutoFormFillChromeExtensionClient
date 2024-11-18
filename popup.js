document.addEventListener("DOMContentLoaded", () => {
  const fillFormButton = document.getElementById("fillForm");
  const statusDiv = document.getElementById("status");

  // Show status message with background color based on success or failure
  function showStatus(message, isError = false) {
    statusDiv.textContent = message;
    statusDiv.style.backgroundColor = isError ? "#ffebee" : "#e8f5e9";
    statusDiv.style.display = "block";
    setTimeout(() => (statusDiv.style.display = "none"), 2000);
  }

  // When the fill form button is clicked
  fillFormButton.addEventListener("click", async () => {
    try {
      // Show loading status
      showStatus("Filling form... Please wait...");

      // Get the active tab in the current window
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab) {
        showStatus("No active tab found", true);
        return;
      }

      // First, ensure the content script is injected
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"],
      });

      // Send message to content script to fill forms and handle response with Promise
      const response = await new Promise((resolve) => {
        chrome.tabs.sendMessage(tab.id, { action: "fillForm" }, (response) => {
          if (chrome.runtime.lastError) {
            resolve({ success: false, error: chrome.runtime.lastError });
          } else {
            resolve(response);
          }
        });
      });

      if (response && response.success) {
        console.log("Fields found:", response.fields);
        showStatus(`Filled ${response.fields.length} fields`);
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
