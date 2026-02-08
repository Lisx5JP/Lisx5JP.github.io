(() => {
  const modal = document.createElement("div");
  modal.setAttribute("aria-hidden", "true");
  modal.style.position = "fixed";
  modal.style.inset = "0";
  modal.style.zIndex = "9999";
  modal.style.display = "none";
  modal.style.alignItems = "center";
  modal.style.justifyContent = "center";
  modal.style.background = "rgba(0, 0, 0, 0.85)";
  modal.style.padding = "2rem";
  modal.style.boxSizing = "border-box";

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.setAttribute("aria-label", "Close image");
  closeButton.textContent = "X";
  closeButton.style.position = "absolute";
  closeButton.style.top = "0.75rem";
  closeButton.style.right = "0.75rem";
  closeButton.style.width = "1.75rem";
  closeButton.style.height = "1.75rem";
  closeButton.style.border = "0";
  closeButton.style.borderRadius = "999px";
  closeButton.style.cursor = "pointer";
  closeButton.style.fontSize = "1rem";
  closeButton.style.lineHeight = "1";
  closeButton.style.background = "rgba(255, 255, 255, 0.95)";
  closeButton.style.color = "#111";

  const modalImage = document.createElement("img");
  modalImage.alt = "";
  modalImage.style.maxWidth = "95vw";
  modalImage.style.maxHeight = "95vh";
  modalImage.style.width = "auto";
  modalImage.style.height = "auto";
  modalImage.style.objectFit = "contain";
  modalImage.style.boxShadow = "0 0.5rem 2rem rgba(0, 0, 0, 0.4)";

  modal.appendChild(closeButton);
  modal.appendChild(modalImage);

  function openModal(sourceImage) {
    modalImage.src = sourceImage.currentSrc || sourceImage.src;
    modalImage.alt = sourceImage.alt || "";
    modal.style.display = "flex";
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    modal.style.display = "none";
    modal.setAttribute("aria-hidden", "true");
    modalImage.removeAttribute("src");
    document.body.style.overflow = "";
  }

  function mountModal() {
    if (!document.body.contains(modal)) {
      document.body.appendChild(modal);
    }
  }

  function applyImageCursor(root) {
    const images = root.querySelectorAll("img");
    images.forEach((img) => {
      img.style.cursor = "pointer";
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      mountModal();
      applyImageCursor(document);
    });
  } else {
    mountModal();
    applyImageCursor(document);
  }

  document.addEventListener("md-render", (event) => {
    const target = event.target;
    if (target && target.querySelectorAll) {
      applyImageCursor(target);
    }
  });

  document.addEventListener("click", (event) => {
    mountModal();
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    if (target === closeButton || target === modal) {
      closeModal();
      return;
    }

    const image = target.closest("img");
    if (!image) {
      return;
    }

    event.preventDefault();
    openModal(image);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal.style.display === "flex") {
      closeModal();
    }
  });
})();
