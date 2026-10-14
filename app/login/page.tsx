"use client";

import { useState } from "react";

export default function LoginPage() {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const res = await fetch("/api/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: pw }) });
    if (res.ok) {
      window.location.href = "/";
      return;
    }
    setErr((await res.json().catch(() => ({}))).error ?? "로그인하지 못했어요");
    setBusy(false);
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-3xl border border-border bg-surface p-8 shadow-sm">
        <div className="text-center">
          <div className="text-4xl">📈</div>
          <h1 className="mt-2 text-xl font-extrabold">수익률 알리미</h1>
          <p className="mt-1 text-sm text-muted">비밀번호를 입력해 주세요</p>
        </div>
        <input
          type="password"
          autoFocus
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="비밀번호"
          aria-label="비밀번호"
          className="w-full rounded-2xl border border-border bg-surface-2 px-4 py-3 outline-none focus:border-primary"
        />
        {err && <p className="text-sm text-up">{err}</p>}
        <button disabled={busy || !pw} className="w-full rounded-2xl bg-primary py-3.5 font-bold text-primary-fg disabled:opacity-40">
          {busy ? "확인 중…" : "들어가기"}
        </button>
      </form>
    </main>
  );
}
