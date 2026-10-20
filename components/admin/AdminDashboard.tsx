"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signInWithPopup, signOut, type User as FirebaseUser } from "firebase/auth";
import { ChevronDown, ChevronRight, RefreshCw, Search } from "lucide-react";
import { auth, googleProvider } from "@/lib/firebase";
import type { AdminCouple, AdminPerson, AdminStats } from "@/lib/adminData";
import type { ActivityStatus } from "@/lib/adminMetrics";
import { Donut, FunnelBars, GrowthChart, SERIES_COLOURS, SplitBar, StackedBars } from "./Charts";

const STATUS: Record<ActivityStatus, { label: string; colour: string }> = {
  active: { label: "Active", colour: "#2fbf71" },
  idle: { label: "Idle", colour: "#ffd91a" },
  dormant: { label: "Dormant", colour: "#ff5a5f" },
  never: { label: "No activity", colour: "#8a8a8a" },
};

const A_COLOUR = "#ffd91a";
const B_COLOUR = "#7b6cff";

const ago = (ms: number | null): string => {
  if (ms === null) return "never";
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (s < 90) return "just now";
  const m = Math.round(s / 60);
  if (m < 90) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 36) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 60) return `${d}d ago`;
  return `${Math.round(d / 30)}mo ago`;
};
const dateOf = (ms: number | null) => (ms === null ? "–" : new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }));
const first = (name?: string) => (name || "").trim().split(" ")[0] || "?";

const card = "rounded-[1.5rem] bg-[#151515] border border-[#262626] p-5";
const h3 = "font-bebas text-xl tracking-widest uppercase text-neutral-100";

const Kpi = ({ label, value, sub, colour }: { label: string; value: number | string; sub?: string; colour?: string }) => (
  <div className={`${card} flex flex-col gap-1.5`}>
    <span className="font-bebas text-[11px] tracking-[0.25em] uppercase text-neutral-400">{label}</span>
    <span className="font-bebas text-5xl leading-none tabular-nums" style={colour ? { color: colour } : undefined}>{value}</span>
    {sub && <span className="font-outfit text-xs text-neutral-500">{sub}</span>}
  </div>
);

const StatusPill = ({ status }: { status: ActivityStatus }) => (
  <span className="inline-flex items-center gap-1.5 font-outfit text-xs text-neutral-200">
    <i className="w-2 h-2 rounded-full" style={{ background: STATUS[status].colour }} />{STATUS[status].label}
  </span>
);

type SortKey = "last" | "joined" | "streak" | "thoughts" | "chat" | "checkins" | "games" | "total";

