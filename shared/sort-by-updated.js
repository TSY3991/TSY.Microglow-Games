document.querySelectorAll("[data-sort-by-updated]").forEach((grid) => {
  const cards = Array.from(grid.children).map((card, index) => {
    const parsedDate = Date.parse(card.dataset.updatedAt || "");
    return {
      card,
      index,
      updatedAt: Number.isNaN(parsedDate) ? 0 : parsedDate,
      sortLast: card.dataset.sortLast === "true"
    };
  });

  cards
    .sort((a, b) => {
      if (a.sortLast !== b.sortLast) return a.sortLast ? 1 : -1;
      return b.updatedAt - a.updatedAt || a.index - b.index;
    })
    .forEach(({ card }) => grid.append(card));
});
