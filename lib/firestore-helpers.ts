import { 
  collection, 
  doc, 
  getDoc,
  query, 
  orderBy, 
  where,
  onSnapshot, 
  addDoc, 
  setDoc,
  updateDoc, 
  deleteDoc,
  getDocs,
  arrayUnion,
  Timestamp,
  writeBatch,
  runTransaction,
  DocumentReference,
  DocumentData,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  SnapshotOptions,
  limit,
  limitToLast,
  increment,
  arrayRemove,
  serverTimestamp
} from "firebase/firestore";
import { db, auth } from "./firebase";
import { 
  SafeSpaceMessage,
  EmotionalProfile,
  CoupleEvent,
  MailboxMessage,
  DailyCheckIn,
  QuickReact,
  SafeSpaceSession,
  PartnerNote,
  AppNotification,
  CoupleGame,
  GameAnswer,
  ActiveGame,
  BucketItem,
  ChatMessage,
  ChatKind
} from "./types";
import { DECK_BY_ID, slotFor, type DeckId } from "./games/decks";
import type { User as FirebaseUser } from "firebase/auth";
import { REACTION_ICONS } from "./constants";

/**
 * Generic converter for Firestore to maintain type safety
 */
const converter = <T extends object>(): FirestoreDataConverter<T> => ({
  toFirestore: (data: T) => {
    // Convert any string dates back to Timestamps if needed, 
    // though usually handled by firestore auto-conversion
    return data;
  },
  fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions) => {
    const data = snapshot.data(options);
    return {
      ...data,
      id: snapshot.id,
      // Helper to convert Timestamps to ISO strings for internal state consistency
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
      respondedAt: data.respondedAt instanceof Timestamp ? data.respondedAt.toDate().toISOString() : data.respondedAt,
    } as T;
  }
});

/**
 * Get the path to a couple's sub-collection
 */
export const getCoupleCollection = (coupleId: string, subPath: string) => {
  return collection(db, "couples", coupleId, subPath).withConverter(converter<DocumentData>());
};

/**
 * Mailbox Helpers
 */
export const subscribeToMailbox = (coupleId: string, pageSize: number, callback: (messages: MailboxMessage[]) => void) => {
  // Only the most recent notes are kept live; older ones load on request, so cost does not grow with history
  const q = query(getCoupleCollection(coupleId, "mailbox"), orderBy("createdAt", "desc"), limit(pageSize));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => doc.data() as MailboxMessage));
  });
};

export const sendMailboxMessage = async (coupleId: string, message: Omit<MailboxMessage, "id" | "createdAt">, partnerUid: string) => {
  const docRef = doc(collection(db, "couples", coupleId, "mailbox"));

  if (message.unlockAt) {
    // Time capsule: the envelope goes in the mailbox, the words are sealed in a separate
    // document the receiver cannot open until the unlock time (enforced by the security rules).
    const { status, intent, note, ...envelope } = message;
    const batch = writeBatch(db);
    batch.set(docRef, { ...envelope, sealed: true, createdAt: Timestamp.now() });
    batch.set(doc(db, "couples", coupleId, "capsules", docRef.id), {
      senderUid: message.senderUid,
      status,
      intent,
      note,
      unlockAtTs: Timestamp.fromDate(new Date(message.unlockAt))
    });
    await batch.commit();
  } else {
    await setDoc(docRef, { ...message, createdAt: Timestamp.now() });
  }

  // A secret capsule must not announce itself before it unlocks
  if (!message.isSecretBeforeUnlock) {
    await notifyPartner(partnerUid, {
      uid: partnerUid,
      type: "MAILBOX",
      title: message.unlockAt ? "Time Capsule" : "New Note",
      body: message.unlockAt ? "Your partner left you a time capsule." : "You have a new note in your mailbox.",
    });
  }

  return docRef;
};

export type CapsuleContent = Pick<MailboxMessage, "status" | "intent" | "note">;

/**
 * Read a sealed capsule's words. Works for the sender at any time, and for the receiver once it has unlocked.
 */
export const getCapsuleContent = async (coupleId: string, messageId: string): Promise<CapsuleContent | null> => {
  const snap = await getDoc(doc(db, "couples", coupleId, "capsules", messageId));
  if (!snap.exists()) return null;
  const { status, intent, note } = snap.data();
  return { status, intent, note: note || "" };
};

export const updateCapsuleContent = async (coupleId: string, messageId: string, updates: Partial<CapsuleContent>) => {
  return updateDoc(doc(db, "couples", coupleId, "capsules", messageId), updates);
};

/**
 * Once the unlock time has passed, move the words into the mailbox message. Safe to call from either partner, more than once.
 */
export const unsealCapsule = async (coupleId: string, messageId: string) => {
  const content = await getCapsuleContent(coupleId, messageId);
  if (!content) return false;
  const batch = writeBatch(db);
  batch.update(doc(db, "couples", coupleId, "mailbox", messageId), { ...content, sealed: false });
  batch.delete(doc(db, "couples", coupleId, "capsules", messageId));
  await batch.commit();
  return true;
};

/**
 * Advance the couple's running streak for a day on which both partners checked in.
 * Runs in a transaction, so both phones doing this at once still count the day only once.
 */
export const recordStreak = async (coupleId: string, today: string, historyStreak: number) => {
  const coupleRef = doc(db, "couples", coupleId);
  await runTransaction(db, async (tx) => {
    const data = (await tx.get(coupleRef)).data();
    if (!data || data.streakLastDay === today) return;

    const [y, m, d] = today.split("-").map(Number);
    const prev = new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);

    let streakCount = 1;
    if (data.streakLastDay === prev) streakCount = (data.streakCount || 0) + 1;
    // First time for a couple that already had history: start from what the history shows
    else if (!data.streakLastDay) streakCount = Math.max(1, historyStreak);

    tx.update(coupleRef, { streakCount, streakLastDay: today });
  });
};

