document.addEventListener("DOMContentLoaded", () => {
  // ===== DEMO DATA =====
  const ROOM_IMAGES = {
    r1: "image/room1.jpg",
    r2: "image/room2.jpg",
    r3: "image/room3.jpg",
  };

  const RESULTS = {
    r1: { s1: "image/r1_s1.png", s2: "image/r1_s2.png", s3: "image/r1_s3.png" },
    r2: { s1: "image/r2_s1.png", s2: "image/r2_s2.png", s3: "image/r2_s3.png" },
    r3: { s1: "image/r3_s1.png", s2: "image/r3_s2.png", s3: "image/r3_s3.png" },
  };

  // ===== ЭЛЕМЕНТЫ =====
  const roomSelector = document.getElementById("roomSelector");
  const sofaSelector = document.getElementById("sofaSelector");
  const generateBtn = document.getElementById("generateBtn");

  const aiOutput = document.getElementById("aiOutput");
  const aiResultImg = document.getElementById("aiResultImg");

  const betaCanvas = document.getElementById("betaCanvas");
  const bctx = betaCanvas?.getContext("2d");

  const tryOtherBtn = document.getElementById("tryOtherBtn");
  const changeRoomBtn = document.getElementById("changeRoomBtn");
  const changeSofaBtn = document.getElementById("changeSofaBtn");
  const compareBtn = document.getElementById("compareBtn");

  const demoStatus = document.getElementById("demoStatus");
  const loadingBox = document.getElementById("loadingBox");
  const loadingTitle = document.getElementById("loadingTitle");
  const loadingStep = document.getElementById("loadingStep");

  // Upload custom room (beta)
  const customRoomInput = document.getElementById("customRoomInput");
  const customRoomPickBtn = document.getElementById("customRoomPickBtn");
  const customRoomPreview = document.getElementById("customRoomPreview");

  // Product info
  const productInfo = document.getElementById("productInfo");
  const productNameEl = document.getElementById("productName");
  const productSizeEl = document.getElementById("productSize");
  const productLinkEl = document.getElementById("productLink");

  // ===== МОДАЛКА =====
  const modal = document.getElementById("imageModal");
  const modalImage = document.getElementById("modalImage");
  const closeBtn = document.querySelector(".modal-close");

  // ===== СОСТОЯНИЕ =====
  let selectedRoom = null; // r1/r2/r3/custom
  let selectedSofa = null; // s1/s2/s3
  let selectedSofaCanvasSrc = "";

  let customRoomURL = ""; // objectURL загруженного фото
  let selectedProduct = { name: "", size: "", url: "" };

  // compare (только для demo)
  let lastRoomSrc = "";
  let lastResultSrc = "";
  let showingBefore = false;

  // canvas state (custom)
  let roomImgObj = null;
  let sofaImgObj = null;
  let sofaScale = 0.6;

  let sofaX = 0;
  let sofaY = 0;
  let dragging = false;
  let startX = 0;
  let startY = 0;

  const SOFA_PNG = {
    s1: "image/sofa1.jpg",
    s2: "image/sofa2.jpg",
    s3: "image/sofa3.jpg",
  };

  // ===== ВСПОМОГАТЕЛЬНЫЕ =====
  function sleep(ms) {
    return new Promise((res) => setTimeout(res, ms));
  }

  function setActive(container, btn) {
    container.querySelectorAll(".select-btn").forEach((b) => b.classList.remove("is-active"));
    btn.classList.add("is-active");
  }

  function updateGenerateButton() {
    const ready = !!(selectedRoom && selectedSofa);
    generateBtn.disabled = !ready;
    generateBtn.textContent = ready ? "Показати, як це буде виглядати" : "Оберіть кімнату та диван";
  }

  function hideResultOnly() {
    aiOutput?.classList.add("hidden");
    loadingBox?.classList.add("hidden");
    demoStatus.textContent = "";

    // demo img
    if (aiResultImg) {
      aiResultImg.src = "";
      aiResultImg.classList.remove("hidden");
    }

    // canvas
    if (betaCanvas) {
      betaCanvas.classList.add("hidden");
      if (bctx) bctx.clearRect(0, 0, betaCanvas.width, betaCanvas.height);
    }

    // reset compare
    showingBefore = false;
    lastRoomSrc = "";
    lastResultSrc = "";
    if (compareBtn) {
      compareBtn.disabled = true;
      compareBtn.textContent = "Порівняти: до";
    }

    // reset canvas drag
    sofaX = 0;
    sofaY = 0;
    dragging = false;
  }

  function clearRoomSelectionOnly() {
    selectedRoom = null;
    roomSelector?.querySelectorAll(".select-btn").forEach((b) => b.classList.remove("is-active"));
  }

  function clearSofaSelectionOnly() {
    selectedSofa = null;
    sofaSelector?.querySelectorAll(".select-btn").forEach((b) => b.classList.remove("is-active"));
  }

  // ===== Canvas helpers =====
  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  function fitCanvasToRoom(roomImg) {
    if (!betaCanvas) return;
    const w = betaCanvas.clientWidth || 800;
    const aspect = roomImg.height / roomImg.width;
    betaCanvas.width = w;
    betaCanvas.height = Math.round(w * aspect);
  }

  function drawCanvas() {
    if (!bctx || !betaCanvas || !roomImgObj) return;

    bctx.clearRect(0, 0, betaCanvas.width, betaCanvas.height);
    bctx.drawImage(roomImgObj, 0, 0, betaCanvas.width, betaCanvas.height);

    if (!sofaImgObj) return;

    const w = sofaImgObj.width * sofaScale;
    const h = sofaImgObj.height * sofaScale;

    const x = betaCanvas.width * 0.5 + sofaX - w / 2;
    const y = betaCanvas.height * 0.7 + sofaY - h / 2;

    bctx.drawImage(sofaImgObj, x, y, w, h);
  }

  // ===== Canvas interactions (custom only) =====
  betaCanvas?.addEventListener("pointerdown", (e) => {
    if (selectedRoom !== "custom") return;
    if (!sofaImgObj || !roomImgObj) return;

    dragging = true;
    betaCanvas.setPointerCapture(e.pointerId);
    startX = e.clientX - sofaX;
    startY = e.clientY - sofaY;
  });

  betaCanvas?.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    sofaX = e.clientX - startX;
    sofaY = e.clientY - startY;
    drawCanvas();
  });

  betaCanvas?.addEventListener("pointerup", () => {
    dragging = false;
  });

  betaCanvas?.addEventListener("pointercancel", () => {
    dragging = false;
  });

  betaCanvas?.addEventListener(
    "wheel",
    (e) => {
      if (selectedRoom !== "custom") return;
      if (!sofaImgObj || !roomImgObj) return;

      e.preventDefault();
      const delta = Math.sign(e.deltaY);
      sofaScale *= delta > 0 ? 0.95 : 1.05;
      sofaScale = Math.max(0.15, Math.min(1.5, sofaScale));
      drawCanvas();
    },
    { passive: false }
  );

  // ===== Upload custom room =====
  customRoomPickBtn?.addEventListener("click", () => customRoomInput?.click());

  customRoomInput?.addEventListener("change", () => {
    const file = customRoomInput.files?.[0];
    if (!file) return;

    if (customRoomURL) URL.revokeObjectURL(customRoomURL);
    customRoomURL = URL.createObjectURL(file);

    if (customRoomPreview) customRoomPreview.src = customRoomURL;

    hideResultOnly();
  });

  // ===== Выбор комнаты =====
  roomSelector?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-room]");
    if (!btn) return;

    selectedRoom = btn.dataset.room; // r1/r2/r3/custom
    setActive(roomSelector, btn);

    hideResultOnly();
    updateGenerateButton();
  });

  // ===== Выбор дивана =====
  sofaSelector?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-sofa]");
    if (!btn) return;

    selectedSofa = btn.dataset.sofa; // s1/s2/s3
    selectedSofaCanvasSrc = btn.dataset.canvas || "";

    selectedProduct = {
      name: btn.dataset.name || "Sofa Model",
      size: btn.dataset.size || "",
      url: btn.dataset.url || "#",
    };

    setActive(sofaSelector, btn);

    hideResultOnly();
    updateGenerateButton();
  });

  // ===== Генерация: demo + custom canvas =====
  generateBtn?.addEventListener("click", async () => {
    if (!selectedRoom || !selectedSofa) return;

    const isCustom = selectedRoom === "custom";
    if (isCustom && !customRoomURL) {
      demoStatus.textContent = "Спочатку завантажте фото своєї кімнати.";
      return;
    }

    generateBtn.disabled = true;
    const oldText = generateBtn.textContent;
    generateBtn.textContent = "Обробляємо…";

    aiOutput.classList.add("hidden");
    loadingBox.classList.remove("hidden");
    demoStatus.textContent = "AI працює над візуалізацією…";
    loadingTitle.textContent = "AI обробляє зображення…";

    const steps = [
      "Аналіз кімнати…",
      "Оцінка освітлення…",
      "Підбір масштабу дивану…",
      "Фінальна корекція…",
    ];
    for (const step of steps) {
      loadingStep.textContent = step;
      await sleep(450);
    }

    loadingBox.classList.add("hidden");
    demoStatus.textContent = "Готово ✅";

    // product info
    if (productInfo && productNameEl && productSizeEl && productLinkEl) {
      productNameEl.textContent = selectedProduct.name || "";
      productSizeEl.textContent = selectedProduct.size || "";
      productLinkEl.href = selectedProduct.url || "#";
      productInfo.hidden = false;
    }

    try {
      if (isCustom) {
        // ===== CUSTOM: CANVAS =====
        // hide demo img, show canvas
        aiResultImg.classList.add("hidden");
        betaCanvas.classList.remove("hidden");

        roomImgObj = await loadImage(customRoomURL);
        const sofaSrc = selectedSofaCanvasSrc;
if (!sofaSrc) {
  demoStatus.textContent = "Не вказано PNG для canvas (data-canvas).";
  sofaImgObj = null;
} else {
  sofaImgObj = await loadImage(sofaSrc);
}

        // reset placement
        sofaX = 0;
        sofaY = 0;
        sofaScale = 0.6;
        dragging = false;

        fitCanvasToRoom(roomImgObj);
        drawCanvas();

        // disable compare for custom (на этом этапе)
        if (compareBtn) {
          compareBtn.disabled = true;
          compareBtn.textContent = "Порівняти: до";
        }

        // clear demo compare state
        lastRoomSrc = "";
        lastResultSrc = "";
        showingBefore = false;
      } else {
        // ===== DEMO: RESULTS =====
        betaCanvas.classList.add("hidden");
        aiResultImg.classList.remove("hidden");

        const src = RESULTS[selectedRoom]?.[selectedSofa];
        if (!src) {
          demoStatus.textContent = "Немає готового результату для цього вибору.";
          generateBtn.disabled = false;
          generateBtn.textContent = oldText;
          return;
        }

        aiResultImg.src = src;

        // compare demo
        lastRoomSrc = ROOM_IMAGES[selectedRoom] || "";
        lastResultSrc = src;
        showingBefore = false;

        if (compareBtn && lastRoomSrc && lastResultSrc) {
          compareBtn.disabled = false;
          compareBtn.textContent = "Порівняти: до";
        } else if (compareBtn) {
          compareBtn.disabled = true;
          compareBtn.textContent = "Порівняти: до";
        }
      }
    } catch (err) {
      demoStatus.textContent = "Помилка завантаження зображень.";
      console.error(err);
    }

    aiOutput.classList.remove("hidden");
    aiOutput.scrollIntoView({ behavior: "smooth" });

    generateBtn.disabled = false;
    generateBtn.textContent = oldText;
  });

  // ===== Частичные переключатели =====
  changeRoomBtn?.addEventListener("click", () => {
    hideResultOnly();
    clearRoomSelectionOnly();
    updateGenerateButton();
    roomSelector?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  changeSofaBtn?.addEventListener("click", () => {
    hideResultOnly();
    clearSofaSelectionOnly();
    updateGenerateButton();
    sofaSelector?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  // ===== Compare (только demo) =====
  compareBtn?.addEventListener("click", () => {
    // в custom compare отключен — тут не трогаем canvas
    if (!lastRoomSrc || !lastResultSrc) return;

    showingBefore = !showingBefore;

    betaCanvas?.classList.add("hidden");
    aiResultImg.classList.remove("hidden");

    if (showingBefore) {
      aiResultImg.src = lastRoomSrc;
      compareBtn.textContent = "Порівняти: після";
    } else {
      aiResultImg.src = lastResultSrc;
      compareBtn.textContent = "Порівняти: до";
    }

    aiOutput.classList.remove("hidden");
  });

  // ===== Сброс =====
  tryOtherBtn?.addEventListener("click", () => {
    hideResultOnly();

    selectedRoom = null;
    selectedSofa = null;
    selectedProduct = { name: "", size: "", url: "" };

    if (productInfo) productInfo.hidden = true;
    if (productNameEl) productNameEl.textContent = "";
    if (productSizeEl) productSizeEl.textContent = "";
    if (productLinkEl) productLinkEl.href = "#";

    roomSelector?.querySelectorAll(".select-btn").forEach((b) => b.classList.remove("is-active"));
    sofaSelector?.querySelectorAll(".select-btn").forEach((b) => b.classList.remove("is-active"));

    updateGenerateButton();
    roomSelector?.scrollIntoView({ behavior: "smooth" });
  });

  // ===== Модалка =====
  function openModal(src) {
    modalImage.src = src;
    modal.classList.remove("hidden");
  }
  function closeModal() {
    modal.classList.add("hidden");
    modalImage.src = "";
  }

  document.addEventListener("click", (e) => {
    const img = e.target.closest(".js-open-modal");
    if (img) openModal(img.src);
  });

  closeBtn?.addEventListener("click", closeModal);
  modal?.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  updateGenerateButton();
});


    