const CouplesTable = ({ couples, query, statusFilter }: { couples: AdminCouple[]; query: string; statusFilter: ActivityStatus | "all" }) => {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "last", dir: -1 });
  const [open, setOpen] = useState<string | null>(null);
  const value = (c: AdminCouple, k: SortKey): number => ({
    last: c.lastActivityAt ?? 0, joined: c.createdAt ?? 0, streak: c.streak, thoughts: c.thoughts.total,
    chat: c.chat.total, checkins: c.checkins.total, games: c.games, total: c.total,
  }[k]);
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return couples
      .filter((c) => statusFilter === "all" || c.status === statusFilter)
      .filter((c) => !q || c.partners.some((p) => p && (p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q))))
      .sort((x, y) => (value(x, sort.key) - value(y, sort.key)) * sort.dir);
  }, [couples, query, statusFilter, sort]);

  const th = (key: SortKey, label: string, right = true) => (
    <th className={`px-3 py-3 font-bebas text-[11px] tracking-[0.2em] uppercase text-neutral-400 ${right ? "text-right" : "text-left"}`}>
      <button type="button" onClick={() => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : -1 }))} className="hover:text-white">
        {label}{sort.key === key ? (sort.dir === 1 ? " ↑" : " ↓") : ""}
      </button>
    </th>
  );

  if (couples.length === 0) return <p className="font-outfit text-sm text-neutral-500 py-8 text-center">No couples yet.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[920px] border-collapse">
        <thead>
          <tr className="border-b border-[#262626]">
            <th className="w-8" />
            <th className="px-3 py-3 text-left font-bebas text-[11px] tracking-[0.2em] uppercase text-neutral-400">Couple</th>
            <th className="px-3 py-3 text-left font-bebas text-[11px] tracking-[0.2em] uppercase text-neutral-400">Status</th>
            {th("joined", "Paired")}{th("last", "Last activity")}{th("streak", "Streak")}{th("thoughts", "Thoughts")}
            {th("chat", "Chat")}{th("checkins", "Check-ins")}{th("games", "Games")}{th("total", "Total")}
            <th className="px-3 py-3 w-28 text-left font-bebas text-[11px] tracking-[0.2em] uppercase text-neutral-400">Who does more</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => {
            const [a, b] = c.partners;
            const isOpen = open === c.id;
            return (
              <React.Fragment key={c.id}>
                <tr className="border-b border-[#1f1f1f] hover:bg-white/[0.03] cursor-pointer" onClick={() => setOpen(isOpen ? null : c.id)}>
                  <td className="pl-3 text-neutral-500">{isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</td>
                  <td className="px-3 py-3 font-outfit text-sm">
                    <span style={{ color: A_COLOUR }}>{first(a?.name)}</span> <span className="text-neutral-500">&</span> <span style={{ color: "#a99dff" }}>{first(b?.name)}</span>
                  </td>
                  <td className="px-3 py-3"><StatusPill status={c.status} /></td>
                  <td className="px-3 py-3 text-right font-outfit text-sm text-neutral-300">{dateOf(c.createdAt)}</td>
                  <td className="px-3 py-3 text-right font-outfit text-sm text-neutral-300" title={c.lastActivityAt ? new Date(c.lastActivityAt).toLocaleString() : ""}>{ago(c.lastActivityAt)}</td>
                  <td className="px-3 py-3 text-right font-outfit text-sm tabular-nums">{c.streak}</td>
                  <td className="px-3 py-3 text-right font-outfit text-sm tabular-nums">{c.thoughts.total}</td>
                  <td className="px-3 py-3 text-right font-outfit text-sm tabular-nums">{c.chat.total}</td>
                  <td className="px-3 py-3 text-right font-outfit text-sm tabular-nums">{c.checkins.total}</td>
                  <td className="px-3 py-3 text-right font-outfit text-sm tabular-nums">{c.games}</td>
                  <td className="px-3 py-3 text-right font-outfit text-sm tabular-nums font-semibold">{c.total}</td>
                  <td className="px-3 py-3 w-28"><SplitBar a={c.thoughts.a + c.chat.a + c.checkins.a + c.reactions.a} b={c.thoughts.b + c.chat.b + c.checkins.b + c.reactions.b} labelA={first(a?.name)} labelB={first(b?.name)} /></td>
                </tr>
                {isOpen && (
                  <tr className="border-b border-[#1f1f1f] bg-white/[0.02]">
                    <td />
                    <td colSpan={11} className="px-3 py-5"><CoupleDetail couple={c} /></td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
          {rows.length === 0 && <tr><td colSpan={12} className="py-8 text-center font-outfit text-sm text-neutral-500">Nothing matches.</td></tr>}
        </tbody>
      </table>
    </div>
  );
};

const CoupleDetail = ({ couple }: { couple: AdminCouple }) => {
  const [a, b] = couple.partners;
  const rows: [string, { a: number; b: number }][] = [
    ["Thoughts sent", couple.thoughts], ["Chat messages", couple.chat], ["Check-ins", couple.checkins], ["Quick reactions", couple.reactions],
  ];
  const person = (p: AdminPerson | null, colour: string) => (
    <div className="space-y-1 font-outfit text-sm">
      <p className="font-semibold" style={{ color: colour }}>{p?.name || "Unknown"}</p>
      <p className="text-neutral-400 break-all">{p?.email || "no email"}</p>
      <p className="text-neutral-500">Joined {dateOf(p?.joinedAt ?? null)}</p>
      <p className="text-neutral-500">Last seen {ago(p?.lastActiveAt ?? null)}</p>
      <p className="text-neutral-500">Mood {p?.mood || "–"}</p>
    </div>
  );
  return (
    <div className="grid gap-8 md:grid-cols-[1fr_1fr_1.6fr]">
      {person(a, A_COLOUR)}
      {person(b, "#a99dff")}
      <div className="space-y-3">
        {rows.map(([label, s]) => (
          <div key={label}>
            <div className="flex justify-between font-outfit text-xs text-neutral-400 mb-1">
              <span>{label}</span>
              <span className="tabular-nums"><span style={{ color: A_COLOUR }}>{first(a?.name)} {s.a}</span> · <span style={{ color: "#a99dff" }}>{first(b?.name)} {s.b}</span></span>
            </div>
            <SplitBar a={s.a} b={s.b} labelA={first(a?.name)} labelB={first(b?.name)} />
          </div>
        ))}
        <p className="font-outfit text-xs text-neutral-500 pt-1">Games finished {couple.games} · Safe Space sessions {couple.safeSpace} · Bucket list items {couple.bucket}</p>
      </div>
    </div>
  );
};

const PeopleTable = ({ people, query, statusFilter }: { people: AdminPerson[]; query: string; statusFilter: ActivityStatus | "all" }) => {
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return people
      .filter((p) => statusFilter === "all" || p.status === statusFilter)
      .filter((p) => !q || p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q));
  }, [people, query, statusFilter]);
  const th = "px-3 py-3 text-left font-bebas text-[11px] tracking-[0.2em] uppercase text-neutral-400";
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] border-collapse">
        <thead><tr className="border-b border-[#262626]"><th className={th}>Name</th><th className={th}>Email</th><th className={th}>Joined</th><th className={th}>Last active</th><th className={th}>Status</th><th className={th}>Where they are</th></tr></thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.uid} className="border-b border-[#1f1f1f] hover:bg-white/[0.03]">
              <td className="px-3 py-3 font-outfit text-sm">{p.name}</td>
              <td className="px-3 py-3 font-outfit text-sm text-neutral-400">{p.email || "–"}</td>
              <td className="px-3 py-3 font-outfit text-sm text-neutral-300">{dateOf(p.joinedAt)}</td>
              <td className="px-3 py-3 font-outfit text-sm text-neutral-300" title={p.lastActiveAt ? new Date(p.lastActiveAt).toLocaleString() : ""}>{ago(p.lastActiveAt)}</td>
              <td className="px-3 py-3"><StatusPill status={p.status} /></td>
              <td className="px-3 py-3 font-outfit text-sm text-neutral-300">{p.coupleId ? "Paired" : p.onboarded ? "Single, not paired yet" : "Still setting up"}</td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={6} className="py-8 text-center font-outfit text-sm text-neutral-500">Nothing matches.</td></tr>}
        </tbody>
      </table>
    </div>
  );
};

