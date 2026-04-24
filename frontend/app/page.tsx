"use client";

import { ChangeEvent, FormEvent, useState } from "react";

type OCRResult = {
  title: string;
  key_points: string[];
  body: string;
  dates_numbers: string[];
  raw_text: string;
};

export default function HomePage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<OCRResult | null>(null);
  const [editableText, setEditableText] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setResult(null);
    setEditableText("");
    setError("");
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) {
      setError("Please select an image first.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("https://ocr-document-categorizer-mvp.onrender.com/process", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Processing failed.");
      }

      setResult(data.result);
      setEditableText(data.result.raw_text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(editableText);
  };

  const handleSave = () => {
    const blob = new Blob([editableText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "ocr_output.txt";
    a.click();

    URL.revokeObjectURL(url);
  };

  const handleReprocess = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("https://ocr-document-categorizer-mvp.onrender.com/reprocess", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: editableText }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Reprocessing failed.");
      }

      setResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 text-white p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold">OCR Document Categorizer</h1>
          <p className="text-gray-300 mt-2">
            Upload a document image to extract and categorize content
          </p>
        </div>

        {/* Upload */}
        <form
          onSubmit={onSubmit}
          className="bg-white/10 backdrop-blur-md p-4 rounded-xl flex gap-4 items-center justify-center"
        >
          <label className="cursor-pointer bg-slate-800 px-4 py-2 rounded-lg border border-slate-600 hover:bg-slate-700 transition">
            Choose Image
            <input
              type="file"
              accept="image/*"
              onChange={onFileChange}
              className="hidden"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 active:scale-95 transition transform px-4 py-2 rounded-lg font-semibold shadow-md"
          >
            {loading ? "Processing..." : "Process"}
          </button>
        </form>

        {error && <p className="text-red-400 text-center">{error}</p>}

        {result && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Editable Text */}
            <div className="bg-white/10 p-4 rounded-xl">
              <h2 className="text-xl font-semibold mb-2">Editable Text</h2>

              <textarea
                value={editableText}
                onChange={(e) => setEditableText(e.target.value)}
                className="w-full h-64 p-3 rounded-lg bg-slate-800 text-gray-200 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleCopy}
                  className="bg-gray-300 text-black px-3 py-1 rounded"
                >
                  Copy
                </button>

                <button
                  onClick={handleSave}
                  className="bg-gray-300 text-black px-3 py-1 rounded"
                >
                  Save
                </button>

                <button
                  onClick={handleReprocess}
                  className="bg-blue-500 px-3 py-1 rounded"
                >
                  {loading ? "..." : "Re-process"}
                </button>
              </div>
            </div>

            {/* Structured Output */}
            <div className="bg-white/10 p-4 rounded-xl">
              <h2 className="text-xl font-semibold mb-2">Categorized Output</h2>

              <div className="space-y-4">
                {/* Title */}
                <div>
                  <h3 className="font-semibold">Title</h3>
                  <p className="text-gray-200">
                    {result.title || "No title detected."}
                  </p>
                </div>

                {/* Key Points */}
                <div>
                  <h3 className="font-semibold">Key Points</h3>
                  {result.key_points && result.key_points.length > 0 ? (
                    <ul className="list-disc ml-5 text-gray-200">
                      {result.key_points.map((p) => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-400">No key points detected.</p>
                  )}
                </div>

                {/* Body */}
                <div>
                  <h3 className="font-semibold">Body</h3>
                  <p className="text-gray-200">
                    {result.body || "No body content detected."}
                  </p>
                </div>

                {/* Dates */}
                <div>
                  <h3 className="font-semibold">Dates / Numbers</h3>
                  {result.dates_numbers && result.dates_numbers.length > 0 ? (
                    <ul className="list-disc ml-5 text-gray-200">
                      {result.dates_numbers.map((d) => (
                        <li key={d}>{d}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-400">No dates or numbers found.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
