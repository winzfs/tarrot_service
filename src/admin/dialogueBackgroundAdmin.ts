import {
  type DialogueBackgroundImageId,
  loadDialogueBackgroundSettings,
  normalizeDialogueBackgroundSettings,
  presetDialogueBackgroundUrl,
  resetDialogueBackgroundSettings,
  saveDialogueBackgroundSettings,
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

export function mountDialogueBackgroundAdmin(): void {
  document.body.innerHTML = "";
  document.body.classList.add("admin-page");

  let settings = loadDialogueBackgroundSettings();

  const root = document.createElement("main");
  root.className = "admin-shell";
  root.innerHTML = `
    <section class="admin-card">
      <div class="admin-topline">Arcana Admin</div>
      <h1>점술사 대화 배경 설정</h1>
      <p class="admin-copy">/public/img/back1, /public/img/back2 이미지를 선택하고 대화창이 올라간 상태로 위치, 크롭, 확대를 조절합니다.</p>
      <div class="admin-preview" data-preview>
        <img data-preview-image alt="대화 배경 미리보기" />
        <div class="admin-preview-dim" data-preview-dim></div>
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
        <button type="button" data-save>저장하기</button>
        <button type="button" data-reset>초기화</button>
        <a href="/">게임으로 돌아가기</a>
      </div>
      <div class="admin-status" data-status></div>
    </section>
  `;

  document.body.appendChild(root);

  const controls = root.querySelector<HTMLElement>("[data-controls]")!;
  const status = root.querySelector<HTMLElement>("[data-status]")!;
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
    [label("배경 사용", enabled.id), enabled, "저장 후 점술사 대화 화면에 적용됩니다."],
    [label("이미지", imageSelect.id), imageSelect, "back1/back2는 public/img 폴더 기준입니다."],
    [label("이미지 URL", urlInput.id), urlInput, "예: /img/back1.png, /img/back2.png"],
    [label("확대", zoom.id), zoom, "배경을 확대/축소합니다."],
    [label("가로 위치", offsetX.id), offsetX, "왼쪽/오른쪽으로 이동합니다."],
    [label("세로 위치", offsetY.id), offsetY, "위/아래로 이동합니다."],
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
    const presetUrl = imageId === "custom" ? urlInput.value : presetDialogueBackgroundUrl(imageId);
    if (imageId !== "custom") urlInput.value = presetUrl;
    settings = normalizeDialogueBackgroundSettings({
      enabled: enabled.checked,
      imageId,
      imageUrl: presetUrl,
      zoom: Number(zoom.value),
      offsetX: Number(offsetX.value),
      offsetY: Number(offsetY.value),
      dim: Number(dim.value),
    });
    return settings;
  }

  function render(): void {
    const value = readSettings();
    previewImage.src = value.imageUrl;
    previewImage.style.transform = `translate(${value.offsetX}%, ${value.offsetY}%) scale(${value.zoom})`;
    previewDim.style.background = `rgba(0,0,0,${value.dim})`;
    status.textContent = `현재값 · ${value.enabled ? "사용" : "미사용"} · ${value.imageUrl} · 확대 ${value.zoom.toFixed(2)} · X ${value.offsetX} · Y ${value.offsetY}`;
  }

  [enabled, imageSelect, urlInput, zoom, offsetX, offsetY, dim].forEach((control) => {
    control.addEventListener("input", render);
    control.addEventListener("change", render);
  });

  root.querySelector<HTMLButtonElement>("[data-save]")!.addEventListener("click", () => {
    saveDialogueBackgroundSettings(readSettings());
    render();
    status.textContent = "저장 완료. 게임으로 돌아가면 점술사 대화 화면에 적용됩니다.";
  });

  root.querySelector<HTMLButtonElement>("[data-reset]")!.addEventListener("click", () => {
    settings = resetDialogueBackgroundSettings();
    enabled.checked = settings.enabled;
    imageSelect.value = settings.imageId;
    urlInput.value = settings.imageUrl;
    zoom.value = String(settings.zoom);
    offsetX.value = String(settings.offsetX);
    offsetY.value = String(settings.offsetY);
    dim.value = String(settings.dim);
    render();
  });

  render();
}
