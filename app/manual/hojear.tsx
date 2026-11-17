import {
  getDocument,
  GlobalWorkerOptions,
  type PDFDocumentProxy,
  type PDFPageProxy,
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
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scroll area must take focus to scroll by keyboard.
      tabIndex={0}
      aria-label="Páginas"
      className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6"
    >
      {Array.from({ length: pdfDocument.numPages }, (_, index) => (
        <li key={index}>
          <Page pdfDocument={pdfDocument} number={index + 1} />
        </li>
      ))}
    </ol>
  );
}

interface PageProps {
  pdfDocument: PDFDocumentProxy;
  number: number;
}

function Page({ pdfDocument, number }: PageProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<
    "waiting" | "drawing" | "drawn" | "failed"
  >("waiting");

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    let page: PDFPageProxy | undefined;
    let render: RenderTask | undefined;
    // Bumped whenever a draw is called off (scrolled away, preview closed), so its late steps do nothing.
    let generation = 0;

    const draw = async () => {
      const mine = ++generation;
      setState("drawing");
      try {
        page = await pdfDocument.getPage(number);
        if (mine !== generation) return;
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
        await render.promise;
        if (mine === generation) setState("drawn");
      } catch {
        if (mine === generation) setState("failed");
      }
    };
    // A phone can't hold every page of a long Manual: a page far off-screen gives its canvas memory back.
    const free = () => {
      generation++;
      render?.cancel();
      page?.cleanup();
      element.width = 0;
      element.height = 0;
      setState("waiting");
    };

    // The list scrolls, not the window, so it is the root: a page starts drawing before it shows.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) void draw();
        else free();
      },
      { root: element.closest("ol"), rootMargin: "150% 0px" },
    );
    observer.observe(element);
    return () => {
      generation++;
      observer.disconnect();
      render?.cancel();
    };
  }, [pdfDocument, number]);

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