export const markMessageAsRead = async (coupleId: string, messageId: string) => {
  const msgRef = doc(db, "couples", coupleId, "mailbox", messageId);
  return updateDoc(msgRef, {
    readAt: new Date().toISOString()
  });
};

export const updateMailboxMessage = async (coupleId: string, messageId: string, updates: Partial<MailboxMessage>) => {
  const msgRef = doc(db, "couples", coupleId, "mailbox", messageId);
  return updateDoc(msgRef, {
    ...updates,
    updatedAt: Timestamp.now()
  });
};

export const deleteMailboxMessage = async (coupleId: string, messageId: string) => {
  const batch = writeBatch(db);
  batch.delete(doc(db, "couples", coupleId, "mailbox", messageId));
  batch.delete(doc(db, "couples", coupleId, "capsules", messageId));
  await batch.commit();
  return true;
};

// Saving a thought keeps it past the week it is shown for. It is private to the person who saved it.
export const setThoughtSaved = (coupleId: string, messageId: string, uid: string, saved: boolean) =>
  updateDoc(doc(db, "couples", coupleId, "mailbox", messageId), { savedBy: saved ? arrayUnion(uid) : arrayRemove(uid) });

// Everything this person has saved, newest first. Sorted here so no extra database index is needed.
export const subscribeToSavedThoughts = (coupleId: string, uid: string, callback: (messages: MailboxMessage[]) => void) => {
  const q = query(getCoupleCollection(coupleId, "mailbox"), where("savedBy", "array-contains", uid));
  return onSnapshot(q, (snapshot) => {
    callback(
      snapshot.docs.map((d) => d.data() as MailboxMessage)
        .filter((m) => !m.hiddenFor?.includes(uid))
        .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
    );
  });
};

export const hideMessageForUser = async (coupleId: string, messageId: string, uid: string) => {
  const msgRef = doc(db, "couples", coupleId, "mailbox", messageId);
  return updateDoc(msgRef, {
    hiddenFor: arrayUnion(uid)
  });
};

/**
 * Daily Check-In Helpers
 */
export const saveCheckIn = async (coupleId: string, checkIn: Omit<DailyCheckIn, "id" | "createdAt">, partnerUid: string) => {
  // One document per user per day, so a double submit or a second device overwrites instead of duplicating
  const docRef = doc(db, "couples", coupleId, "checkins", `${checkIn.dateId}_${checkIn.userUid}`);
  await setDoc(docRef, {
    ...checkIn,
    createdAt: Timestamp.now()
  });

  await notifyPartner(partnerUid, {
    uid: partnerUid,
    type: "CHECK_IN",
    title: "Daily Check-In",
    body: "Your partner just completed their daily check-in.",
  });

  return docRef;
};

/**
 * Quick React Helpers
 */
export const sendQuickReact = async (coupleId: string, react: Omit<QuickReact, "id" | "createdAt">, partnerUid: string, notify = true, docId?: string) => {
  // Firestore rejects undefined, so the optional note is only written when present
  const { note, ...rest } = react;
  // A fixed id (used by the daily check-in) makes a retry overwrite instead of adding a second signal
  const reactionsRef = collection(db, "couples", coupleId, "reactions");
  await setDoc(docId ? doc(reactionsRef, docId) : doc(reactionsRef), {
    ...rest,
    ...(note ? { note } : {}),
    createdAt: Timestamp.now()
  });

  if (!notify) return;
  await notifyPartner(partnerUid, {
    uid: partnerUid,
    type: "REACTION",
    title: "New Signal",
    body: `Your partner sent you a signal: ${REACTION_ICONS[react.type]?.label ?? "a feeling"}.`,
  });
};

/**
 * Safe Space Helpers
 *
 * A couple has one safe space. Once opened it stays open, whether or not anyone is looking at it,
 * until one of them closes it. Either person can come and go, read, and add to it in their own time.
 */
export const startSafeSpaceSession = async (coupleId: string, uid: string, partnerUid?: string) => {
  const sessionsRef = collection(db, "couples", coupleId, "safe_space_sessions");
  const active = await getDocs(query(sessionsRef, where("active", "==", true)));
  if (!active.empty) return active.docs[0].ref;

  const ref = await addDoc(sessionsRef, {
    active: true,
    startedBy: uid,
    currentTurnUid: uid,
    startedAt: Timestamp.now(),
    lastMessageAt: Timestamp.now(),
    seen: { [uid]: new Date().toISOString() },
  });

  if (partnerUid) {
    await notifyPartner(partnerUid, {
      uid: partnerUid,
      type: "SAFE_SPACE",
      title: "Safe Space Opened",
      body: "Your partner opened the safe space. Come in whenever you're ready.",
    });
  }
  return ref;
};

export const subscribeToSafeSpaceMessages = (coupleId: string, sessionId: string, callback: (messages: SafeSpaceMessage[]) => void) => {
  // The whole conversation stays for as long as the space is open
  const q = query(
    collection(db, "couples", coupleId, "safe_space_sessions", sessionId, "messages"),
    orderBy("createdAt", "asc"),
    limitToLast(200)
  ).withConverter(converter<SafeSpaceMessage>());
  
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => doc.data()));
  });
};

/**
 * Add a thought. The partner gets one notification when it becomes their turn to read,
 * not one for every message.
 */
