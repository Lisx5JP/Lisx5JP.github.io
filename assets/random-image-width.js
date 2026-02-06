const MIN_PERCENT = 40;
const MAX_PERCENT = 80;
const STEP = 5;

const widthOptions = [];
for (let value = MIN_PERCENT; value <= MAX_PERCENT; value += STEP) {
  widthOptions.push(value);
}

function applyRandomImageWidths(root) {
  const images = root.querySelectorAll("img");
  if (!images.length) {
    return;
  }

  images.forEach((img) => {
    if (img.dataset.randomMaxWidthApplied === "true") {
      return;
    }
    const width = widthOptions[Math.floor(Math.random() * widthOptions.length)];
    img.style.maxWidth = `${width}%`;
    img.dataset.randomMaxWidthApplied = "true";
  });
}

document.addEventListener("DOMContentLoaded", () => {
  applyRandomImageWidths(document);
});

document.addEventListener("md-render", (event) => {
  const target = event.target;
  if (target && target.querySelectorAll) {
    applyRandomImageWidths(target);
  }
});
