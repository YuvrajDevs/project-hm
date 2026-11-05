// Reading a finished game back (Past Games). Pure, shared by the website and the app.
import type { CoupleGame } from "../types.ts";
import { DECK_BY_ID } from "./decks.ts";
import { getCard, roundKey, totalScores, truthDarePlayer } from "./engine.ts";
import { aboutQuestion, guessOf, rightGuesses } from "./about.ts";

/** One line under a past game in the list */
export function pastGameSummary(g: CoupleGame, uid: string, partnerUid: string, partnerName: string): string {
  const mechanic = DECK_BY_ID[g.deck]?.mechanic;
  if (mechanic === "open") return `${g.cards.length} questions`;
  if (mechanic === "about") return `Guessed ${rightGuesses(g, uid, partnerUid)} of ${g.cards.length} · ${partnerName} ${rightGuesses(g, partnerUid, uid)}`;
  if (mechanic === "xo" || mechanic === "connect4") {
    const w = g.wins ?? {};
    return `Rounds won: you ${w[uid] ?? 0} · ${partnerName} ${w[partnerUid] ?? 0}`;
  }
  if (mechanic === "scribble") {
    const solved = g.cards.filter((_, r) => g.sb?.[roundKey(r)]?.result === "solved").length;
    return `Guessed ${solved} of ${g.cards.length}`;
  }
  if (mechanic === "choice" || mechanic === "who") {
    const matches = g.cards.filter((_, r) => {
      const a = g.answers?.[roundKey(r)] || {};
      return !!a[uid]?.pick && a[uid]?.pick === a[partnerUid]?.pick;
    }).length;
    return `In sync on ${matches} of ${g.cards.length}`;
  }
  const s = totalScores(g, [uid, partnerUid]);
  return `You ${s[uid]} · ${partnerName} ${s[partnerUid]}`;
}

export interface ReplayLine { who: "you" | "them"; label: string; text: string; mark?: "right" | "wrong" }
export interface ReplayItem { key: string; title: string; lines: ReplayLine[]; hadPhoto: boolean }

/**
 * Every card of a finished game with what each person said, ready to print. Board games have no cards (the summary
 * line is all there is), so they return an empty list.
 */
export function replayItems(game: CoupleGame, uid: string, partnerUid: string, partnerName: string): ReplayItem[] {
  const mechanic = DECK_BY_ID[game.deck]?.mechanic;
  const nameOf = (id?: string) => (id === uid ? "You" : partnerName);
  const whoOf = (id?: string): "you" | "them" => (id === uid ? "you" : "them");
  if (!mechanic || mechanic === "xo" || mechanic === "connect4") return [];

  if (mechanic === "about") {
    return [uid, partnerUid].flatMap((owner) => game.cards.map((_, r) => {
      const guesser = owner === uid ? partnerUid : uid;
      const c = aboutQuestion(game, owner, r);
      const pick = game.answers?.[roundKey(r)]?.[owner]?.pick;
      const guess = guessOf(game, r, guesser);
      const opt = (k?: string) => (k === undefined ? "" : c.opts[Number(k)] ?? "");
      return {
        key: `${owner}-${r}`,
        title: c.q,
        hadPhoto: false,
        lines: [
          { who: whoOf(owner), label: `${nameOf(owner)} picked`, text: opt(pick) },
          { who: whoOf(guesser), label: `${nameOf(guesser)} guessed`, text: opt(guess), mark: guess === undefined ? undefined : guess === pick ? "right" : "wrong" },
        ],
      } satisfies ReplayItem;
    }));
  }

  const items: ReplayItem[] = [];
  game.cards.forEach((_, r) => {
    const card = getCard(game, r);
    if (!card) return;
    const answers = game.answers?.[roundKey(r)] || {};
    const line = (who: "you" | "them", text: string): ReplayLine => ({ who, label: who === "you" ? "You" : partnerName, text });
    let title = "";
    let lines: ReplayLine[] = [];
    let hadPhoto = false;
    if (card.kind === "choice") {
      title = card.prompt ?? `${card.a} or ${card.b}`;
      const label = (k?: string) => (k === "a" ? card.a : k === "b" ? card.b : "");
      lines = [line("them", label(answers[partnerUid]?.pick)), line("you", label(answers[uid]?.pick))];
    } else if (card.kind === "who") {
      title = card.prompt;
      lines = [line("them", nameOf(answers[partnerUid]?.pick)), line("you", nameOf(answers[uid]?.pick))];
    } else if (card.kind === "open") {
      title = card.text;
      lines = [line("them", answers[partnerUid]?.text || ""), line("you", answers[uid]?.text || "")];
    } else if (card.kind === "draw") {
      title = card.word;
      const result = game.sb?.[roundKey(r)]?.result;
      lines = [line(whoOf(truthDarePlayer(game, r)), `Drew it · ${result === "solved" ? "guessed" : "skipped"}`)];
    } else if (card.kind === "truthdare") {
      const td = game.td?.[roundKey(r)];
      const by = whoOf(truthDarePlayer(game, r));
      title = td?.choice === "dare" ? card.dare : card.truth;
      lines = [line(by, `${td?.choice === "dare" ? "Dare" : "Truth"}, ${td?.result === "done" ? "done" : "skipped"}`), line(by, td?.answer ? `“${td.answer}”` : "")];
      hadPhoto = !!(td?.proof || td?.proofRemoved);
    } else {
      return;
    }
    items.push({ key: String(r), title, lines: lines.filter((l) => l.text), hadPhoto });
  });
  return items;
}
