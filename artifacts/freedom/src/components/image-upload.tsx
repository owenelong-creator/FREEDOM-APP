import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { uploadCommunityImage } from "@/lib/storage";

type Props = {
  scope: "posts" | "comments";
  value: string | null;
  onChange: (url: string | null) => void;
  onError?: (msg: string) => void;
};

export default function ImageUpload({ scope, value, onChange, onError }: Props) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File | null) => {
    if (!file || !user) return;
    setBusy(true);
    try {
      const url = await uploadCommunityImage(file, user.uid, scope);
      onChange(url);
    } catch (e: unknown) {
      const err = e as { message?: string };
      onError?.(err.message || "Upload failed.");
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
          disabled={busy || !user}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground border border-dashed border-border rounded-md px-3 py-2 disabled:opacity-50"
          data-testid={`upload-button-${scope}`}
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
          {busy ? "Uploading…" : "Add image"}
        </button>
      )}
    </div>
  );
}