export const AdminDashboard = () => {
  const [user, setUser] = useState<FirebaseUser | null | "loading">("loading");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"couples" | "people">("couples");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ActivityStatus | "all">("all");

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  const load = useCallback(async (fresh = false) => {
    if (!auth.currentUser) return;
    setBusy(true); setError("");
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`/api/admin/stats${fresh ? "?fresh=1" : ""}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Couldn't load the numbers.");
      setStats(body as AdminStats);
    } catch (e) {
      setStats(null);
      setError((e as Error).message);
    } finally { setBusy(false); }
  }, []);

  useEffect(() => { if (user && user !== "loading") load(); }, [user, load]);

  const signIn = async () => {
    setError("");
    try { await signInWithPopup(auth, googleProvider); } catch { setError("Sign-in didn't finish. Try again."); }
  };

  const shell = "min-h-screen bg-[#0e0e0e] text-[#fafafa] font-outfit";

  if (user === "loading") return <div className={`${shell} flex items-center justify-center text-neutral-500`}>Loading…</div>;

  if (!user) {
    return (
      <div className={`${shell} flex items-center justify-center p-6`}>
        <div className="max-w-sm w-full text-center space-y-5">
          <h1 className="font-bebas text-4xl tracking-widest uppercase">Owner view</h1>
          <p className="text-sm text-neutral-400">Only the owners of Honest Mailbox can see this.</p>
          <button type="button" onClick={signIn} className="w-full h-12 rounded-2xl bg-white text-black font-bebas tracking-widest uppercase hover:bg-neutral-200 active:scale-95 transition-all">Sign in with Google</button>
          {error && <p role="alert" className="text-sm text-rose-400">{error}</p>}
        </div>
      </div>
    );
  }

  const t = stats?.totals;
  const sel = "h-10 px-3 rounded-xl bg-[#151515] border border-[#262626] text-sm text-neutral-200 focus:outline-none focus:border-white/30";

  return (
    <div className={shell}>
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-8 space-y-6">
        <header className="flex flex-wrap items-center gap-4">
          <div className="mr-auto">
            <h1 className="font-bebas text-4xl tracking-widest uppercase leading-none">Owner view</h1>
            <p className="text-xs text-neutral-500 mt-1.5">{stats ? `Numbers from ${new Date(stats.generatedAt).toLocaleString()} · days in ${stats.tz}` : "Honest Mailbox"} · Counts only, never anyone&apos;s messages</p>
          </div>
          <span className="text-xs text-neutral-500">{user.email}</span>
          <button type="button" onClick={() => load(true)} disabled={busy} className="h-10 px-4 rounded-xl bg-[#151515] border border-[#262626] flex items-center gap-2 text-sm hover:bg-[#1c1c1c] disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${busy ? "animate-spin" : ""}`} /> Refresh
          </button>
          <button type="button" onClick={() => signOut(auth)} className="h-10 px-4 rounded-xl text-sm text-neutral-400 hover:text-white">Sign out</button>
        </header>

        {error && <div role="alert" className={`${card} text-sm text-rose-300`}>{error}</div>}
        {busy && !stats && <div className={`${card} text-sm text-neutral-400`}>Gathering the numbers…</div>}

        {stats && t && (
          <>
            <section className="grid gap-4 grid-cols-2 md:grid-cols-4 xl:grid-cols-6">
              <Kpi label="People" value={t.users} sub={`${t.newUsers7d} new this week · ${t.newUsers30d} this month`} />
              <Kpi label="Couples" value={t.couples} sub={`${t.singles} single, waiting for a partner`} />
              <Kpi label="Active couples" value={t.activeCouples7d} colour={STATUS.active.colour} sub="Active in the last 7 days" />
              <Kpi label="Active today" value={t.activeUsers1d} sub={`${t.activeUsers7d} this week · ${t.activeUsers30d} this month`} />
              <Kpi label="Dormant couples" value={t.dormantCouples} colour={t.dormantCouples ? STATUS.dormant.colour : undefined} sub="Nothing for over 30 days" />
              <Kpi label="Still setting up" value={t.notOnboarded} sub="Signed in, haven't finished" />
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <div className={card}><h3 className={`${h3} mb-3`}>People joining · last 90 days</h3><GrowthChart days={stats.signups.days} daily={stats.signups.daily} total={stats.signups.total} /></div>
              <div className={card}>
                <h3 className={`${h3} mb-3`}>What couples do · last 30 days</h3>
                <StackedBars days={stats.activity.days} series={[
                  { key: "thoughts", label: "Thoughts", colour: SERIES_COLOURS.thoughts, values: stats.activity.thoughts },
                  { key: "chat", label: "Chat", colour: SERIES_COLOURS.chat, values: stats.activity.chat },
                  { key: "checkins", label: "Check-ins", colour: SERIES_COLOURS.checkins, values: stats.activity.checkins },
                  { key: "games", label: "Games", colour: SERIES_COLOURS.games, values: stats.activity.games },
                ]} />
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <div className={card}>
                <h3 className={`${h3} mb-4`}>From signing up to coming back</h3>
                <FunnelBars steps={[
                  { label: "Signed in", value: t.users, colour: "#7b6cff" },
                  { label: "Finished setting up", value: t.onboarded, colour: "#5a8cff" },
                  { label: "Paired with a partner", value: t.paired, colour: "#ffd91a" },
                  { label: "Active in the last 7 days", value: t.activeUsers7d, colour: "#2fbf71" },
                ]} />
              </div>
              <div className={card}>
                <h3 className={`${h3} mb-4`}>How couples are doing</h3>
                <Donut caption="couples" centre={String(t.couples)} parts={(["active", "idle", "dormant", "never"] as ActivityStatus[]).map((s) => ({ label: `${STATUS[s].label}${s === "active" ? " (7d)" : s === "idle" ? " (8–30d)" : s === "dormant" ? " (30d+)" : ""}`, value: stats.statusCounts[s], colour: STATUS[s].colour }))} />
              </div>
            </section>

            <section className={card}>
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <div role="tablist" className="flex rounded-xl bg-[#0e0e0e] border border-[#262626] p-1 mr-auto">
                  {([["couples", `Couples (${stats.couples.length})`], ["people", `People (${stats.people.length})`]] as const).map(([k, label]) => (
                    <button key={k} role="tab" aria-selected={tab === k} type="button" onClick={() => setTab(k)} className={`px-4 h-8 rounded-lg text-sm ${tab === k ? "bg-white text-black" : "text-neutral-400 hover:text-white"}`}>{label}</button>
                  ))}
                </div>
                <label className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-neutral-500" />
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or email" className={`${sel} pl-9 w-64`} />
                </label>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ActivityStatus | "all")} className={sel} aria-label="Filter by status">
                  <option value="all">Every status</option>
                  {(Object.keys(STATUS) as ActivityStatus[]).map((s) => <option key={s} value={s}>{STATUS[s].label}</option>)}
                </select>
              </div>
              {tab === "couples"
                ? <CouplesTable couples={stats.couples} query={query} statusFilter={statusFilter} />
                : <PeopleTable people={stats.people} query={query} statusFilter={statusFilter} />}
            </section>
          </>
        )}
      </div>
    </div>
  );
};
