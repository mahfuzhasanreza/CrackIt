import type { ComponentProps } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

/**
 * Renders user markdown (GitHub flavoured). Raw HTML is NOT rendered (react-markdown's
 * default), and react-markdown drops unsafe URLs such as `javascript:`, so notes can't inject
 * script. Works in Server and Client Components.
 */
const components: Components = {
  h1: (p) => <h3 className="mt-4 mb-2 text-lg font-semibold first:mt-0" {...p} />,
  h2: (p) => <h4 className="mt-4 mb-2 text-base font-semibold first:mt-0" {...p} />,
  h3: (p) => <h5 className="mt-3 mb-1.5 font-semibold first:mt-0" {...p} />,
  h4: (p) => <h6 className="mt-3 mb-1.5 font-medium first:mt-0" {...p} />,
  p: (p) => <p className="my-2 leading-relaxed first:mt-0 last:mb-0" {...p} />,
  a: ({ href, ...p }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="font-medium underline underline-offset-4"
      {...p}
    />
  ),
  ul: (p) => <ul className="my-2 list-disc pl-6 [&_ul]:my-1" {...p} />,
  ol: (p) => <ol className="my-2 list-decimal pl-6 [&_ol]:my-1" {...p} />,
  li: (p) => <li className="my-0.5" {...p} />,
  blockquote: (p) => (
    <blockquote className="my-2 border-l-2 pl-3 text-muted-foreground italic" {...p} />
  ),
  hr: () => <hr className="my-4" />,
  pre: (p) => (
    <pre
      className="my-3 overflow-x-auto rounded-md bg-muted p-3 font-mono text-[0.8125rem] leading-relaxed [&_code]:bg-transparent [&_code]:p-0"
      {...p}
    />
  ),
  code: (p) => <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]" {...p} />,
  table: (p) => (
    <div className="my-3 overflow-x-auto">
      <table className="w-full border-collapse text-sm" {...p} />
    </div>
  ),
  th: (p) => <th className="border px-2 py-1 text-left font-medium" {...p} />,
  td: (p) => <td className="border px-2 py-1 align-top" {...p} />,
  input: (p) => <input {...p} disabled className="mr-1.5 align-middle" />,
};

export function Markdown({
  children,
  className,
}: {
  children: string;
  className?: ComponentProps<"div">["className"];
}) {
  return (
    <div className={cn("text-sm break-words", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
