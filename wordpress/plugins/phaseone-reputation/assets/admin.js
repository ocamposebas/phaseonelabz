(() => {
  const list = document.querySelector("[data-source-list]");
  const template = document.querySelector("#por-source-template");
  const addButton = document.querySelector("[data-add-source]");
  if (!list || !template || !addButton) return;

  addButton.addEventListener("click", () => {
    const index = Number(list.dataset.nextIndex || list.children.length);
    const html = template.innerHTML.replaceAll("__INDEX__", String(index));
    list.insertAdjacentHTML("beforeend", html);
    list.dataset.nextIndex = String(index + 1);
  });

  list.addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove-source]");
    if (!button) return;
    button.closest("[data-source-row]")?.remove();
  });
})();