export const sendSafeSpaceMessage = async (coupleId: string, sessionId: string, senderUid: string, text: string, notifyUid?: string) => {
  const sessionRef = doc(db, "couples", coupleId, "safe_space_sessions", sessionId);
  await addDoc(collection(db, "couples", coupleId, "safe_space_sessions", sessionId, "messages"), {
    senderUid,
    text,
    createdAt: Timestamp.now()
  });
  await updateDoc(sessionRef, {
    lastMessageAt: Timestamp.now(),
    lastMessageBy: senderUid,
    // Whoever is speaking has the floor until they hand it over
    currentTurnUid: senderUid,
    [`seen.${senderUid}`]: new Date().toISOString(),
  });

  if (notifyUid) {
    await notifyPartner(notifyUid, {
      uid: notifyUid,
      type: "SAFE_SPACE",
      title: "Safe Space",
      body: "Your partner shared something in the safe space.",
    });
  }
};

/**
 * Presence: a heartbeat while someone has the room open, cleared when they step out.
 * When both are present the conversation goes one at a time; otherwise each writes freely.
 */
export const setSafeSpacePresence = async (coupleId: string, sessionId: string, uid: string, present: boolean) => {
  return updateDoc(doc(db, "couples", coupleId, "safe_space_sessions", sessionId), {
    [`present.${uid}`]: present ? new Date().toISOString() : null,
  });
};

/** Pass the floor to the other person. */
export const handoverMic = async (coupleId: string, sessionId: string, nextUid: string) => {
  return updateDoc(doc(db, "couples", coupleId, "safe_space_sessions", sessionId), {
    currentTurnUid: nextUid,
    micRequest: null,
  });
};

/** The listener asks for the floor. */
export const requestMic = async (coupleId: string, sessionId: string, uid: string) => {
  const now = new Date().toISOString();
  return updateDoc(doc(db, "couples", coupleId, "safe_space_sessions", sessionId), {
    micRequest: { uid, requestedAt: now },
    lastMicRequestAt: now,
    lastMicRequestBy: uid,
  });
};

/** The speaker answers a request: hand over now, or finish first. */
export const respondToMicRequest = async (coupleId: string, sessionId: string, requesterUid: string, approve: boolean) => {
  return updateDoc(doc(db, "couples", coupleId, "safe_space_sessions", sessionId), approve
    ? { currentTurnUid: requesterUid, micRequest: null }
    : { micRequest: null });
};

/** Record that this person has read the space up to now. */
export const markSafeSpaceSeen = async (coupleId: string, sessionId: string, uid: string) => {
  return updateDoc(doc(db, "couples", coupleId, "safe_space_sessions", sessionId), {
    [`seen.${uid}`]: new Date().toISOString(),
  });
};

export const endSafeSpaceSession = async (coupleId: string, sessionId: string, closureMood: 1 | 2 | 3, endedBy: string, partnerUid?: string) => {
  const sessionRef = doc(db, "couples", coupleId, "safe_space_sessions", sessionId);
  await updateDoc(sessionRef, {
    active: false,
    endedAt: Timestamp.now(),
    endedBy,
    closureMood
  });

  // Either person can always step out; the other is told rather than left wondering
  if (partnerUid) {
    await notifyPartner(partnerUid, {
      uid: partnerUid,
      type: "SAFE_SPACE",
      title: "Safe Space Closed",
      body: "Your partner closed the safe space. You can open a new one whenever you're both ready.",
    });
  }
};

/**
 * Games: each game in progress is its own document in couples/{id}/games.
 * Up to MAX_OPEN_GAMES live games and as many question decks can run side by side.
 */
const gameRef = (coupleId: string, gameId: string) => doc(db, "couples", coupleId, "games", gameId);

export const subscribeToGames = (coupleId: string, callback: (games: ActiveGame[]) => void) =>
  onSnapshot(
    collection(db, "couples", coupleId, "games"),
    (snap) => callback(
      snap.docs
        .map(d => ({ ...(d.data() as CoupleGame), id: d.id }))
        .sort((a, b) => (b.startedAt || "").localeCompare(a.startedAt || ""))
    ),
    () => callback([])
  );

/**
 * A game counts as finished when the last card is done, for a question deck when both have answered everything,
 * and for a board game once anyone has won a round
 */
const isFinished = (g: CoupleGame) => {
  if (!DECK_BY_ID[g.deck]) return false;
  const mechanic = DECK_BY_ID[g.deck].mechanic;
  if (mechanic === "xo" || mechanic === "connect4") return Object.values(g.wins ?? {}).some(n => n > 0);
  if (mechanic === "open") return g.players.every(u => g.cards.every((_, r) => !!g.answers?.[`r${r}`]?.[u]?.text));
  return g.round >= g.cards.length;
};

/**
 * Keep a finished game before it's removed, so it can be read again later.
 * The id comes from the game itself, so both partners tapping at once still store it once.
 */
const archiveIfFinished = async (coupleId: string, gameId: string) => {
  const snap = await getDoc(gameRef(coupleId, gameId));
  if (!snap.exists()) return;
  const game = snap.data() as CoupleGame;
  if (!isFinished(game)) return;
  const id = `${game.startedAt}_${game.deck}`.replace(/[^\w-]/g, "_");
  // If the partner already stored it, the copy is there and history entries can't be overwritten,
  // so the write fails and the points aren't counted a second time
  const stored = await setDoc(doc(db, "couples", coupleId, "game_history", id), { ...game, archivedAt: new Date().toISOString() })
    .then(() => true, () => false);
  if (!stored) return;
  // Add this game's points to the couple's running score
  const { totalScores } = await import("./games/engine");
  const [a, b] = game.players;
  const pts = totalScores(game, [a, b]);
  if (pts[a] || pts[b]) {
    await updateDoc(doc(db, "couples", coupleId), {
      [`gameScores.${a}`]: increment(pts[a] || 0),
      [`gameScores.${b}`]: increment(pts[b] || 0),
    }).catch(console.error);
  }
};

export const getGameHistory = async (coupleId: string) => {
  const snap = await getDocs(query(collection(db, "couples", coupleId, "game_history"), orderBy("archivedAt", "desc"), limit(30)));
  return snap.docs.map(d => ({ ...(d.data() as CoupleGame & { archivedAt: string }), id: d.id }));
};

