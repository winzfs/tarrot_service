import html2canvas from "html2canvas";

const EXPORT_CARD_WIDTH = 780;
const EXPORT_PADDING = 24;

function getExportTimestamp(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    "-",
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join("");
}

function downloadCanvas(canvas: HTMLCanvasElement): void {
  const link = document.createElement("a");
  link.download = `arcana-reading-summary-${getExportTimestamp()}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function waitForImages(root: HTMLElement): Promise<void> {
  const images = Array.from(root.querySelectorAll("img"));
  if (images.length === 0) return Promise.resolve();

  return Promise.all(
    images.map((image) => {
      if (image.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        image.onload = () => resolve();
        image.onerror = () => resolve();
      });
    }),
  ).then(() => undefined);
}

function createCaptureHost(target: HTMLElement): HTMLElement {
  const host = document.createElement("div");
  host.setAttribute("data-summary-capture-host", "true");
  host.style.position = "fixed";
  host.style.left = "0";
  host.style.top = "0";
  host.style.zIndex = "-1";
  host.style.width = `${EXPORT_CARD_WIDTH + EXPORT_PADDING * 2}px`;
  host.style.minHeight = "100px";
  host.style.padding = `${EXPORT_PADDING}px`;
  host.style.background = "#05020e";
  host.style.pointerEvents = "none";
  host.style.opacity = "0";
  host.style.overflow = "visible";
  host.style.transform = "none";

  const clone = target.cloneNode(true) as HTMLElement;
  clone.style.transform = "none";
  clone.style.transition = "none";
  clone.style.animation = "none";
  clone.style.opacity = "1";
  clone.style.width = `${EXPORT_CARD_WIDTH}px`;
  clone.style.maxWidth = `${EXPORT_CARD_WIDTH}px`;
  clone.style.margin = "0";
  clone.style.boxSizing = "border-box";

  clone.querySelectorAll<HTMLElement>("*").forEach((node) => {
    node.style.transformOrigin = "center center";
    node.style.animation = "none";
    node.style.transition = "none";
  });

  host.appendChild(clone);
  document.body.appendChild(host);
  return host;
}

export async function exportSummaryCardCapture(target: HTMLElement): Promise<void> {
  const host = createCaptureHost(target);

  try {
    await waitForImages(host);
    await new Promise((resolve) => window.requestAnimationFrame(() => resolve(undefined)));
    await new Promise((resolve) => window.requestAnimationFrame(() => resolve(undefined)));

    const canvas = await html2canvas(host, {
      backgroundColor: "#05020e",
      scale: 1,
      useCORS: true,
      allowTaint: true,
      logging: false,
      imageTimeout: 8000,
      scrollX: 0,
      scrollY: 0,
      windowWidth: EXPORT_CARD_WIDTH + EXPORT_PADDING * 2,
      windowHeight: Math.ceil(host.scrollHeight),
      width: EXPORT_CARD_WIDTH + EXPORT_PADDING * 2,
      height: Math.ceil(host.scrollHeight),
    });

    downloadCanvas(canvas);
  } finally {
    host.remove();
  }
}
