import {
  getDocument,
  GlobalWorkerOptions,
  type PDFDocumentProxy,
  type RenderTask,
} from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { type ReactNode, useEffect, useRef, useState } from "react";

// Loaded only when a visitor taps Hojear, with the PDF itself.
GlobalWorkerOptions.workerSrc = workerSrc;

interface Props {
  pdf: string;
  /** Shown while the PDF opens, and if it can't. The Manual page shows the same while this code loads. */
  loading: ReactNode;
  failed: ReactNode;
}

/** A Manual's pages, each drawn as it nears the screen. pdf.js fetches only the byte ranges those pages need. */
export function Hojear({ pdf, loading, failed }: Props) {
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | "failed">();
  const [list, setList] = useState<HTMLOListElement | null>(null);

  useEffect(() => {
    let live = true;
    // Without streaming and auto-fetch, pdf.js asks only for the ranges it needs.
    // shortcut: that needs the host to send `Accept-Ranges: bytes` on a full GET (static hosts do; the local sirv
    // preview doesn't, so there the whole PDF downloads); check the header once a host is chosen.
    const task = getDocument({
      url: pdf,
      disableStream: true,
      disableAutoFetch: true,
      // These PDFs scatter small objects: 16 KB chunks fetch about a third of what the 64 KB default does.
      rangeChunkSize: 16_384,
    });
    task.promise.then(
      (loaded) => {
        if (live) setPdfDocument(loaded);
      },
      () => {
        if (live) setPdfDocument("failed");
      },
    );
    return () => {
      live = false;
      void task.destroy();
    };
  }, [pdf]);

  if (pdfDocument === "failed") return failed;
  if (!pdfDocument) return loading;
  return (
    <ol
      ref={setList}
      // Focusable, so a keyboard can scroll the pages in every browser.
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scroll area must take focus to scroll by keyboard.
      tabIndex={0}
      aria-label="Páginas"
      className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6"
    >
      {list &&
        Array.from({ length: pdfDocument.numPages }, (_, index) => (
          <li key={index}>
            <Page pdfDocument={pdfDocument} number={index + 1} list={list} />
          </li>
        ))}
    </ol>
  );
}

interface PageProps {
  pdfDocument: PDFDocumentProxy;
  number: number;
  /** The scrolling list, so a page starts drawing a screen before it shows. */
  list: HTMLOListElement;
}

function Page({ pdfDocument, number, list }: PageProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<
    "waiting" | "drawing" | "drawn" | "failed"
  >("waiting");

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    let cancelled = false;
    let render: RenderTask | undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        setState("drawing");
        pdfDocument
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
              setState("drawn");
            });
          })
          .catch(() => {
            // Closing the preview cancels a render; anything else is a page that couldn't be drawn.
            if (!cancelled) setState("failed");
          });
      },
      { root: list, rootMargin: "100% 0px" },
    );
    observer.observe(element);
    return () => {
      cancelled = true;
      observer.disconnect();
      render?.cancel();
    };
  }, [pdfDocument, number, list]);

  return (
    <div
      role="img"
      aria-label={`Página ${number}`}
      // Unset until the page nears the screen, then busy while it draws.
      aria-busy={state === "waiting" ? undefined : state === "drawing"}
      className="relative mx-auto max-w-2xl"
    >
      <canvas
        ref={canvas}
        // A4 until the page itself says otherwise.
        className="block aspect-[210/297] w-full bg-leaf shadow-tapa"
      />
      {state === "failed" && (
        <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-ink-muted">
          No pudimos mostrar esta página.
        </p>
      )}
    </div>
  );
}
