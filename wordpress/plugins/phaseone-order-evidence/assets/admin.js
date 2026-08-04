(function () {
  "use strict";

  const config = window.PhaseOneEvidence;
  if (!config) return;

  const state = { order: null, files: [] };
  const searchForm = document.querySelector("#poe-search-form");
  const searchInput = document.querySelector("#poe-search");
  const searchStatus = document.querySelector("#poe-search-status");
  const results = document.querySelector("#poe-results");
  const workspace = document.querySelector("#poe-workspace");
  const orderSummary = document.querySelector("#poe-order-summary");
  const cameraInput = document.querySelector("#poe-camera-input");
  const preview = document.querySelector("#poe-preview");
  const uploadButton = document.querySelector("#poe-upload");
  const uploadStatus = document.querySelector("#poe-upload-status");
  const evidenceGallery = document.querySelector("#poe-gallery");
  const evidenceCount = document.querySelector("#poe-evidence-count");
  const labelInput = document.querySelector("#poe-label");
  const customerVisible = document.querySelector("#poe-customer-visible");

  function setStatus(node, message, tone) {
    node.textContent = message || "";
    node.dataset.tone = tone || "";
  }

  async function api(path, options = {}) {
    const headers = new Headers(options.headers || {});
    headers.set("X-WP-Nonce", config.nonce);
    if (!(options.body instanceof FormData)) headers.set("Content-Type", "application/json");

    const response = await fetch(`${config.restRoot}${path}`, {
      credentials: "same-origin",
      ...options,
      headers,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || "The request could not be completed.");
    }
    return data;
  }

  function text(tag, value, className) {
    const element = document.createElement(tag);
    element.textContent = value;
    if (className) element.className = className;
    return element;
  }

  function selectOrder(order) {
    state.order = order;
    state.files = [];
    cameraInput.value = "";
    renderPreview();
    renderOrder();
    workspace.hidden = false;
    workspace.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderSearchResults(orders) {
    results.replaceChildren();
    if (!orders.length) {
      results.append(text("p", "No matching order was found.", "poe-empty"));
      return;
    }

    orders.forEach((order) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "poe-result-card";

      const top = document.createElement("span");
      top.className = "poe-result-top";
      top.append(text("strong", `Order #${order.number}`));
      top.append(text("span", order.status.replaceAll("-", " "), "poe-order-status"));
      button.append(top);
      button.append(text("span", order.customer || "Guest customer", "poe-result-name"));
      button.append(text("small", `${order.email || "No email"} · ${order.evidence.length} evidence photo${order.evidence.length === 1 ? "" : "s"}`));
      button.addEventListener("click", () => selectOrder(order));
      results.append(button);
    });
  }

  function renderOrder() {
    const order = state.order;
    if (!order) return;

    orderSummary.replaceChildren();
    const heading = document.createElement("div");
    heading.className = "poe-order-heading";
    const copy = document.createElement("div");
    copy.append(text("span", "SELECTED ORDER", "poe-kicker"));
    copy.append(text("h2", `Order #${order.number}`));
    copy.append(text("p", `${order.customer || "Guest customer"} · ${order.email || "No email"}`));
    heading.append(copy);
    heading.append(text("span", order.status.replaceAll("-", " "), "poe-order-status poe-order-status-large"));
    orderSummary.append(heading);

    const itemList = document.createElement("div");
    itemList.className = "poe-items";
    order.items.forEach((item) => {
      const row = document.createElement("span");
      row.append(text("strong", `${item.quantity}×`));
      row.append(document.createTextNode(` ${item.name}`));
      itemList.append(row);
    });
    orderSummary.append(itemList);
    renderGallery();
  }

  function imageUrl(evidence) {
    return `${config.restRoot}/${state.order.id}/${encodeURIComponent(evidence.id)}?_wpnonce=${encodeURIComponent(config.nonce)}`;
  }

  function renderGallery() {
    const evidence = state.order?.evidence || [];
    evidenceGallery.replaceChildren();
    evidenceCount.textContent = `${evidence.length} photo${evidence.length === 1 ? "" : "s"}`;

    if (!evidence.length) {
      evidenceGallery.append(text("p", "No evidence has been captured for this order yet.", "poe-empty poe-gallery-empty"));
      return;
    }

    evidence.forEach((record) => {
      const card = document.createElement("article");
      card.className = "poe-evidence-card";
      const image = document.createElement("img");
      image.src = imageUrl(record);
      image.alt = record.label;
      image.loading = "lazy";
      card.append(image);

      const body = document.createElement("div");
      body.className = "poe-evidence-body";
      body.append(text("strong", record.label));
      const captured = record.captured_at ? new Date(record.captured_at).toLocaleString() : "Captured";
      body.append(text("small", `${captured} · ${record.customer_visible ? "Customer visible" : "Staff only"}`));
      const remove = text("button", "Remove", "poe-remove");
      remove.type = "button";
      remove.addEventListener("click", () => removeEvidence(record));
      body.append(remove);
      card.append(body);
      evidenceGallery.append(card);
    });
  }

  function renderPreview() {
    preview.replaceChildren();
    state.files.forEach((file, index) => {
      const card = document.createElement("div");
      card.className = "poe-preview-card";
      const image = document.createElement("img");
      const objectUrl = URL.createObjectURL(file);
      image.src = objectUrl;
      image.alt = `Ready to upload ${index + 1}`;
      image.onload = () => URL.revokeObjectURL(objectUrl);
      card.append(image);
      const remove = text("button", "×", "poe-preview-remove");
      remove.type = "button";
      remove.setAttribute("aria-label", `Remove photo ${index + 1}`);
      remove.addEventListener("click", () => {
        state.files.splice(index, 1);
        renderPreview();
      });
      card.append(remove);
      preview.append(card);
    });
    uploadButton.disabled = !state.files.length || !state.order;
    uploadButton.textContent = state.files.length
      ? `Securely upload ${state.files.length} photo${state.files.length === 1 ? "" : "s"}`
      : "Securely upload evidence";
  }

  async function removeEvidence(record) {
    if (!window.confirm(`Remove “${record.label}” from this order? This cannot be undone.`)) return;
    setStatus(uploadStatus, "Removing encrypted evidence…", "working");
    try {
      state.order = await api(`/orders/${state.order.id}/${record.id}`, { method: "DELETE" });
      renderOrder();
      setStatus(uploadStatus, "Evidence removed.", "success");
    } catch (error) {
      setStatus(uploadStatus, error.message, "error");
    }
  }

  searchForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const query = searchInput.value.trim();
    if (!query) return;
    results.replaceChildren();
    setStatus(searchStatus, "Searching secure order records…", "working");
    try {
      const orders = await api(`/orders?search=${encodeURIComponent(query)}`);
      renderSearchResults(orders);
      setStatus(searchStatus, `${orders.length} matching order${orders.length === 1 ? "" : "s"}.`, "success");
      if (orders.length === 1) selectOrder(orders[0]);
    } catch (error) {
      setStatus(searchStatus, error.message, "error");
    }
  });

  cameraInput.addEventListener("change", () => {
    const files = Array.from(cameraInput.files || []).filter((file) => file.type.startsWith("image/"));
    state.files.push(...files);
    renderPreview();
    setStatus(uploadStatus, files.length ? `${files.length} photo${files.length === 1 ? "" : "s"} ready.` : "", "");
  });

  uploadButton.addEventListener("click", async () => {
    if (!state.order || !state.files.length) return;
    uploadButton.disabled = true;
    const files = [...state.files];
    try {
      for (let index = 0; index < files.length; index += 1) {
        setStatus(uploadStatus, `Encrypting and uploading photo ${index + 1} of ${files.length}…`, "working");
        const form = new FormData();
        form.append("photo", files[index], files[index].name || `camera-${index + 1}.jpg`);
        form.append("label", labelInput.value);
        form.append("customer_visible", customerVisible.checked ? "true" : "false");
        state.order = await api(`/orders/${state.order.id}/upload`, { method: "POST", body: form });
      }
      state.files = [];
      cameraInput.value = "";
      renderPreview();
      renderOrder();
      setStatus(uploadStatus, "Evidence secured. The order gallery is now up to date.", "success");
    } catch (error) {
      setStatus(uploadStatus, error.message, "error");
      uploadButton.disabled = false;
    }
  });
})();

