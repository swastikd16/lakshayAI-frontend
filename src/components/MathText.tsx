import { useEffect, useMemo, useRef } from "react";

type MathTextProps = {
  text?: string | null;
  className?: string;
  as?: "span" | "p" | "div" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
};

declare global {
  interface Window {
    MathJax?: {
      [key: string]: unknown;
      typesetPromise?: (elements?: HTMLElement[]) => Promise<void>;
    };
    __lakshayMathJaxLoader?: Promise<void>;
  }
}

const MATHJAX_SRC = "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js";

function ensureMathJax() {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (window.MathJax?.typesetPromise) {
    return Promise.resolve();
  }

  if (window.__lakshayMathJaxLoader) {
    return window.__lakshayMathJaxLoader;
  }

  window.MathJax = {
    ...window.MathJax,
    tex: {
      inlineMath: [["$", "$"], ["\\(", "\\)"]],
      displayMath: [["$$", "$$"], ["\\[", "\\]"]],
      processEscapes: true
    },
    options: {
      skipHtmlTags: ["script", "noscript", "style", "textarea", "pre", "code"]
    },
    chtml: {
      scale: 1
    }
  };

  window.__lakshayMathJaxLoader = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-mathjax="lakshay"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("MathJax failed to load.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = MATHJAX_SRC;
    script.async = true;
    script.dataset.mathjax = "lakshay";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("MathJax failed to load."));
    document.head.appendChild(script);
  });

  return window.__lakshayMathJaxLoader;
}

export default function MathText({ text, className, as = "span" }: MathTextProps) {
  const content = useMemo(() => String(text ?? ""), [text]);
  const rootRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!content || typeof window === "undefined") {
      return;
    }

    let active = true;

    void ensureMathJax()
      .then(() => {
        if (!active || !rootRef.current || !window.MathJax?.typesetPromise) {
          return;
        }
        return window.MathJax.typesetPromise([rootRef.current]);
      })
      .catch(() => {
        // Keep plain-text fallback if MathJax is unavailable.
      });

    return () => {
      active = false;
    };
  }, [content]);

  const Tag = as;

  return (
    <Tag ref={rootRef as never} className={className}>
      {content}
    </Tag>
  );
}