/** Deal a new game alongside the others. Returns its id. */
export const startGame = async (coupleId: string, uid: string, partnerUid: string, deck: DeckId, starterName?: string) => {
  // The card lists are only downloaded when someone actually plays
  const { dealGame } = await import("./games/engine");
  const game: CoupleGame = {
    deck,
    cards: [],
    ...dealGame(deck, uid),
    round: 0,
    players: [uid, partnerUid],
    startedBy: uid,
    startedAt: new Date().toISOString(),
    joined: { [uid]: true },
  };
  const ref = doc(collection(db, "couples", coupleId, "games"));
  // The game shows up on this phone as soon as it's written locally, so the screen can open right away
  // instead of waiting for the server. If the server refuses it, it disappears again and the screen closes.
  const saved = setDoc(ref, game);
  const written = slotFor(deck) === "questions";
  saved
    .then(() => notifyPartner(partnerUid, {
      uid: partnerUid,
      type: "GAME",
      title: written ? "Questions for You" : "Come Play",
      body: `${starterName || "Your partner"} started ${DECK_BY_ID[deck].title}. Tap to ${written ? "answer" : "join"}.`,
      gameId: ref.id,
    }))
    .catch(console.error);
  return ref.id;
};

/** Question decks: save one written answer, and tell the partner once all of yours are in */
export const submitQuestionAnswer = async (coupleId: string, gameId: string, round: number, uid: string, text: string, finished: boolean, partnerUid: string, name?: string) => {
  await updateDoc(gameRef(coupleId, gameId), { [`answers.r${round}.${uid}`]: { text } });
  if (finished) {
    await notifyPartner(partnerUid, {
      uid: partnerUid,
      type: "GAME",
      title: "Answers Are In",
      body: `${name || "Your partner"} answered every question. Tap to finish yours and read them together.`,
      gameId,
    });
  }
};

export const joinGame = (coupleId: string, gameId: string, uid: string) =>
  updateDoc(gameRef(coupleId, gameId), { [`joined.${uid}`]: true });

export const submitGameAnswer = (coupleId: string, gameId: string, round: number, uid: string, answer: GameAnswer) =>
  updateDoc(gameRef(coupleId, gameId), { [`answers.r${round}.${uid}`]: answer });

export const chooseTruthOrDare = (coupleId: string, gameId: string, round: number, choice: "truth" | "dare") =>
  updateDoc(gameRef(coupleId, gameId), { [`td.r${round}.choice`]: choice });

export const judgeTruthOrDare = (coupleId: string, gameId: string, round: number, result: "done" | "skipped") =>
  updateDoc(gameRef(coupleId, gameId), { [`td.r${round}.result`]: result });

/** Move to the next card. Both tapping "Next" at once still moves only one card. */
export const advanceGame = async (coupleId: string, gameId: string, fromRound: number) => {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(gameRef(coupleId, gameId));
    if (!snap.exists() || snap.data().round !== fromRound) return;
    tx.update(gameRef(coupleId, gameId), { round: fromRound + 1 });
  });
};

/**
 * Board games: place a piece. Runs as a transaction so a move only lands on the player's own turn,
 * in an empty cell, and the win is counted exactly once.
 */
export const playBoardMove = async (coupleId: string, gameId: string, uid: string, cell: number) => {
  const { c4Landing, c4Winner, xoWinner } = await import("./games/engine");
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(gameRef(coupleId, gameId));
    if (!snap.exists()) return;
    const g = snap.data() as CoupleGame;
    if (!g.board || g.winner || g.turn !== uid) return;
    const connect4 = DECK_BY_ID[g.deck]?.mechanic === "connect4";
    // In four in a row the tap picks a column; the coin falls to the lowest free cell
    const target = connect4 ? c4Landing(g.board, cell) : cell;
    if (target < 0 || g.board[target]) return;
    const board = [...g.board];
    board[target] = uid;
    const winner = connect4 ? c4Winner(board) : xoWinner(board);
    const other = g.players.find(p => p !== uid) ?? uid;
    tx.update(gameRef(coupleId, gameId), {
      board,
      turn: winner ? g.turn : other,
      winner: winner ?? null,
      ...(winner && winner !== "draw" ? { [`wins.${winner}`]: (g.wins?.[winner] ?? 0) + 1 } : {}),
    });
  });
};

/** Board games: clear the board for another round. Whoever went second last time goes first. */
export const nextBoardRound = async (coupleId: string, gameId: string) => {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(gameRef(coupleId, gameId));
    if (!snap.exists()) return;
    const g = snap.data() as CoupleGame;
    if (!g.board || !g.winner) return;
    const match = (g.match ?? 1) + 1;
    tx.update(gameRef(coupleId, gameId), {
      board: g.board.map(() => ""),
      winner: null,
      match,
      turn: g.players[(match - 1) % 2],
    });
  });
};

/** Scribble: add one finished stroke to this round's drawing */
export const addScribbleStroke = (coupleId: string, gameId: string, round: number, stroke: string) =>
  updateDoc(gameRef(coupleId, gameId), { [`strokes.r${round}`]: arrayUnion(stroke) });

export const clearScribble = (coupleId: string, gameId: string, round: number) =>
  updateDoc(gameRef(coupleId, gameId), { [`strokes.r${round}`]: [] });

/** Scribble: settle how a round ended, once. A skip can't undo a right guess that got there first, or the other way round. */
const endScribbleRound = (coupleId: string, gameId: string, round: number, result: "solved" | "skipped", extra: Record<string, unknown> = {}) =>
  runTransaction(db, async (tx) => {
    const snap = await tx.get(gameRef(coupleId, gameId));
    if (!snap.exists()) return;
    const g = snap.data() as CoupleGame;
    if (g.round !== round || g.sb?.[`r${round}`]?.result) return;
    tx.update(gameRef(coupleId, gameId), { [`sb.r${round}.result`]: result, ...extra });
  });

