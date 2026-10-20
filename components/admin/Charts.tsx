"use client";

import React, { useState } from "react";

// Small SVG charts for the owner dashboard, so it needs no chart library. Each one fills its box and keeps
// its own aspect ratio; hover a day to read its numbers.

export const SERIES_COLOURS = { thoughts: "#ffd91a", chat: "#7b6cff", checkins: "#ff5a5f", games: "#2fbf71" } as const;

const GRID = "rgba(127,127,127,0.18)";
const AXIS = "rgba(160,160,160,0.9)";

const shortDay = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
const niceMax = (n: number) => {
  if (n <= 5) return 5;
  const p = 10 ** Math.floor(Math.log10(n));
  return Math.ceil(n / p) * p;
};

const Empty = ({ text }: { text: string }) => (
  <div className="h-full min-h-[10rem] flex items-center justify-center font-outfit text-sm text-neutral-500">{text}</div>
);

// Stacked daily bars (activity)
export const StackedBars = ({ days, series, height = 220 }: {
  days: string[];
  series: { key: string; label: string; colour: string; values: number[] }[];
  height?: number;
}) => {
  const [hover, setHover] = useState<number | null>(null);
  const totals = days.map((_, i) => series.reduce((s, x) => s + (x.values[i] || 0), 0));
  const max = niceMax(Math.max(0, ...totals));
  if (totals.every((t) => t === 0)) return <Empty text="No activity in this period yet." />;
  const W = 640, padL = 34, padB = 22, padT = 8, H = height;
  const plotW = W - padL - 4, plotH = H - padB - padT;
  const bw = plotW / days.length;
  const y = (v: number) => padT + plotH - (v / max) * plotH;
  const ticks = [0, max / 2, max];
  return (
    <div>
      <div className="h-5 mb-1 font-outfit text-xs text-neutral-400 flex flex-wrap gap-x-4">
        {hover === null ? <span>Hover a day</span> : (
          <>
            <span className="text-neutral-200">{shortDay(days[hover])}</span>
            {series.map((s) => <span key={s.key}><i className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: s.colour }} />{s.label} {s.values[hover] || 0}</span>)}
          </>
        )}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Daily activity" onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - 4} y1={y(t)} y2={y(t)} stroke={GRID} />
            <text x={padL - 6} y={y(t) + 3} textAnchor="end" fontSize="10" fill={AXIS}>{Math.round(t)}</text>
          </g>
        ))}
        {days.map((d, i) => {
          let acc = 0;
          return (
            <g key={d} onMouseEnter={() => setHover(i)}>
              <rect x={padL + i * bw} y={padT} width={bw} height={plotH} fill={hover === i ? "rgba(127,127,127,0.12)" : "transparent"} />
              {series.map((s) => {
                const v = s.values[i] || 0;
                if (!v) return null;
                const top = y(acc + v), h = y(acc) - top;
                acc += v;
                return <rect key={s.key} x={padL + i * bw + bw * 0.16} y={top} width={bw * 0.68} height={Math.max(h, 0)} fill={s.colour} rx="1.5" />;
              })}
            </g>
          );
        })}
        {[0, Math.floor(days.length / 2), days.length - 1].map((i) => (
          <text key={i} x={padL + i * bw + bw / 2} y={H - 6} textAnchor={i === 0 ? "start" : i === days.length - 1 ? "end" : "middle"} fontSize="10" fill={AXIS}>{shortDay(days[i])}</text>
        ))}
      </svg>
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 font-outfit text-xs text-neutral-400">
        {series.map((s) => <span key={s.key}><i className="inline-block w-2.5 h-2.5 rounded-sm mr-1.5" style={{ background: s.colour }} />{s.label}</span>)}
      </div>
    </div>
  );
};

