"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative flex max-h-[92dvh] w-full flex-col rounded-t-3xl bg-surface shadow-xl sm:max-w-md sm:rounded-3xl">
        <div className="flex items-center justify-between px-5 pb-2 pt-5">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} aria-label="닫기" className="rounded-full p-2 text-muted hover:bg-surface-2">
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 pb-6 pt-2">{children}</div>
      </div>
    </div>
  );
}