/** Scribble: record a guess; a right one ends the round */
export const submitScribbleGuess = (coupleId: string, gameId: string, round: number, guess: string, correct: boolean) =>
  correct
    ? endScribbleRound(coupleId, gameId, round, "solved", { [`guesses.r${round}`]: arrayUnion(guess) })
    : updateDoc(gameRef(coupleId, gameId), { [`guesses.r${round}`]: arrayUnion(guess) });

/** Scribble: the artist gives up on this word */
export const skipScribble = (coupleId: string, gameId: string, round: number) =>
  endScribbleRound(coupleId, gameId, round, "skipped");

/**
 * "Play again" / "New deck": start a fresh game of the same kind and close the finished one.
 * If both tap at once, the second tap opens the game the first one made instead of making another.
 * Returns the new game's id, or null if the finished game is already gone.
 */
export const replayGame = async (coupleId: string, oldId: string, uid: string, partnerUid: string, starterName?: string) => {
  const { dealGame } = await import("./games/engine");
  const newRef = doc(collection(db, "couples", coupleId, "games"));
  let deck: DeckId | null = null;
  const result = await runTransaction(db, async (tx) => {
    const snap = await tx.get(gameRef(coupleId, oldId));
    if (!snap.exists()) return null;
    const old = snap.data() as CoupleGame & { replacedBy?: string };
    if (old.replacedBy) return old.replacedBy;
    deck = old.deck;
    const game: CoupleGame = {
      deck: old.deck,
      cards: [],
      ...dealGame(old.deck, uid),
      round: 0,
      players: [uid, partnerUid],
      startedBy: uid,
      startedAt: new Date().toISOString(),
      joined: { [uid]: true },
    };
    tx.set(newRef, game);
    tx.update(gameRef(coupleId, oldId), { replacedBy: newRef.id });
    return newRef.id;
  });
  // Only the person who made the new game tidies up the old one and tells the partner
  if (result && result === newRef.id && deck) {
    await endGame(coupleId, oldId).catch(console.error);
    const written = slotFor(deck) === "questions";
    await notifyPartner(partnerUid, {
      uid: partnerUid,
      type: "GAME",
      title: written ? "Questions for You" : "Come Play",
      body: `${starterName || "Your partner"} started another round of ${DECK_BY_ID[deck].title}. Tap to ${written ? "answer" : "join"}.`,
      gameId: newRef.id,
    }).catch(console.error);
  }
  return result;
};

/** Close a game for both. A finished one is kept in the history first. */
export const endGame = async (coupleId: string, gameId: string) => {
  await archiveIfFinished(coupleId, gameId);
  await deleteDoc(gameRef(coupleId, gameId));
};

export const updateUserMood = async (uid: string, mood: string, partnerUid?: string) => {
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, {
    currentMood: mood,
    moodUpdatedAt: new Date().toISOString()
  });

  if (partnerUid) {
    await notifyPartner(partnerUid, {
      uid: partnerUid,
      type: "CHECK_IN",
      title: "Mood Updated",
      body: `Your partner's mood is now ${mood}.`,
    });
  }
};

export const updateUserTimezone = async (uid: string, timezone: string) => {
  const userRef = doc(db, "users", uid);
  return updateDoc(userRef, {
    timezone
  });
};

export const updatePartnerNickname = async (uid: string, nickname: string) => {
  const userRef = doc(db, "users", uid);
  return updateDoc(userRef, {
    partnerNickname: nickname
  });
};

export const updateCoupleAnniversary = async (coupleId: string, anniversaryDate: string) => {
  const coupleRef = doc(db, "couples", coupleId);
  return updateDoc(coupleRef, {
    anniversaryDate
  });
};

export const updateProfile = async (uid: string, profile: EmotionalProfile) => {
  const userRef = doc(db, "users", uid);
  return updateDoc(userRef, {
    profile: {
      ...profile,
      updatedAt: new Date().toISOString()
    }
  });
};

export const respondToMessage = async (coupleId: string, messageId: string, response: { mode: string; text?: string; timerExpiresAt?: string }, partnerUid: string) => {
  const messageRef = doc(db, "couples", coupleId, "mailbox", messageId);
  await updateDoc(messageRef, {
    response: {
      ...response,
      respondedAt: Timestamp.now()
    }
  });

  await notifyPartner(partnerUid, {
    uid: partnerUid,
    type: "MAILBOX",
    title: "New Response",
    body: "Your partner responded to your message.",
  });
};

const COUPLE_SUBCOLLECTIONS = ["mailbox", "checkins", "reactions", "safe_space_sessions", "events", "games", "game_history", "bucket_list", "chat"];

/**
 * Delete documents in chunks that fit inside a single batch
 */
const deleteRefs = async (refs: DocumentReference[]) => {
  for (let i = 0; i < refs.length; i += 400) {
    const batch = writeBatch(db);
    refs.slice(i, i + 400).forEach((ref) => batch.delete(ref));
    await batch.commit();
  }
};

export const resetCoupleHistory = async (coupleId: string) => {
  const refs: DocumentReference[] = [];

  for (const colName of COUPLE_SUBCOLLECTIONS) {
    const snap = await getDocs(collection(db, "couples", coupleId, colName));
    for (const d of snap.docs) {
      // Firestore does not cascade, so session messages have to be removed explicitly
      if (colName === "safe_space_sessions") {
        const msgs = await getDocs(collection(d.ref, "messages"));
        msgs.docs.forEach((m) => refs.push(m.ref));
      }
      // Sealed capsule contents live beside the mailbox under the same id
      if (colName === "mailbox" && d.data().sealed) {
        refs.push(doc(db, "couples", coupleId, "capsules", d.id));
      }
      refs.push(d.ref);
    }
  }

  await deleteRefs(refs);
};

