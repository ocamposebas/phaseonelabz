(() => {
  const token = document.querySelector("#phase-control-token");
  const reveal = document.querySelector("[data-reveal-token]");
  const copy = document.querySelector("[data-copy-token]");

  reveal?.addEventListener("click", () => {
    const visible = token.type === "text";
    token.type = visible ? "password" : "text";
    reveal.textContent = visible ? "Show" : "Hide";
  });

  copy?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(token.value);
      copy.textContent = "Copied";
      window.setTimeout(() => { copy.textContent = "Copy"; }, 1600);
    } catch {
      token.type = "text";
      token.select();
    }
  });

  document.querySelectorAll("[data-confirm]").forEach((button) => {
    button.addEventListener("click", (event) => {
      if (!window.confirm(button.dataset.confirm)) event.preventDefault();
    });
  });
})();
