(function () {
  "use strict";

  const config = window.PhaseOneOrderCoas;
  if (!config) return;

  const state = { order: null };
  const searchForm = document.querySelector("#poco-search-form");
  const searchInput = document.querySelector("#poco-search");
  const searchStatus = document.querySelector("#poco-search-status");
  const results = document.querySelector("#poco-results");
  const workspace = document.querySelector("#poco-workspace");
  const orderNode = document.querySelector("#poco-order");
  const saveStatus = document.querySelector("#poco-save-status");

  function text(tag, value, className) {
    const node = document.createElement(tag);
    node.textContent = value;
    if (className) node.className = className;
    return node;
  }

  function setStatus(node, message, tone = "") {
    node.textContent = message || "";
    node.dataset.tone = tone;
  }

  async function api(path, options = {}) {
    const headers = new Headers(options.headers || {});
    headers.set("X-WP-Nonce", config.nonce);
    if (options.body) headers.set("Content-Type", "application/json");

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

  function formatDate(value) {
    if (!value) return "Date unavailable";
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? value
      : new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }).format(date);
  }

  function candidateLabel(candidate) {
    return [
      candidate.current_shipping_lot ? "Suggested current lot" : "Previous lot",
      candidate.lot ? `Lot ${candidate.lot}` : "Lot unavailable",
      candidate.testing_date ? formatDate(candidate.testing_date) : "",
      candidate.laboratory || "",
    ]
      .filter(Boolean)
      .join(" · ");
  }

  function renderResults(orders) {
    results.replaceChildren();
    if (!orders.length) {
      results.append(text("p", "No matching order was found.", "poco-empty"));
      return;
    }

    orders.forEach((order) => {
      const button = text("button", "", "poco-result");
      button.type = "button";
      const top = document.createElement("span");
      top.className = "poco-result-top";
      top.append(text("strong", `Order #${order.number}`));
      top.append(text("span", order.status.replaceAll("-", " "), "poco-pill"));
      button.append(top);
      button.append(text("span", order.customer || "Guest customer", "poco-result-name"));
      button.append(
        text(
          "small",
          `${order.email || "No email"} · ${order.items.length} line item${
            order.items.length === 1 ? "" : "s"
          }`
        )
      );
      button.addEventListener("click", () => selectOrder(order));
      results.append(button);
    });
  }

  function assignmentRow(item, assignment) {
    const row = document.createElement("div");
    row.className = "poco-assignment";
    const details = document.createElement("div");
    details.append(text("strong", assignment.lot ? `Lot ${assignment.lot}` : "Assigned COA"));
    const sourceLabel =
      assignment.source === "purchase_snapshot"
        ? "Captured at purchase"
        : assignment.source === "historical_backfill"
          ? "Historical snapshot"
          : "Fulfillment confirmed";
    details.append(
      text(
        "small",
        `Quantity ${assignment.quantity} · ${sourceLabel} ${formatDate(assignment.assigned_at)}`,
      ),
    );
    row.append(details);

    const remove = text("button", "Remove", "poco-remove");
    remove.type = "button";
    remove.addEventListener("click", async () => {
      if (!window.confirm(`Remove lot ${assignment.lot || "assignment"} from this order item?`)) return;
      remove.disabled = true;
      setStatus(saveStatus, "Removing assignment…", "working");
      try {
        state.order = await api(
          `/orders/${state.order.id}/items/${item.id}/assignments/${encodeURIComponent(
            assignment.assignment_id
          )}`,
          { method: "DELETE" }
        );
        renderOrder();
        setStatus(saveStatus, "COA assignment removed.", "success");
      } catch (error) {
        remove.disabled = false;
        setStatus(saveStatus, error.message, "error");
      }
    });
    row.append(remove);
    return row;
  }

  function assignmentForm(item) {
    const form = document.createElement("form");
    form.className = "poco-assignment-form";

    const selectLabel = text("label", "Certificate / lot", "poco-field");
    const select = document.createElement("select");
    select.required = true;
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Choose the lot physically packed";
    select.append(placeholder);

    item.candidates.forEach((candidate) => {
      const option = document.createElement("option");
      option.value = candidate.id;
      option.textContent = candidateLabel(candidate);
      select.append(option);
    });

    const suggested = item.candidates.find((candidate) => candidate.current_shipping_lot);
    if (suggested) select.value = suggested.id;
    selectLabel.append(select);

    const assignedQuantity = item.assignments.reduce(
      (total, assignment) => total + Number(assignment.quantity || 0),
      0
    );
    const availableQuantity = Math.max(Number(item.remaining_quantity || 0) - assignedQuantity, 0);
    const quantityLabel = text("label", "Quantity from this lot", "poco-field");
    const quantity = document.createElement("input");
    quantity.type = "number";
    quantity.min = "1";
    quantity.max = String(availableQuantity);
    quantity.step = "1";
    quantity.value = availableQuantity > 0 ? String(availableQuantity) : "0";
    quantity.required = true;
    quantityLabel.append(quantity);

    const confirm = document.createElement("label");
    confirm.className = "poco-confirm";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.required = true;
    confirm.append(checkbox);
    confirm.append(
      document.createTextNode(
        " I checked the physical vial/package and confirm this is the lot being packed."
      )
    );

    const submit = text("button", "Confirm lot assignment", "poco-assign");
    submit.type = "submit";
    submit.disabled = availableQuantity <= 0 || item.candidates.length === 0;

    form.append(selectLabel, quantityLabel, confirm, submit);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!checkbox.checked) {
        setStatus(saveStatus, "Confirm the physical lot before saving.", "error");
        return;
      }
      submit.disabled = true;
      setStatus(saveStatus, "Saving confirmed lot…", "working");
      try {
        state.order = await api(`/orders/${state.order.id}/items/${item.id}/assign`, {
          method: "POST",
          body: JSON.stringify({
            coa_id: select.value,
            quantity: Number(quantity.value),
            confirmed: true,
          }),
        });
        renderOrder();
        setStatus(saveStatus, "Lot saved to the WooCommerce order item.", "success");
      } catch (error) {
        submit.disabled = false;
        setStatus(saveStatus, error.message, "error");
      }
    });
    return form;
  }

  function renderOrder() {
    const order = state.order;
    if (!order) return;
    orderNode.replaceChildren();

    const header = document.createElement("header");
    header.className = "poco-order-header";
    const copy = document.createElement("div");
    copy.append(text("span", "SELECTED ORDER", "poco-kicker"));
    copy.append(text("h2", `Order #${order.number}`));
    copy.append(text("p", `${order.customer || "Guest customer"} · ${formatDate(order.date)}`));
    header.append(copy);
    header.append(text("span", order.status.replaceAll("-", " "), "poco-pill poco-pill-large"));
    orderNode.append(header);

    const list = document.createElement("div");
    list.className = "poco-items";
    order.items.forEach((item) => {
      const card = document.createElement("article");
      card.className = "poco-item";
      const title = document.createElement("div");
      title.className = "poco-item-title";
      const name = document.createElement("div");
      name.append(text("h3", item.name));
      name.append(
        text(
          "p",
          `${item.sku ? `SKU ${item.sku} · ` : ""}${item.remaining_quantity} unrefunded unit${
            Number(item.remaining_quantity) === 1 ? "" : "s"
          }`
        )
      );
      title.append(name);
      title.append(
        text(
          "span",
          `${item.assignments.length} lot${item.assignments.length === 1 ? "" : "s"} assigned`,
          "poco-count"
        )
      );
      card.append(title);

      if (item.assignments.length) {
        const assignments = document.createElement("div");
        assignments.className = "poco-assignments";
        item.assignments.forEach((assignment) =>
          assignments.append(assignmentRow(item, assignment))
        );
        card.append(assignments);
      }

      if (!item.candidates.length) {
        card.append(
          text(
            "p",
            "No COA Manager record is associated with this product or variation.",
            "poco-warning"
          )
        );
      } else {
        card.append(assignmentForm(item));
      }
      list.append(card);
    });
    orderNode.append(list);
  }

  function selectOrder(order) {
    state.order = order;
    renderOrder();
    setStatus(saveStatus, "");
    workspace.hidden = false;
    workspace.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  searchForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const query = searchInput.value.trim();
    if (!query) return;
    results.replaceChildren();
    setStatus(searchStatus, "Searching WooCommerce orders…", "working");
    try {
      const orders = await api(`/orders?search=${encodeURIComponent(query)}`);
      renderResults(orders);
      setStatus(
        searchStatus,
        `${orders.length} matching order${orders.length === 1 ? "" : "s"}.`,
        "success"
      );
      if (orders.length === 1) selectOrder(orders[0]);
    } catch (error) {
      setStatus(searchStatus, error.message, "error");
    }
  });
})();
