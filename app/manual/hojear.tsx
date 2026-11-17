import {
  getDocument,
  GlobalWorkerOptions,
  type PDFDocumentProxy,
  type RenderTask,
} from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { useEffect, useRef, useState } from "react";

// Loaded only when a visitor taps Hojear, with the PDF itself.
GlobalWorkerOptions.workerSrc = workerSrc;

interface Props {
  pdf: string;
}

/** A Manual's pages, each drawn as it nears the screen. pdf.js fetches only the byte ranges those pages need. */
export function Hojear({ pdf }: Props) {
  const [document, setDocument] = useState<PDFDocumentProxy | "failed">();
  const [list, setList] = useState<HTMLOListElement | null>(null);

  useEffect(() => {
    let live = true;
    // Without streaming and auto-fetch, pdf.js asks only for the ranges it needs.
    const task = getDocument({
      url: pdf,
      disableStream: true,
      disableAutoFetch: true,
      // These PDFs scatter small objects: 16 KB chunks fetch about a third of what the 64 KB default does.
      rangeChunkSize: 16_384,
    });
    task.promise.then(
      (loaded) => {
        if (live) setDocument(loaded);
      },
      () => {
        if (live) setDocument("failed");
      },
    );
    return () => {
      live = false;
      void task.destroy();
    };
  }, [pdf]);

  if (document === "failed")
    return (
      <p className="p-6">
        No pudimos abrir las páginas. Podés descargar el manual igual.
      </p>
    );
  if (!document)
    return (
      <p role="status" className="p-6 text-ink-muted">
        Cargando páginas…
      </p>
    );
  return (
    <ol ref={setList} className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
      {list &&
        Array.from({ length: document.numPages }, (_, index) => (
          <li key={index}>
            <Page document={document} number={index + 1} list={list} />
          </li>
        ))}
    </ol>
  );
}

interface PageProps {
  document: PDFDocumentProxy;
  number: number;
  /** The scrolling list, so a page starts drawing a screen before it shows. */
  list: HTMLOListElement;
}

function Page({ document, number, list }: PageProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  // Unset until the page nears the screen, then busy while it draws.
  const [drawing, setDrawing] = useState<boolean>();

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    let cancelled = false;
    let render: RenderTask | undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        setDrawing(true);
        void document
          .getPage(number)
          .then((page) => {
            if (cancelled) return;
            const natural = page.getViewport({ scale: 1 });
            const viewport = page.getViewport({
              scale:
                (element.clientWidth * Math.min(devicePixelRatio, 2)) /
                natural.width,
            });
            element.width = Math.floor(viewport.width);
            element.height = Math.floor(viewport.height);
            element.style.aspectRatio = `${natural.width} / ${natural.height}`;
            render = page.render({ canvas: element, viewport });
            return render.promise.then(() => {
              setDrawing(false);
            });
          })
          // A render cancelled by closing the preview rejects; nothing to recover.
          .catch(() => undefined);
      },
      { root: list, rootMargin: "100% 0px" },
    );
    observer.observe(element);
    return () => {
      cancelled = true;
      observer.disconnect();
      render?.cancel();
    };
  }, [document, number, list]);

  return (
    <div role="img" aria-label={`Página ${number}`} aria-busy={drawing}>
      <canvas
        ref={canvas}
        // A4 until the page itself says otherwise.
        className="mx-auto block aspect-[210/297] w-full max-w-2xl bg-white shadow-tapa"
      />
    </div>
  );
}
