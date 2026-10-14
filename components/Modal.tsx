"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

/** HTS 팝업창 느낌: 제목 표시줄 + 각진 창 */
export function Modal({
  open,
  onClose,
  title,
  children,
  width = "max-w-md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-2 pt-[8vh] sm:pt-[12vh]" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className={`relative flex max-h-[84vh] w-full ${width} flex-col rounded-sm border border-border bg-surface shadow-2xl`}>
        <div className="flex items-center justify-between border-b border-border bg-surface-2 px-3 py-1.5">
          <h2 className="text-[13px] font-bold">{title}</h2>
          <button onClick={onClose} aria-label="닫기" className="rounded-sm p-0.5 text-muted hover:bg-border hover:text-foreground">
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto p-3 text-[13px]">{children}</div>
      </div>
    </div>
  );
}
