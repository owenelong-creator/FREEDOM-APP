import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";

type Props = {
  scope: "posts" | "comments";
  value: string | null;
  onChange: (url: string | null) => void;
  onError?: (msg: string) => void;
};

const MAX_DIMENSION = 1280;
const TARGET_BYTES = 250 * 1024;
const HARD_CAP_BYTES = 700 * 1024;

function dataUrlBytes(dataUrl: string): number {
  const i = dataUrl.indexOf(",");
  const b64 = i >= 0 ? dataUrl.slice(i + 1) : dataUrl;
  return Math.floor((b64.length * 3) / 4);
}

async function fileToImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Could not read that image."));
      img.src = url;
    });
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

async function compressImage(file: File): Promise<string> {
  const img = await fileToImage(file);
  let { width, height } = img;
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Image processing not supported on this device.");
  ctx.drawImage(img, 0, 0, width, height);

  let quality = 0.82;
  let dataUrl = canvas.toDataURL("image/jpeg", quality);
  while (dataUrlBytes(dataUrl) > TARGET_BYTES && quality > 0.3) {
    quality -= 0.12;
    dataUrl = canvas.toDataURL("image/jpeg", quality);
  }
  if (dataUrlBytes(dataUrl) > HARD_CAP_BYTES) {
    throw new Error("Image is still too large after compression. Try a smaller photo.");
  }
  return dataUrl;
}

export default function ImageUpload({ scope, value, onChange, onError }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      onError?.("That file isn't an image.");
      return;
    }
    setBusy(true);
    try {
      const dataUrl = await compressImage(file);
      onChange(dataUrl);
    } catch (e: unknown) {
      const err = e as { message?: string };
      onError?.(err.message || "Could not process that image.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={(e) => handleFile(e.target.files?.[0] || null)}
        className="hidden"
        data-testid={`upload-input-${scope}`}
      />
      {value ? (
        <div className="relative inline-block">
          <img
            src={value}
            alt="upload preview"
            className="max-h-40 rounded-lg border border-border"
            data-testid={`upload-preview-${scope}`}
          />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute -top-2 -right-2 bg-card border border-border rounded-full p-1 text-muted-foreground hover:text-destructive"
            aria-label="Remove image"
            data-testid={`upload-remove-${scope}`}
          >
            <X size={12} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground border border-dashed border-border rounded-md px-3 py-2 disabled:opacity-50"
          data-testid={`upload-button-${scope}`}
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
          {busy ? "Processing…" : "Add image"}
        </button>
      )}
    </div>
  );
}
