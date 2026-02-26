"use client";

import { UploadCloud } from "lucide-react";

export function FileUpload({ onFileSelect }: { onFileSelect: (file: File) => void }): React.JSX.Element {
  return (
    <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
      <UploadCloud size={22} className="mb-2" />
      Click to upload
      <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && onFileSelect(e.target.files[0])} />
    </label>
  );
}