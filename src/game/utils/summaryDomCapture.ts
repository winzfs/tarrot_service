import html2canvas from "html2canvas";

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

export async function exportSummaryCardCapture(target: HTMLElement): Promise<void> {
  const previousTransform = target.style.transform;
  const previousTransition = target.style.transition;
  const previousAnimation = target.style.animation;

  try {
    target.style.transition = "none";
    target.style.animation = "none";
    target.scrollIntoView({ block: "center", inline: "center" });
    await new Promise((resolve) => window.requestAnimationFrame(() => resolve(undefined)));

    const canvas = await html2canvas(target, {
      backgroundColor: null,
      scale: Math.min(2, window.devicePixelRatio || 1.5),
      useCORS: true,
      allowTaint: true,
      logging: false,
      imageTimeout: 6000,
      scrollX: 0,
      scrollY: -window.scrollY,
      windowWidth: document.documentElement.clientWidth,
      windowHeight: document.documentElement.clientHeight,
    });

    downloadCanvas(canvas);
  } finally {
    target.style.transform = previousTransform;
    target.style.transition = previousTransition;
    target.style.animation = previousAnimation;
  }
}
