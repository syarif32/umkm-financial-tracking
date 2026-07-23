"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { ImageOff, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { MENU_IMAGES_BUCKET, extractStoragePathFromPublicUrl } from "@/lib/supabase/storage";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export function MenuImageUpload({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar.");
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error("Ukuran gambar maksimal 5MB.");
      return;
    }

    setIsUploading(true);
    try {
      const supabase = createClient();
      const extension = file.name.split(".").pop() ?? "jpg";
      const path = `menus/${crypto.randomUUID()}.${extension}`;

      // RLS on storage.objects restricts writes to this bucket to Owner —
      // this call fails for a Karyawan session even though it runs
      // client-side, so hiding this control from Karyawan in the UI is a
      // convenience, not the actual security boundary.
      const { error: uploadError } = await supabase.storage
        .from(MENU_IMAGES_BUCKET)
        .upload(path, file, { upsert: false });

      if (uploadError) {
        toast.error(`Gagal mengunggah gambar: ${uploadError.message}`);
        return;
      }

      const { data } = supabase.storage.from(MENU_IMAGES_BUCKET).getPublicUrl(path);
      const previousUrl = value;

      onChange(data.publicUrl);
      toast.success("Gambar berhasil diunggah.");

      // Best-effort cleanup of the image being replaced. Not critical to
      // correctness, so failures here are swallowed rather than surfaced.
      if (previousUrl) {
        const previousPath = extractStoragePathFromPublicUrl(previousUrl);
        if (previousPath) {
          void supabase.storage.from(MENU_IMAGES_BUCKET).remove([previousPath]);
        }
      }
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote Supabase Storage URL, host varies per project
          <img src={value} alt="Pratinjau menu" className="h-full w-full object-cover" />
        ) : (
          <ImageOff className="h-6 w-6 text-muted-foreground" />
        )}
      </div>

      <div className="flex flex-col gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || isUploading}
          onClick={() => inputRef.current?.click()}
        >
          {isUploading ? <Loader2 className="animate-spin" /> : <Upload />}
          {value ? "Ganti Gambar" : "Unggah Gambar"}
        </Button>
        <span className="text-xs text-muted-foreground">JPG/PNG, maks 5MB.</span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled || isUploading}
      />
    </div>
  );
}
