import {
  type DialogueBackgroundImageId,
  loadDialogueBackgroundSettings,
  normalizeDialogueBackgroundSettings,
  presetDialogueBackgroundUrl,
  resetDialogueBackgroundSettings,
  saveDialogueBackgroundSettings,
  settingsToDialogueBackgroundParams,
} from "./dialogueBackgroundSettings";

function label(text: string, forId: string): HTMLLabelElement {
  const el = document.createElement("label");
  el.htmlFor = forId;
  el.textContent = text;
  return el;
}

function range(id: string, min: string, max: string, step: string, value: number): HTMLInputElement {
  const input = document.createElement("input");
  input.type = "range";
  input.id = id;
  input.min = min;
  input.max = max;
  input.step = step;
  input.value = String(value);
  return input;
}

function forceAdminScroll(): void {
  const html = document.documentElement;
  const body = document.body;
  html.style.height = "auto";
  html.style.minHeight = "100%";
  html.style.overflowY = "scroll";
  html.style.overflowX = "hidden";
  html.style.position = "static";
  html.style.touchAction = "pan-y";

  body.style.height = "auto";
  body.style.minHeight = "180dvh";
  body.style.overflowY = "visible";
  body.style.overflowX = "hidden";
  body.style.position = "static";
  body.style.touchAction = "pan-y";

  const app = document.getElementById("app");
  if (app) {
    app.style.display = "none";
    app.style.height = "0";
    app.style.overflow = "hidden";
  }
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function mountDialogueBackgroundAdmin(): void {
  document.body.innerHTML = "";
  document.body.classList.add("admin-page");
  forceAdminScroll();

  let settings = loadDialogueBackgroundSettings();
  let dragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragBaseX = 0;
  let dragBaseY = 0;

  const root = document.createElement("main");
  root.className = "admin-shell";
  root.innerHTML = `
    <section class="admin-card">
      <div class="admin-topline">Arcana Admin</div>
      <h1>점술사 대화 배경 설정</h1>
      <p class="admin-copy">back1/back2 선택 시 미리보기에 바로 반영됩니다. 미리보기 배경을 직접 드래그해서 위치를 조절할 수 있습니다.</p>
      <div class="admin-preview" data-preview>
        <img data-preview-image alt="대화 배경 미리보기" draggable="false" />
        <div class="admin-preview-dim" data-preview-dim></div>
        <div class="admin-preview-hint">배경을 드래그해서 위치 조절</div>
        <div class="admin-dialogue-preview">
          <div class="admin-orb">✦</div>
          <div>
            <div class="admin-dialogue-title">점술사 · 의식 1/5</div>
            <div class="admin-dialogue-body">어서 오세요, 여행자여. 먼저 별빛에 질문을 속삭여주세요.</div>
          </div>
        </div>
      </div>
      <div class="admin-controls" data-controls></div>
      <div class="admin-actions">
        <button type="button" data-save>다시 저장</button>
        <button type="button" data-reset>초기화</button>
        <a href="/" data-game-link>게임으로 돌아가기</a>
      </div>
      <div class="admin-status" data-status></div>
      <div class="admin-bottom-spacer" aria-hidden="true"></div>
    </section>
  `;

  document.body.appendChild(root);
  requestAnimationFrame(forceAdminScroll);

  const controls = root.querySelector<HTMLElement>("[data-controls]")!;
  const preview = root.querySelector<HTMLElement>("[data-preview]")!;
  const status = root.querySelector<HTMLElement>("[data-status]")!;
  const gameLink = root.querySelector<HTMLAnchorElement>("[data-game-link]")!;
  const previewImage = root.querySelector<HTMLImageElement>("[data-preview-image]")!;
  const previewDim = root.querySelector<HTMLElement>("[data-preview-dim]")!;

  const enabled = document.createElement("input");
  enabled.type = "checkbox";
  enabled.id = "dialogue-bg-enabled";
  enabled.checked = settings.enabled;

  const imageSelect = document.createElement("select");
  imageSelect.id = "dialogue-bg-image";
  (["back1", "back2", "custom"] as DialogueBackgroundImageId[]).forEach((id) => {
    const option = document.createElement("option");
    option.value = id;
    option.textContent = id === "custom" ? "직접 URL" : id;
    imageSelect.appendChild(option);
  });
  imageSelect.value = settings.imageId;

  const urlInput = document.createElement("input");
  urlInput.type = "text";
  urlInput.id = "dialogue-bg-url";
  urlInput.placeholder = "/img/back1.png";
  urlInput.value = settings.imageUrl;

  const zoom = range("dialogue-bg-zoom", "0.7", "2.4", "0.01", settings.zoom);
  const offsetX = range("dialogue-bg-offset-x", "-50", "50", "1", settings.offsetX);
  const offsetY = range("dialogue-bg-offset-y", "-50", "50", "1", settings.offsetY);
  const dim = range("dialogue-bg-dim", "0", "0.75", "0.01", settings.dim);

  const rows: Array<[HTMLLabelElement, HTMLElement, string]> = [
    [label("배경 사용", enabled.id), enabled, "켜는 즉시 저장되며 점술사 대화 화면에 적용됩니다."],
    [label("이미지", imageSelect.id), imageSelect, "back1/back2는 public/img 폴더 기준입니다."],
    [label("이미지 URL", urlInput.id), urlInput, "예: /img/back1.png, /img/back2.png"],
    [label("확대", zoom.id), zoom, "배경을 확대/축소합니다."],
    [label("가로 위치", offsetX.id), offsetX, "미리보기 배경을 드래그해도 변경됩니다."],
    [label("세로 위치", offsetY.id), offsetY, "미리보기 배경을 드래그해도 변경됩니다."],
    [label("어둡게", dim.id), dim, "대화창 가독성을 위한 어둡기입니다."],
  ];

  rows.forEach(([labelEl, control, help]) => {
    const row = document.createElement("div");
    row.className = "admin-row";
    const helpEl = document.createElement("small");
    helpEl.textContent = help;
    row.append(labelEl, control, helpEl);
    controls.appendChild(row);
  });

  function readSettings() {
    const imageId = imageSelect.value as DialogueBackgroundImageId;
    const imageUrl = imageId === "custom" ? urlInput.value : presetDialogueBackgroundUrl(imageId);
    if (imageId !== "custom") urlInput.value = imageUrl;
    settings = normalizeDialogueBackgroundSettings({
      enabled: enabled.checked,
      imageId,
      imageUrl,
      zoom: Number(zoom.value),
      offsetX: Number(offsetX.value),
      offsetY: Number(offsetY.value),
      dim: Number(dim.value),
    });
    return settings;
  }

  function syncControls(): void {
    enabled.checked = settings.enabled;
    imageSelect.value = settings.imageId;
    urlInput.value = settings.imageUrl;
    zoom.value = String(settings.zoom);
    offsetX.value = String(settings.offsetX);
    offsetY.value = String(settings.offsetY);
    dim.value = String(settings.dim);
  }

  function updateGameLink(value = settings): void {
    const query = settingsToDialogueBackgroundParams(value);
    gameLink.href = `/?${query}`;
  }

  function render(autoSave = true): void {
    const value = readSettings();
    previewImage.src = value.imageUrl;
    previewImage.style.transform = `translate(${value.offsetX}%, ${value.offsetY}%) scale(${value.zoom})`;
    previewDim.style.background = `rgba(0,0,0,${value.dim})`;
    updateGameLink(value);
    if (autoSave) saveDialogueBackgroundSettings(value);
    status.textContent = `${autoSave ? "즉시 저장됨" : "현재값"} · ${value.enabled ? "사용" : "미사용"} · ${value.imageUrl} · 확대 ${value.zoom.toFixed(2)} · X ${value.offsetX} · Y ${value.offsetY}`;
    forceAdminScroll();
  }

  function mutate(next: Partial<typeof settings>): void {
    settings = normalizeDialogueBackgroundSettings({ ...readSettings(), ...next });
    syncControls();
    render(true);
  }

  [enabled, imageSelect, urlInput, zoom, offsetX, offsetY, dim].forEach((control) => {
    control.addEventListener("input", () => render(true));
    control.addEventListener("change", () => render(true));
  });

  preview.addEventListener("pointerdown", (event) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest(".admin-dialogue-preview")) return;
    dragging = true;
    dragStartX = event.clientX;
    dragStartY = event.clientY;
    dragBaseX = Number(offsetX.value);
    dragBaseY = Number(offsetY.value);
    preview.classList.add("is-dragging");
    preview.setPointerCapture(event.pointerId);
  });

  preview.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    const rect = preview.getBoundingClientRect();
    const dx = ((event.clientX - dragStartX) / Math.max(rect.width, 1)) * 100;
    const dy = ((event.clientY - dragStartY) / Math.max(rect.height, 1)) * 100;
    mutate({ offsetX: clamp(dragBaseX + dx, -50, 50), offsetY: clamp(dragBaseY + dy, -50, 50) });
  });

  function endDrag(event: PointerEvent): void {
    if (!dragging) return;
    dragging = false;
    preview.classList.remove("is-dragging");
    try { preview.releasePointerCapture(event.pointerId); } catch { /* ignore */ }
  }

  preview.addEventListener("pointerup", endDrag);
  preview.addEventListener("pointercancel", endDrag);
  preview.addEventListener("wheel", (event) => {
    event.preventDefault();
    mutate({ zoom: clamp(Number(zoom.value) + (event.deltaY < 0 ? 0.05 : -0.05), 0.7, 2.4) });
  }, { passive: false });

  root.querySelector<HTMLButtonElement>("[data-save]")!.addEventListener("click", () => {
    saveDialogueBackgroundSettings(readSettings());
    render(false);
    status.textContent = "저장 완료. 게임으로 돌아가기 버튼을 누르면 설정이 URL로 전달됩니다.";
  });

  root.querySelector<HTMLButtonElement>("[data-reset]")!.addEventListener("click", () => {
    settings = resetDialogueBackgroundSettings();
    syncControls();
    render(true);
  });

  syncControls();
  render(false);
}
