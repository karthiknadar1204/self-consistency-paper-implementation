"use client";

import { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3004";

export default function SelfConsistencyChat() {
  const [prompt, setPrompt] = useState("");
  const [numSamples, setNumSamples] = useState(5);
  const [temperature, setTemperature] = useState(0.8);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [showRaw, setShowRaw] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${API_URL}/self-consistency`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          numSamples: Number(numSamples),
          temperature: Number(temperature),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || res.statusText);
      setResult(data);
    } catch (err) {
      setError(err.message || "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Self-Consistency
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Ask a question; results show the majority-voted answer from multiple samples.
        </p>
      </header>

      <div className="flex flex-1 flex-col gap-4 overflow-auto p-4 md:flex-row">
        <section className="flex flex-1 flex-col gap-3">
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Your question
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Janet's ducks lay 16 eggs per day. She sells three-quarters and uses the rest for baking. How many eggs does she use for baking each day?"
              className="min-h-[120px] w-full resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500"
              disabled={loading}
            />
            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
                <span>Samples: {numSamples}</span>
                <input
                  type="range"
                  min={1}
                  max={15}
                  value={numSamples}
                  onChange={(e) => setNumSamples(Number(e.target.value))}
                  className="h-2 w-40 cursor-pointer appearance-none rounded-lg bg-zinc-200 dark:bg-zinc-700"
                  disabled={loading}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
                <span>Temperature: {temperature}</span>
                <input
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.1}
                  value={temperature}
                  onChange={(e) => setTemperature(Number(e.target.value))}
                  className="h-2 w-40 cursor-pointer appearance-none rounded-lg bg-zinc-200 dark:bg-zinc-700"
                  disabled={loading}
                />
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="submit"
                disabled={loading || !prompt.trim()}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {loading ? "Running…" : "Run"}
              </button>
            </div>
          </form>
          {error && (
            <div className="rounded-lg bg-red-100 px-3 py-2 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-200">
              {error}
            </div>
          )}
        </section>

        <section className="flex flex-1 flex-col gap-2 overflow-hidden rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Result
          </h2>
          {!result && !loading && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Send a question to see the top answer and vote details.
            </p>
          )}
          {result && (
            <div className="flex flex-col gap-3 overflow-auto">
              <div className="rounded-lg bg-zinc-100 p-3 dark:bg-zinc-800">
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Top answer
                </span>
                <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                  {result.topAnswer}
                </p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Consistency: {result.consistencyScore} ({result.validAnswersCount}/{result.totalSamples} agreed)
                </p>
              </div>
              <div>
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Vote details
                </span>
                <ul className="mt-1 list-inside list-disc text-sm text-zinc-700 dark:text-zinc-300">
                  {result.voteDetails?.map(({ answer, count }) => (
                    <li key={answer}>
                      “{answer}” → {count}
                    </li>
                  ))}
                </ul>
              </div>
              {result.rawSamples?.length > 0 && (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowRaw((v) => !v)}
                    className="text-sm font-medium text-zinc-600 hover:underline dark:text-zinc-400"
                  >
                    {showRaw ? "Hide" : "Show"} raw samples
                  </button>
                  {showRaw && (
                    <ul className="mt-2 space-y-2 overflow-auto">
                      {result.rawSamples.map((text, i) => (
                        <li
                          key={i}
                          className="rounded border border-zinc-200 bg-zinc-50 p-2 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                        >
                          <span className="font-medium">Sample {i + 1}:</span>{" "}
                          {text?.slice(0, 300)}
                          {(text?.length ?? 0) > 300 ? "…" : ""}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
