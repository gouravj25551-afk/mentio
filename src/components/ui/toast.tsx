"use client";
import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      theme="light"
      position="top-right"
      toastOptions={{
        classNames: {
          toast: "border border-slate-200 rounded-xl shadow-lg bg-white text-slate-900",
          title: "text-slate-950 font-semibold",
          description: "text-slate-600",
        },
      }}
    />
  );
}

export { toast } from "sonner";
