"use client";
import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      theme="system"
      position="top-right"
      toastOptions={{
        classNames: {
          toast: "border rounded-lg shadow-soft bg-background",
          description: "text-muted-foreground",
        },
      }}
    />
  );
}

export { toast } from "sonner";
