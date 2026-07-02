/**
 * Client-side canvas renderer. Rasterizes a DesignLayer[] to a PNG/JPG data
 * URL with zero external dependencies — used for downloads and thumbnails.
 * Positions/sizes are percentages of the canvas. Runs in the browser only.
 */
import type { DesignLayerData } from "./types";

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}
function num(v: unknown, fallback: number): number {
  return typeof v === "number" ? v : fallback;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawText(ctx: CanvasRenderingContext2D, layer: DesignLayerData, W: number, H: number) {
  const x = (layer.positionX / 100) * W;
  const y = (layer.positionY / 100) * H;
  const w = (layer.width / 100) * W;
  const s = layer.styleJson;
  const fontSize = (num(s.fontSize, 40) / 1080) * Math.min(W, H) * 1.4;
  const weight = num(s.fontWeight, 400);
  const family = str(s.fontFamily, "Inter");
  const align = (str(s.align, "left") as CanvasTextAlign);
  ctx.fillStyle = str(s.color, "#0f172a");
  ctx.font = `${weight} ${Math.round(fontSize)}px ${family}, system-ui, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = "top";
  const tx = align === "center" ? x + w / 2 : align === "right" ? x + w : x;
  const lines = str((layer.contentJson as Record<string, unknown>).text, "").split("\n");
  lines.forEach((line, i) => ctx.fillText(line, tx, y + i * fontSize * 1.15));
}

/** Draw all layers onto a 2D context sized W×H. Images resolve before return. */
export async function paintLayers(
  ctx: CanvasRenderingContext2D,
  layers: DesignLayerData[],
  W: number,
  H: number
): Promise<void> {
  const ordered = layers.slice().sort((a, b) => a.zIndex - b.zIndex);
  for (const layer of ordered) {
    if (!layer.visible) continue;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, layer.opacity));
    const x = (layer.positionX / 100) * W;
    const y = (layer.positionY / 100) * H;
    const w = (layer.width / 100) * W;
    const h = (layer.height / 100) * H;
    if (layer.rotation) {
      ctx.translate(x + w / 2, y + h / 2);
      ctx.rotate((layer.rotation * Math.PI) / 180);
      ctx.translate(-(x + w / 2), -(y + h / 2));
    }
    const s = layer.styleJson;
    if (layer.layerType === "background") {
      ctx.fillStyle = str(s.fill, "#ffffff");
      ctx.fillRect(0, 0, W, H);
    } else if (layer.layerType === "shape" || layer.layerType === "overlay") {
      ctx.fillStyle = str(s.fill, "#84cc16");
      roundRect(ctx, x, y, w, h, num(s.radius, 0));
      ctx.fill();
    } else if (layer.layerType === "text") {
      drawText(ctx, layer, W, H);
    } else if (layer.layerType === "image") {
      const url = str((layer.contentJson as Record<string, unknown>).url);
      if (url) {
        try {
          const img = await loadImage(url);
          ctx.drawImage(img, x, y, w, h);
        } catch {
          ctx.fillStyle = "#e2e8f0";
          ctx.fillRect(x, y, w, h);
        }
      }
    }
    ctx.restore();
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Render layers to a data URL. format: "png" | "jpg". */
export async function renderToDataUrl(
  layers: DesignLayerData[],
  width: number,
  height: number,
  format: "png" | "jpg" = "png"
): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  if (format === "jpg") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
  }
  await paintLayers(ctx, layers, width, height);
  return canvas.toDataURL(format === "jpg" ? "image/jpeg" : "image/png", 0.92);
}

/** Trigger a browser download of a data URL. */
export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Open a print-to-PDF view of a rendered image (dependency-free PDF export). */
export function printImageAsPdf(dataUrl: string, title = "design") {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(
    `<html><head><title>${title}</title><style>@page{margin:0}body{margin:0}img{width:100%;display:block}</style></head>` +
    `<body><img src="${dataUrl}" onload="setTimeout(()=>window.print(),150)"/></body></html>`
  );
  w.document.close();
}
