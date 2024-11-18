class FormFieldAnalyzer {
  // New method to simulate getting data from the API

  async sendFormDataToAPI(formName, formFields) {
    const data = {
      formName,
      formTemplate: formFields.map((field) => ({
        name: field.name,
        type: field.type,
        value: field.value,
        placeholder: field.placeholder || "",
        options: field.options || null,
        min: field.min || "",
        max: field.max || "",
      })),
    };

    try {
      const response = await fetch(
        "https://autoformfillchromeextensionserver.onrender.com/api/forms/add",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        }
      );
      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Error sending form data:", error);
    }
  }

  async identifyAndFillFields() {
    const fields = document.querySelectorAll("input, select, textarea");
    const fieldInfo = [];

    fields.forEach((field) => {
      const info = this.analyzeField(field);
      if (info) {
        fieldInfo.push(info);
      }
    });

    // Send form data to API and handle the response
    const formName = "contact"; // Adjust form name as needed
    const apiResponse = await this.sendFormDataToAPI(formName, fieldInfo);

    if (apiResponse && apiResponse.success) {
      apiResponse.data.forEach((fieldData) => {
        // Find the corresponding field and populate it with the returned value
        const field = document.querySelector(
          `[name="${fieldData.name}"], [id="${fieldData.name}"]`
        );

        if (field) {
          if (field.tagName.toLowerCase() === "select") {
            this.selectOption(field, fieldData.value);
          } else if (field.type === "radio" || field.type === "checkbox") {
            this.checkRadioOrCheckbox(field, fieldData.value);
          } else {
            field.value = fieldData.value;
            this.triggerInputEvents(field);
          }
        } else {
          console.warn(`Field with name or ID "${fieldData.name}" not found.`);
        }
      });
    }

    // console.log("Form data processed and fields populated:", fieldInfo);
    return fieldInfo;
  }

  analyzeField(field) {
    const name = field.name || field.id;
    if (!name) return null;

    let options = null;
    if (field.tagName.toLowerCase() === "select") {
      options = Array.from(field.options).map((opt) => ({
        value: opt.value,
        text: opt.textContent,
      }));
    }

    return {
      name: name,
      type: this.getFieldType(field),
      value: field.value,
      placeholder: field.placeholder || "",
      options: options,
      min: field.min,
      max: field.max,
    };
  }

  getFieldType(field) {
    if (field.tagName.toLowerCase() === "select") return "select";
    if (field.tagName.toLowerCase() === "textarea") return "textarea";
    return field.type || "text";
  }

  triggerInputEvents(field) {
    const inputEvent = new Event("input", { bubbles: true });
    const changeEvent = new Event("change", { bubbles: true });

    field.dispatchEvent(inputEvent);
    field.dispatchEvent(changeEvent);
  }

  selectOption(field, value) {
    // If it's a select field, choose an option different from the first (empty or placeholder)
    const options = Array.from(field.options);
    const validOptions = options.filter(
      (option) =>
        option.value &&
        option.value.trim() !== "" &&
        option.textContent.trim() !== "Select"
    );

    if (validOptions.length > 0) {
      const selectedOption = validOptions.find(
        (option) => option.value === value
      );
      if (selectedOption) {
        field.value = selectedOption.value;
      } else {
        field.value = validOptions[0].value; // If value not found, select the first valid option
      }
    }

    this.triggerInputEvents(field);
  }

  checkRadioOrCheckbox(field, value) {
    if (field.type === "radio" || field.type === "checkbox") {
      field.checked = value;
      this.triggerInputEvents(field);
    }
  }

  getRandomOptionFromSelect(options) {
    // Filter out empty or placeholder options (often the first option)
    const validOptions = options.filter(
      (option) =>
        option.value &&
        option.value.trim() !== "" &&
        !option.text.toLowerCase().includes("select") &&
        !option.text.toLowerCase().includes("choose")
    );

    if (validOptions.length > 0) {
      const randomIndex = Math.floor(Math.random() * validOptions.length);
      return validOptions[randomIndex].value;
    }
    return "";
  }

  getRandomNumber(min, max) {
    min = Number(min) || 0;
    max = Number(max) || 100;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  getRandomEmail() {
    const domains = ["example.com", "test.com", "domain.com", "email.com"];
    const randomDomain = domains[Math.floor(Math.random() * domains.length)];
    return `user${Math.floor(Math.random() * 1000)}@${randomDomain}`;
  }

  generateRandomPhoneNumber() {
    return `555-${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`;
  }

  generateRandomDate() {
    const start = new Date(1950, 0, 1);
    const end = new Date(2000, 11, 31);
    const randomDate = new Date(
      start.getTime() + Math.random() * (end.getTime() - start.getTime())
    );
    return randomDate.toISOString().split("T")[0];
  }
}

// Initialize the analyzer
const analyzer = new FormFieldAnalyzer();

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "fillForm") {
    analyzer.identifyAndFillFields().then((fields) => {
      sendResponse({ success: true, fields: fields });
    });
  }
  return true;
});