// Running total as a line over daily signups as bars
export const GrowthChart = ({ days, daily, total, height = 220 }: { days: string[]; daily: number[]; total: number[]; height?: number }) => {
  const [hover, setHover] = useState<number | null>(null);
  const W = 640, padL = 34, padB = 22, padT = 8, H = height;
  const plotW = W - padL - 6, plotH = H - padB - padT;
  const maxTotal = niceMax(Math.max(1, ...total));
  const maxDaily = Math.max(1, ...daily);
  const x = (i: number) => padL + (i + 0.5) * (plotW / days.length);
  const yT = (v: number) => padT + plotH - (v / maxTotal) * plotH;
  const bw = plotW / days.length;
  const line = total.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${yT(v).toFixed(1)}`).join(" ");
  const area = `${line} L${x(days.length - 1).toFixed(1)},${padT + plotH} L${x(0).toFixed(1)},${padT + plotH} Z`;
  return (
    <div>
      <div className="h-5 mb-1 font-outfit text-xs text-neutral-400 flex flex-wrap gap-x-4">
        {hover === null ? <span>Hover a day</span> : (
          <><span className="text-neutral-200">{shortDay(days[hover])}</span><span>{daily[hover]} joined</span><span>{total[hover]} in total</span></>
        )}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="People who have joined" onMouseLeave={() => setHover(null)}>
        {[0, maxTotal / 2, maxTotal].map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - 6} y1={yT(t)} y2={yT(t)} stroke={GRID} />
            <text x={padL - 6} y={yT(t) + 3} textAnchor="end" fontSize="10" fill={AXIS}>{Math.round(t)}</text>
          </g>
        ))}
        {daily.map((v, i) => v > 0 && <rect key={i} x={x(i) - bw * 0.3} y={padT + plotH - (v / maxDaily) * plotH * 0.35} width={bw * 0.6} height={(v / maxDaily) * plotH * 0.35} fill="#7b6cff" opacity="0.45" rx="1.5" />)}
        <path d={area} fill="#ffd91a" opacity="0.14" />
        <path d={line} fill="none" stroke="#ffd91a" strokeWidth="2.2" strokeLinejoin="round" />
        {days.map((d, i) => <rect key={d} x={x(i) - bw / 2} y={padT} width={bw} height={plotH} fill={hover === i ? "rgba(127,127,127,0.12)" : "transparent"} onMouseEnter={() => setHover(i)} />)}
        {hover !== null && <circle cx={x(hover)} cy={yT(total[hover])} r="4" fill="#ffd91a" />}
        {[0, Math.floor(days.length / 2), days.length - 1].map((i) => (
          <text key={i} x={x(i)} y={H - 6} textAnchor={i === 0 ? "start" : i === days.length - 1 ? "end" : "middle"} fontSize="10" fill={AXIS}>{shortDay(days[i])}</text>
        ))}
      </svg>
      <div className="mt-2 flex gap-5 font-outfit text-xs text-neutral-400">
        <span><i className="inline-block w-2.5 h-2.5 rounded-sm mr-1.5 bg-[#ffd91a]" />Everyone so far</span>
        <span><i className="inline-block w-2.5 h-2.5 rounded-sm mr-1.5 bg-[#7b6cff] opacity-60" />Joined that day</span>
      </div>
    </div>
  );
};

// Horizontal bars with the value and a share label (the funnel)
export const FunnelBars = ({ steps }: { steps: { label: string; value: number; colour: string }[] }) => {
  const top = Math.max(1, steps[0]?.value || 1);
  return (
    <div className="space-y-3">
      {steps.map((s, i) => (
        <div key={s.label}>
          <div className="flex justify-between font-outfit text-sm mb-1">
            <span className="text-neutral-300">{s.label}</span>
            <span className="tabular-nums text-neutral-200">{s.value}{i > 0 && <span className="text-neutral-500"> · {Math.round((s.value / top) * 100)}%</span>}</span>
          </div>
          <div className="h-3 rounded-full bg-white/5 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(s.value / top) * 100}%`, background: s.colour }} /></div>
        </div>
      ))}
    </div>
  );
};

// A donut with a centre figure and a legend
export const Donut = ({ parts, centre, caption }: { parts: { label: string; value: number; colour: string }[]; centre: string; caption: string }) => {
  const total = parts.reduce((s, p) => s + p.value, 0);
  const R = 52, C = 2 * Math.PI * R;
  let offset = 0;
  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 140 140" className="w-36 h-36 shrink-0" role="img" aria-label={caption}>
        <circle cx="70" cy="70" r={R} fill="none" stroke="rgba(127,127,127,0.18)" strokeWidth="16" />
        {total > 0 && parts.map((p) => {
          const len = (p.value / total) * C;
          const el = <circle key={p.label} cx="70" cy="70" r={R} fill="none" stroke={p.colour} strokeWidth="16" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset} transform="rotate(-90 70 70)" />;
          offset += len;
          return el;
        })}
        <text x="70" y="68" textAnchor="middle" fontSize="26" fontWeight="700" fill="currentColor" className="font-bebas">{centre}</text>
        <text x="70" y="86" textAnchor="middle" fontSize="9" fill={AXIS}>{caption}</text>
      </svg>
      <ul className="space-y-2 font-outfit text-sm">
        {parts.map((p) => (
          <li key={p.label} className="flex items-center gap-2 text-neutral-300">
            <i className="w-2.5 h-2.5 rounded-sm" style={{ background: p.colour }} />{p.label}<span className="ml-auto pl-4 tabular-nums text-neutral-100">{p.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

// Who does more: a bar split between two people
export const SplitBar = ({ a, b, labelA, labelB }: { a: number; b: number; labelA: string; labelB: string }) => {
  const total = a + b;
  const share = total === 0 ? 0.5 : a / total;
  return (
    <div title={`${labelA} ${a} · ${labelB} ${b}`}>
      <div className="h-2 rounded-full bg-white/10 overflow-hidden flex">
        {total > 0 && <><div style={{ width: `${share * 100}%`, background: "#ffd91a" }} /><div style={{ width: `${(1 - share) * 100}%`, background: "#7b6cff" }} /></>}
      </div>
    </div>
  );
};
