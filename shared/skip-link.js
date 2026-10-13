(function () {
  "use strict";

  const skipLink = document.querySelector(".skip-link");
  if (!skipLink) return;

  // Keep native anchor activation ahead of document-level game shortcuts.
  skipLink.addEventListener("keydown", (event) => {
    if (event.key === "Enter") event.stopPropagation();
  });
})();