export const destroyCoupleData = async (coupleId: string) => {
  const currentUid = auth.currentUser?.uid;
  if (currentUid) {
    await updateDoc(doc(db, "couples", coupleId), { unpairingBy: currentUid }).catch(() => {});
  }
  await resetCoupleHistory(coupleId);
  await deleteDoc(doc(db, "couples", coupleId));
};

export const raiseWhiteFlag = async (coupleId: string, uid: string) => {
  await updateDoc(doc(db, "couples", coupleId), {
    whiteFlagBy: uid,
    whiteFlagAt: new Date().toISOString()
  });
};

export const lowerWhiteFlag = async (coupleId: string) => {
  await updateDoc(doc(db, "couples", coupleId), {
    whiteFlagBy: null,
    whiteFlagAt: null
  });
};

export const requestCoupleReset = async (coupleId: string, uid: string) => {
  await updateDoc(doc(db, "couples", coupleId), {
    resetStatus: "pending",
    resetBy: uid
  });
};

export const rejectCoupleReset = async (coupleId: string) => {
  // Stays "declined" until the requester dismisses it (cancelCoupleReset)
  await updateDoc(doc(db, "couples", coupleId), {
    resetStatus: "declined"
  });
};

export const acceptCoupleReset = async (coupleId: string) => {
  // 1. Destroy mutual history sub-collections
  await resetCoupleHistory(coupleId);

  // 2. Clear couple-level flags and anniversary
  await updateDoc(doc(db, "couples", coupleId), {
    resetStatus: null,
    resetBy: null,
    anniversaryDate: null,
    whiteFlagBy: null,
    whiteFlagAt: null,
    streakCount: 0,
    streakLastDay: null,
    gameScores: {},
    chatLastAt: null,
    chatLastBy: null,
    chatLastKind: null,
    chatSeen: {},
  });
};

export const cancelCoupleReset = async (coupleId: string) => {
  await updateDoc(doc(db, "couples", coupleId), {
    resetStatus: null,
    resetBy: null
  });
};

export const unpairPartner = async (uid: string, partnerUid: string) => {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);
  const coupleId = userSnap.data()?.coupleId;

  // Shared data goes first, while both of us still count as members of the couple
  if (coupleId) {
    await destroyCoupleData(coupleId);
  }

  // Then both links are cleared together, and the partner is told
  const batch = writeBatch(db);
  batch.update(userRef, {
    coupleId: null,
    partnerId: null,
    role: null
  });
  batch.update(doc(db, "users", partnerUid), {
    coupleId: null,
    partnerId: null,
    role: null,
    leftByPartner: true 
  });
  try {
    await batch.commit();
  } catch (err) {
    // Partner's profile is already gone (deleted account): still free ourselves
    console.error("Could not update partner while unpairing:", err);
    await updateDoc(userRef, { coupleId: null, partnerId: null, role: null });
  }
};

export const clearLeftStatus = async (uid: string) => {
  const userRef = doc(db, "users", uid);
  return updateDoc(userRef, {
    coupleId: null,
    partnerId: null,
    role: null,
    leftByPartner: false
  });
};

export const deleteUserAccount = async (uid: string, partnerUid: string | null) => {
  if (partnerUid) {
    await unpairPartner(uid, partnerUid);
  }

  // Private sub-collections are not removed with the parent document
  const refs: DocumentReference[] = [];
  // Any invite this person created goes too. Best effort: it must never block the deletion itself.
  const inviteCode = (await getDoc(doc(db, "users", uid))).data()?.inviteCode;
  if (inviteCode) await deleteDoc(doc(db, "invites", inviteCode)).catch(() => {});
  for (const colName of ["notes", "notifications"]) {
    const snap = await getDocs(collection(db, "users", uid, colName));
    snap.docs.forEach((d) => refs.push(d.ref));
  }
  await deleteRefs(refs);

  await deleteDoc(doc(db, "users", uid));
};

/**
 * Account + Pairing Helpers
 */
export const ensureUserDoc = async (fbUser: FirebaseUser) => {
  const userRef = doc(db, "users", fbUser.uid);
  const snap = await getDoc(userRef);
  if (snap.exists()) return;

  await setDoc(userRef, {
    uid: fbUser.uid,
    email: fbUser.email,
    displayName: fbUser.displayName || "",
    photoURL: fbUser.photoURL || "",
    createdAt: new Date().toISOString(),
    settings: { notificationsEnabled: true }
  });
};

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const randomString = (length: number, chars: string) => {
  const bytes = crypto.getRandomValues(new Uint32Array(length));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
};

export const createInvite = async (uid: string) => {
  // Hand back the invite this person already has out, rather than minting a new valid code on every tap
  const userRef = doc(db, "users", uid);
  const existing = (await getDoc(userRef)).data()?.inviteCode as string | undefined;
  if (existing) {
    const invite = (await getDoc(doc(db, "invites", existing))).data();
    const stillValid = invite && !invite.used && invite.createdBy === uid
      && invite.expiresAt instanceof Timestamp && invite.expiresAt.toMillis() > Date.now() + 60 * 60 * 1000;
    if (stillValid) return existing;
  }

  const code = randomString(6, "ABCDEFGHJKLMNPQRSTUVWXYZ23456789");
  await setDoc(doc(db, "invites", code), {
    createdBy: uid,
    createdAt: Timestamp.now(),
    expiresAt: Timestamp.fromMillis(Date.now() + INVITE_TTL_MS),
    used: false
  });
  await updateDoc(userRef, { inviteCode: code }).catch(console.error);
  return code;
};

