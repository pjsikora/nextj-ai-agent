"use client"
import React, { useMemo, useRef, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button"


export default function ItemValuation({ apiUrl = "/api/openai" }: { apiUrl?: string }) {
  const [files, setFiles] = useState<File[]>([]);
  const [serverText, setServerText] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);

  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const previews = useMemo(
    () => files.map((f) => ({ name: f.name, url: URL.createObjectURL(f) })),
    [files]
  );

  function addFiles(list: FileList | null) {
    if (!list?.length) return;
    const incoming = Array.from(list).filter((f) => f.type.startsWith("image/"));
    setFiles((prev) => {
      const key = (f: File) => `${f.name}_${f.lastModified}_${f.size}`;
      const existing = new Set(prev.map(key));
      const unique = incoming.filter((f) => !existing.has(key(f)));
      return [...prev, ...unique];
    });
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    addFiles(e.dataTransfer?.files ?? null);
  }

  async function handleSubmit() {
    if (!files.length) {
      setError("Dodaj przynajmniej jedno zdjęcie.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setServerText("");
    setProgress(0);

    try {
      const form = new FormData();
      files.forEach((f, i) => form.append("images", f, f.name || `image_${i + 1}.jpg`));

      const resText = await uploadWithProgress(apiUrl, form, (p) => setProgress(p));
      setServerText(resText);
    } catch (e) {
      if (e instanceof Error) {
        setError(e?.message ?? "Sending error.");
      } else {
        setError("Unknown error.");
      }
    } finally {
      setIsLoading(false);
      setProgress(null);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-3xl p-6">
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Wyceń przedmiot</h1>
          <span className="text-xs text-gray-500">demo React</span>
        </header>

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          className="mb-4 rounded-2xl border-2 border-dashed border-gray-300 bg-white p-6 text-center"
        >
          <p className="mb-3 text-sm text-gray-600">
            Możesz dodać wiele zdjęć, przeciągając je tutaj lub używając przycisków poniżej.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button
              onClick={() => galleryInputRef.current?.click()}
              > Wybierz z galerii</Button>
            <Button
              variant="green"
              onClick={() => cameraInputRef.current?.click()}>
                Zrób zdjęcie</Button>
            <Button
              variant="destructive"
              onClick={() => setFiles([])}>
                Wyczyść</Button>
          </div>


          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />
        </div>

        <PasteCatcher onPasteFiles={(fl) => addFiles(fl)} />

        {!!files.length && (
          <ul className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {previews.map((p, idx) => (
              <li key={p.url} className="group relative overflow-hidden rounded-2xl bg-white shadow">
                <img src={p.url} alt={p.name} className="h-40 w-full object-cover" />
                <Button
                onClick={() => setFiles((curr) => curr.filter((_, i) => i !== idx))}
                >Usuń</Button>
                <button
                  type="button"
                  
                  className="absolute right-2 top-2 hidden rounded-full bg-black/60 px-2 py-1 text-xs text-white group-hover:block"
                >
                  Usuń
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="mb-2 flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleSubmit}
            >{isLoading ? "Wysyłanie…" : "Wyślij"}</Button>
        
          {typeof progress === "number" && (
            <div className="text-sm text-gray-600">Przesłano: {progress}%</div>
          )}
        </div>

        {error && (
          <div className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <section className="rounded-2xl border bg-white p-4">
          <h2 className="mb-2 text-sm font-medium text-gray-700">Odpowiedź serwera</h2>
          <pre className="whitespace-pre-wrap break-words text-sm text-gray-900">
            {serverText || "—"}
          </pre>
        </section>

        <footer className="mt-8 text-center text-xs text-gray-500">v0.0.1 – React demo</footer>
      </div>
    </div>
  );
}


async function uploadWithProgress(url: string, formData: FormData, onProgress?: (pct: number) => void) {
  const resText = await new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);

    xhr.upload.onprogress = (evt) => {
      if (!evt.lengthComputable) return;
      const pct = Math.round((evt.loaded / evt.total) * 100);
      onProgress?.(pct);
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.responseText);
      } else {
        reject(new Error(`HTTP ${xhr.status}: ${xhr.responseText || "Błąd"}`));
      }
    };

    xhr.onerror = () => reject(new Error("Błąd sieci podczas wysyłania."));
    xhr.send(formData);
  });

  return resText;
}

function PasteCatcher({ onPasteFiles }: { onPasteFiles: (files: FileList) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      className="mb-4 rounded-2xl border border-dashed border-gray-300 bg-white p-3 text-center text-xs text-gray-500 outline-none"
      onPaste={(e) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        const files = Array.from(items)
          .filter((it) => it.kind === "file")
          .map((it) => it.getAsFile())
          .filter(Boolean) as File[];
        if (files.length) {
          const list = {
            length: files.length,
            item: (i: number) => files[i],
            ...files,
          } as unknown as FileList;
          onPasteFiles(list);
        }
      }}
    >
      Możesz też wkleić obraz (Ctrl/Cmd+V)
    </div>
  );
}
