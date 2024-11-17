class APIHandler {
  constructor() {
    // Load API endpoint from storage
    this.loadConfig();
  }

  async loadConfig() {
    const result = await chrome.storage.local.get(["apiEndpoint"]);
    this.apiEndpoint =
      result.apiEndpoint || " http://localhost:3030/api/forms/add"; // Default endpoint
    console.log("Loaded API Endpoint:", this.apiEndpoint); // Log the loaded endpoint
  }

  async saveConfig(endpoint) {
    await chrome.storage.local.set({ apiEndpoint: endpoint });
    this.apiEndpoint = endpoint;
    console.log("Saved API Endpoint:", this.apiEndpoint); // Log the saved endpoint
  }

  async getFormData(fields) {
    try {
      console.log("Sending API request with fields:", fields); // Log the fields sent to the API
      const response = await fetch(this.apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fields }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("API request failed:", error);
      throw error;
    }
  }
}

const apiHandler = new APIHandler();

// Listen for messages from popup and content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "setApiEndpoint") {
    apiHandler
      .saveConfig(request.endpoint)
      .then(() => sendResponse({ success: true }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true; // Keep the message channel open for async response
  }

  if (request.action === "processForm") {
    apiHandler
      .getFormData(request.fields)
      .then((data) => {
        chrome.tabs.sendMessage(sender.tab.id, {
          action: "fillForm",
          data: data,
        });
        sendResponse({ success: true });
      })
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }
});