export type InviteError = "invalid" | "expired" | "self" | "already-paired";

/**
 * Join a partner's invite. Everything happens in one transaction, so a code can only ever pair two people.
 */
export const acceptInvite = async (uid: string, rawCode: string) => {
  const code = rawCode.trim().toUpperCase();
  const inviteRef = doc(db, "invites", code);
  const userRef = doc(db, "users", uid);
  const coupleId = randomString(20, "abcdefghijklmnopqrstuvwxyz0123456789");

  await runTransaction(db, async (tx) => {
    const inviteSnap = await tx.get(inviteRef);
    const userSnap = await tx.get(userRef);
    const invite = inviteSnap.data();

    if (!inviteSnap.exists() || !invite || invite.used) throw new Error("invalid" satisfies InviteError);
    if (invite.expiresAt instanceof Timestamp && invite.expiresAt.toMillis() < Date.now()) throw new Error("expired" satisfies InviteError);
    if (invite.createdBy === uid) throw new Error("self" satisfies InviteError);
    if (userSnap.data()?.coupleId) throw new Error("already-paired" satisfies InviteError);

    const partnerUid = invite.createdBy as string;

    tx.set(doc(db, "couples", coupleId), {
      id: coupleId,
      partnerA_uid: partnerUid,
      partnerB_uid: uid,
      inviteCode: code,
      createdAt: Timestamp.now(),
      settings: {
        notifications: {
          checkInReminderTime: "20:00",
          doNotDisturb: { enabled: false, start: "22:00", end: "08:00" }
        }
      }
    });
    tx.update(doc(db, "users", partnerUid), {
      coupleId, role: "PARTNER_A", partnerId: uid, leftByPartner: false
    });
    tx.update(userRef, {
      coupleId, role: "PARTNER_B", partnerId: partnerUid, leftByPartner: false
    });
    tx.update(inviteRef, { used: true, usedBy: uid });
  });

  return coupleId;
};

/**
 * Event Helpers
 */
export const subscribeToEvents = (coupleId: string, callback: (events: CoupleEvent[]) => void) => {
  const q = query(getCoupleCollection(coupleId, "events"), orderBy("dateId", "asc"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => doc.data() as CoupleEvent));
  });
};

export const saveCoupleEvent = async (coupleId: string, event: Omit<CoupleEvent, "id" | "createdAt">) => {
  return addDoc(getCoupleCollection(coupleId, "events"), {
    ...event,
    createdAt: Timestamp.now()
  });
};

export const deleteCoupleEvent = async (coupleId: string, eventId: string) => {
  const eventRef = doc(db, "couples", coupleId, "events", eventId);
  const snap = await getDoc(eventRef);
  if (!snap.exists()) return;
  
  // Standard delete
  return deleteDoc(eventRef);
};

/**
 * Partner Notes Helpers
 */
export const subscribeToPartnerNotes = (uid: string, callback: (notes: PartnerNote[]) => void) => {
  const q = query(
    collection(db, "users", uid, "notes"),
    orderBy("createdAt", "desc")
  ).withConverter(converter<PartnerNote>());
  
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => doc.data()));
  });
};

export const addPartnerNote = async (uid: string, text: string, shared = false) => {
  return addDoc(collection(db, "users", uid, "notes"), {
    userUid: uid,
    text,
    shared,
    createdAt: Timestamp.now()
  });
};

/** The notes a partner chose to share. Sorted here, so no extra index is needed. */
export const subscribeToSharedNotes = (partnerUid: string, callback: (notes: PartnerNote[]) => void) => {
  const q = query(collection(db, "users", partnerUid, "notes"), where("shared", "==", true)).withConverter(converter<PartnerNote>());
  return onSnapshot(
    q,
    (snapshot) => callback(snapshot.docs.map(d => d.data()).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))),
    () => callback([])
  );
};

export const setPartnerNoteShared = async (uid: string, noteId: string, shared: boolean) =>
  updateDoc(doc(db, "users", uid, "notes", noteId), { shared, updatedAt: Timestamp.now() });

/**
 * Bucket list: one shared list per couple
 */
export const subscribeToBucketList = (coupleId: string, callback: (items: BucketItem[]) => void) =>
  onSnapshot(
    query(collection(db, "couples", coupleId, "bucket_list"), orderBy("createdAt", "asc")),
    (snap) => callback(snap.docs.map(d => ({ ...(d.data() as Omit<BucketItem, "id">), id: d.id }))),
    () => callback([])
  );

export const addBucketItem = async (coupleId: string, uid: string, text: string, partnerUid?: string, name?: string) => {
  await addDoc(collection(db, "couples", coupleId, "bucket_list"), {
    text,
    addedBy: uid,
    done: false,
    createdAt: new Date().toISOString(),
  });
  if (partnerUid) {
    await notifyPartner(partnerUid, {
      uid: partnerUid,
      type: "BUCKET",
      title: "Bucket List",
      body: `${name || "Your partner"} added "${text.slice(0, 60)}" to your bucket list.`,
    });
  }
};

export const setBucketItemDone = (coupleId: string, itemId: string, uid: string, done: boolean) =>
  updateDoc(doc(db, "couples", coupleId, "bucket_list", itemId), {
    done,
    doneBy: done ? uid : null,
    doneAt: done ? new Date().toISOString() : null,
  });

export const deleteBucketItem = (coupleId: string, itemId: string) =>
  deleteDoc(doc(db, "couples", coupleId, "bucket_list", itemId));

export const deletePartnerNote = async (uid: string, noteId: string) => {
  const noteRef = doc(db, "users", uid, "notes", noteId);
  return deleteDoc(noteRef);
};

export const updatePartnerNote = async (uid: string, noteId: string, text: string, shared?: boolean) => {
  const noteRef = doc(db, "users", uid, "notes", noteId);
  return updateDoc(noteRef, {
    text,
    ...(shared === undefined ? {} : { shared }),
    updatedAt: Timestamp.now()
  });
};

