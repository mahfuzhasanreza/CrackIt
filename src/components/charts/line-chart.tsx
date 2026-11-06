"use client";

import { useEffect, useRef, useState } from "react";

import { formatDuration } from "@/lib/dates";
import { seriesVars } from "@/lib/palette";

export type LinePoint = { key: string; label: string; value: number | null };

/** Value formats a line chart can show (functions can't cross the server/client boundary). */
export type LineFormat = "duration" | "rating";

const HEIGHT = 180;
const PAD = { top: 12, right: 12, bottom: 24, left: 36 };
/** Room per x-axis label, so the count adapts to the chart's width. */
const LABEL_PX = 64;
const HOUR = 3_600_000;

function fmt(v: number, kind: LineFormat) {
  return kind === "duration" ? formatDuration(v) : `${v.toFixed(1)} / 5`;
}

function axis(points: LinePoint[], kind: LineFormat) {
  if (kind === "rating") {
    return { min: 1, max: 5, ticks: [1, 2, 3, 4, 5].map((v) => ({ value: v, label: String(v) })) };
  }
  const maxH = Math.max(1, ...points.map((p) => (p.value ?? 0) / HOUR));
  const step = maxH <= 4 ? 1 : maxH <= 10 ? 2 : 4;
  const top = Math.ceil(maxH / step) * step;
  return {
    min: 0,
    max: top * HOUR,
    ticks: Array.from({ length: top / step + 1 }, (_, i) => ({
      value: i * step * HOUR,
      label: `${i * step}h`,
    })),
  };
}

/**
 * Single-series line (2px, round joins) on one axis, with gaps where there is no data.
 * A crosshair snaps to the nearest point on hover; arrow keys move it when focused.
 * An optional reference line (e.g. the average) is a labeled hairline.
 */
export function LineChart({
  points,
  format,
  color,
  name,
  reference,
}: {
  points: LinePoint[];
  format: LineFormat;
  color: { light: string; dark: string };
  /** Accessible name, e.g. "Sleep per night". */
  name: string;
  reference?: { value: number; label: string };
}) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e!.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { min, max, ticks } = axis(points, format);
  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const x = (i: number) =>
    PAD.left + (points.length <= 1 ? plotW / 2 : (i / (points.length - 1)) * plotW);
  const y = (v: number) => PAD.top + plotH - ((v - min) / (max - min)) * plotH;

  // Path with a break wherever a value is missing.
  let d = "";
  points.forEach((p, i) => {
    if (p.value === null) return;
    const prev = points[i - 1];
    d += `${!prev || prev.value === null ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`;
  });
  // A point with no neighbours wouldn't show as a line: give it a marker.
  const isolated = points
    .map((p, i) => ({ p, i }))
    .filter(
      ({ p, i }) =>
        p.value !== null &&
        (points[i - 1]?.value ?? null) === null &&
        (points[i + 1]?.value ?? null) === null,
    );
  const lastIdx = points.findLastIndex((p) => p.value !== null);
  const maxLabels = Math.max(2, Math.floor(plotW / LABEL_PX));
  const every = Math.ceil(points.length / maxLabels);

  const nearest = (clientX: number) => {
    const rect = box.current!.getBoundingClientRect();
    const rel = clientX - rect.left - PAD.left;
    const i = Math.round((rel / Math.max(1, plotW)) * (points.length - 1));
    return Math.max(0, Math.min(points.length - 1, i));
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const cur = active ?? lastIdx;
    setActive(Math.max(0, Math.min(points.length - 1, cur + (e.key === "ArrowLeft" ? -1 : 1))));
  };

  const hovered = active !== null ? points[active] : null;
  const summary = hovered
    ? `${hovered.label}: ${hovered.value === null ? "no data" : fmt(hovered.value, format)}`
    : "";

  return (
    <div
      ref={box}
      className="relative w-full touch-pan-y outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring"
      style={{ ...seriesVars(color.light, color.dark), height: HEIGHT }}
      tabIndex={0}
      role="group"
      aria-label={`${name}. Use the left and right arrow keys to read values.`}
      onPointerMove={(e) => setActive(nearest(e.clientX))}
      onPointerLeave={() => setActive(null)}
      onFocus={() => setActive((a) => a ?? (lastIdx >= 0 ? lastIdx : 0))}
      onBlur={() => setActive(null)}
      onKeyDown={onKey}
    >
      {width > 0 && (
        <svg width={width} height={HEIGHT} aria-hidden className="overflow-visible">
          {ticks.map((t) => (
            <g key={t.value}>
              <line
                x1={PAD.left}
                x2={width - PAD.right}
                y1={y(t.value)}
                y2={y(t.value)}
                className="stroke-border"
                strokeWidth={1}
              />
              <text
                x={PAD.left - 6}
                y={y(t.value)}
                dy="0.32em"
                textAnchor="end"
                className="fill-muted-foreground text-[11px] tabular-nums"
              >
                {t.label}
              </text>
            </g>
          ))}
          {points.map((p, i) =>
            (points.length - 1 - i) % every === 0 ? (
              <text
                key={p.key}
                x={x(i)}
                y={HEIGHT - 6}
                textAnchor="middle"
                className="fill-muted-foreground text-[11px]"
              >
                {p.label}
              </text>
            ) : null,
          )}
          {reference && (
            <g>
              <line
                x1={PAD.left}
                x2={width - PAD.right}
                y1={y(reference.value)}
                y2={y(reference.value)}
                className="stroke-muted-foreground"
                strokeWidth={1}
                strokeOpacity={0.6}
              />
              <text
                x={width - PAD.right}
                y={y(reference.value) - 4}
                textAnchor="end"
                // A halo in the card color keeps the label legible where the line crosses it.
                paintOrder="stroke"
                strokeWidth={4}
                strokeLinejoin="round"
                className="fill-muted-foreground stroke-card text-[11px]"
              >
                {reference.label}
              </text>
            </g>
          )}
          <path
            d={d}
            fill="none"
            className="stroke-series"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {isolated.map(({ p, i }) => (
            <circle
              key={p.key}
              cx={x(i)}
              cy={y(p.value!)}
              r={4}
              className="fill-series stroke-card"
              strokeWidth={2}
            />
          ))}
          {active !== null && (
            <g>
              <line
                x1={x(active)}
                x2={x(active)}
                y1={PAD.top}
                y2={PAD.top + plotH}
                className="stroke-muted-foreground"
                strokeWidth={1}
              />
              {hovered?.value != null && (
                <circle
                  cx={x(active)}
                  cy={y(hovered.value)}
                  r={4.5}
                  className="fill-series stroke-card"
                  strokeWidth={2}
                />
              )}
            </g>
          )}
        </svg>
      )}
      {hovered && (
        <div
          aria-hidden
          className="pointer-events-none absolute top-0 z-10 rounded-md bg-foreground px-3 py-1.5 text-xs whitespace-nowrap text-background"
          style={{
            left: Math.min(Math.max(0, x(active!) - 60), Math.max(0, width - 140)),
          }}
        >
          <p className="font-medium">{hovered.label}</p>
          <p className="flex items-center gap-2">
            <span className="h-0.5 w-3 rounded-full bg-series" />
            <span className="font-semibold tabular-nums">
              {hovered.value === null ? "No data" : fmt(hovered.value, format)}
            </span>
          </p>
        </div>
      )}
      <span className="sr-only" aria-live="polite">
        {summary}
      </span>
    </div>
  );
}
