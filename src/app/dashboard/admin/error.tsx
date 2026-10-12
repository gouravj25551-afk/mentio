"use client";

export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-950">
      <h1 className="text-lg font-semibold">This admin page could not load</h1>
      <p className="mt-2 text-sm">Your account is still signed in. Please try loading this page again.</p>
      <button type="button" onClick={reset} className="mt-4 rounded-lg bg-red-900 px-4 py-2 text-sm font-medium text-white hover:bg-red-800">
        Try again
      </button>
    </div>
  );
}