/**
 * Notifications Helpers
 */
export const sendNotification = async (toUid: string, notification: Omit<AppNotification, "id" | "createdAt" | "read">) => {
  const notisRef = collection(db, "users", toUid, "notifications");
  return addDoc(notisRef, {
    ...notification,
    read: false,
    createdAt: Timestamp.now()
  });
};

/**
 * A notification is a courtesy. It must never make the action that triggered it look like it failed.
 */
export const notifyPartner = async (toUid: string, notification: Omit<AppNotification, "id" | "createdAt" | "read">) => {
  try {
    await sendNotification(toUid, notification);
  } catch (err) {
    console.error("Notification not delivered:", err);
  }
};

export const markNotificationAsRead = async (uid: string, notiId: string) => {
  const notiRef = doc(db, "users", uid, "notifications", notiId);
  return updateDoc(notiRef, { read: true });
};

export const markAllNotificationsAsRead = async (uid: string) => {
  const notisRef = collection(db, "users", uid, "notifications");
  const q = query(notisRef, where("read", "==", false));
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.update(d.ref, { read: true }));
  await batch.commit();
};

export const updateUserNotificationSettings = async (uid: string, enabled: boolean) => {
  const userRef = doc(db, "users", uid);
  return updateDoc(userRef, {
    "settings.notificationsEnabled": enabled
  });
};

export const subscribeToNotifications = (uid: string, callback: (notis: AppNotification[]) => void) => {
  const q = query(
    collection(db, "users", uid, "notifications"),
    orderBy("createdAt", "desc"),
    limit(30)
  ).withConverter(converter<AppNotification>());
  
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => doc.data()));
  });
};

/**
 * Contact Form
 */
export const sendContactMessage = async (message: { name?: string; email: string; purpose: string; message: string }) => {
  return addDoc(collection(db, "contactMessages"), {
    name: (message.name || "").slice(0, 100),
    email: message.email.slice(0, 200),
    purpose: message.purpose.slice(0, 50),
    message: message.message.slice(0, 4000),
    createdAt: Timestamp.now()
  });
};

/**
 * Chat Helpers
 *
 * Photos and voice notes are squeezed on the device and stored inside the message itself, so chat
 * needs no file storage. The security rules cap how large one message can be.
 */
const toChat = (d: QueryDocumentSnapshot): ChatMessage => {
  const data = d.data({ serverTimestamps: "estimate" });
  return {
    ...data,
    id: d.id,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
    pending: d.metadata.hasPendingWrites,
  } as ChatMessage;
};

// The newest `count` messages, oldest first
export const subscribeToChat = (coupleId: string, count: number, callback: (messages: ChatMessage[], mayHaveMore: boolean) => void) => {
  const q = query(collection(db, "couples", coupleId, "chat"), orderBy("createdAt", "asc"), limitToLast(count));
  return onSnapshot(q, { includeMetadataChanges: true }, (snap) => {
    callback(snap.docs.map(toChat), snap.size >= count);
  });
};

// Everything this person has saved, newest first. Sorted here so no extra database index is needed.
export const subscribeToSavedChat = (coupleId: string, uid: string, callback: (messages: ChatMessage[]) => void) => {
  const q = query(collection(db, "couples", coupleId, "chat"), where("savedBy", "array-contains", uid));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(toChat).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  });
};

export interface ChatDraft {
  kind: ChatKind;
  text?: string;
  mime?: string;
  data?: string;
  w?: number;
  h?: number;
  dur?: number;
}

const chatPreview = (draft: ChatDraft) =>
  draft.kind === "image" ? "Sent a photo" : draft.kind === "voice" ? "Sent a voice note" : (draft.text || "").slice(0, 100);

/**
 * Add a message and update the chat summary on the couple in one go. The partner gets a
 * notification only when this starts a new burst, not for every line.
 */
export const sendChatMessage = async (
  coupleId: string,
  uid: string,
  draft: ChatDraft,
  opts: { partnerUid?: string; name?: string; notify?: boolean } = {}
) => {
  const fields: Record<string, unknown> = { kind: draft.kind };
  for (const key of ["text", "mime", "data", "w", "h", "dur"] as const) {
    if (draft[key] !== undefined) fields[key] = draft[key];
  }
  const now = new Date().toISOString();
  const batch = writeBatch(db);
  batch.set(doc(collection(db, "couples", coupleId, "chat")), { ...fields, senderUid: uid, createdAt: serverTimestamp() });
  batch.update(doc(db, "couples", coupleId), {
    chatLastAt: now,
    chatLastBy: uid,
    chatLastKind: draft.kind,
    [`chatSeen.${uid}`]: now,
  });
  await batch.commit();

  if (opts.notify && opts.partnerUid) {
    notifyPartner(opts.partnerUid, {
      uid: opts.partnerUid,
      type: "CHAT",
      title: opts.name || "New message",
      body: chatPreview(draft),
    });
  }
};

// Remember how far this person has read. It never moves backwards.
export const markChatSeen = (coupleId: string, uid: string, lastAt?: string) => {
  const now = new Date().toISOString();
  return updateDoc(doc(db, "couples", coupleId), {
    [`chatSeen.${uid}`]: lastAt && lastAt > now ? lastAt : now,
  });
};

export const setChatMessageSaved = (coupleId: string, messageId: string, uid: string, saved: boolean) =>
  updateDoc(doc(db, "couples", coupleId, "chat", messageId), { savedBy: saved ? arrayUnion(uid) : arrayRemove(uid) });

export const deleteChatMessage = (coupleId: string, messageId: string) =>
  deleteDoc(doc(db, "couples", coupleId, "chat", messageId));
