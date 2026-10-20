// Engineering blog: short, abstracted write-ups of how pieces of this product are built. Content
// is deliberately generic — no internal file names, schema, or infrastructure details — since these
// pages are public and meant to be a readable case study, not documentation.
export type BlogCodeBlock = { label: string; snippet: string };
export type BlogSection = { id: string; heading: string; paragraphs: string[]; code?: BlogCodeBlock };
export type BlogPost = {
  id: string;
  title: string;
  dek: string;
  date: string; // ISO
  readMins: number;
  sections: BlogSection[];
};

export const blogPosts: BlogPost[] = [
  {
    id: "private-by-design-chat",
    title: "Private by design: building a chat feature nobody but the two of you can read",
    dek: "A walkthrough of how a small chat feature can be built so that messages are unreadable to the server that stores them — and the trade-offs that come with that choice.",
    date: "2026-10-20",
    readMins: 9,
    sections: [
      {
        id: "intro",
        heading: "The problem with a normal chat feature",
        paragraphs: [
          "Most chat features are built the easy way: a message gets typed on one device, sent to a server, stored in a database, and handed to the other device on request. That works well, and it's how the vast majority of chat products on the web are built. But it has one quiet property worth naming out loud — the server, and anyone with access to it, can read every message that ever passes through.",
          "For a feature meant to feel like a private, just-between-two-people space, that property matters. The fix isn't a bigger server or a stricter access policy — those still leave a single point that can read everything. The fix is to change what gets stored in the first place: store only data that is unreadable without something the server never has.",
        ],
      },
      {
        id: "keys",
        heading: "Giving every device its own private key",
        paragraphs: [
          "End-to-end encryption starts with each person's device generating its own key pair — a public half and a private half — the first time the feature is used. The public half gets shared freely; it's not a secret, and knowing it doesn't help anyone decrypt anything. The private half never leaves the device it was created on. It's generated using the browser's built-in cryptography APIs, so no cryptographic library needs to be trusted beyond the browser itself.",
          "The private half is also stored in a form the rest of the app's code literally cannot export or print, even by accident — it can be used to do math, but never read back out as raw bytes. That's a small detail, but it closes off an entire category of bugs where a key quietly ends up in a log line or a bug report.",
        ],
        code: {
          label: "Generating a key pair on first use (simplified)",
          snippet:
`const keyPair = await crypto.subtle.generateKey(
  { name: "ECDH", namedCurve: "P-256" },
  false,            // not extractable — can't be read back out
  ["deriveKey"],
);

// Only the public half is ever shared with anyone else
const publicKey = await crypto.subtle.exportKey("jwk", keyPair.publicKey);`,
        },
      },
      {
        id: "exchange",
        heading: "Turning two public keys into one shared secret",
        paragraphs: [
          "Once both people have published their public key, each device combines its own private key with the other person's public key using a well-known piece of math called elliptic-curve Diffie–Hellman. The remarkable property of that math: both sides land on the exact same number, despite neither one ever sending their private key anywhere.",
          "That shared number isn't used directly as an encryption key — it's run through a key-derivation step first, which turns it into a proper, uniformly-random symmetric key. From that point on, encrypting and decrypting is just regular symmetric cryptography, which is faster and simpler than doing everything with the key pairs directly.",
        ],
        code: {
          label: "Deriving one shared key from two key pairs (simplified)",
          snippet:
`const sharedKey = await crypto.subtle.deriveKey(
  { name: "ECDH", public: otherPersonsPublicKey },
  myPrivateKey,
  { name: "AES-GCM", length: 256 },
  false,
  ["encrypt", "decrypt"],
);`,
        },
      },
      {
        id: "encrypt",
        heading: "What actually goes to the server",
        paragraphs: [
          "Every message is encrypted on the sending device before it ever leaves, using the shared symmetric key and a fresh random value for that one message. What reaches the server is ciphertext: ciphertext plus that one-time random value, and nothing else. The server's job shrinks to exactly what it can still do honestly — store an opaque blob, deliver it to the other device, and nothing more. It can't read the content, and it can't tell a one-line message from a long one without comparing sizes, which is one of the trade-offs covered below.",
          "The encryption scheme used here also authenticates the message, not just hides it — any tampering with the stored ciphertext causes decryption to fail outright rather than silently returning garbled content. That's important: encryption without authentication protects secrecy but not integrity.",
        ],
        code: {
          label: "Encrypting one message (simplified)",
          snippet:
`const iv = crypto.getRandomValues(new Uint8Array(12)); // unique per message
const ciphertext = await crypto.subtle.encrypt(
  { name: "AES-GCM", iv },
  sharedKey,
  new TextEncoder().encode(plaintext),
);

// Only { iv, ciphertext } is written to storage`,
        },
      },
      {
        id: "multidevice",
        heading: "The hard part: more than one device",
        paragraphs: [
          "A private key that only exists on one device works fine until someone opens the feature on a second phone, or a new browser, or after reinstalling the app. That device has no key, and — correctly — it has no way to conjure one that matches what's already in use. This is the part of end-to-end encryption that trips up a lot of first attempts, including an earlier version of this one: it's tempting to just generate a fresh key on the new device, but a fresh key doesn't match what anyone's messages were encrypted against, and swapping it in without care can strand every other device.",
          "The approach that holds up is to let a person set a passphrase once, use it to encrypt a backup copy of their private key, and store only that encrypted backup — never the key itself — somewhere both devices can reach. A new device asks for the same passphrase, decrypts the backup locally, and is now holding the real key. The server, at every point, only ever sees an encrypted blob it can't open. The one rule that makes this safe long-term: a key is never treated as the account's real key until its backup exists — otherwise you're back to the one-device problem, just one step removed.",
        ],
      },
      {
        id: "trust",
        heading: "Making key-swapping visible",
        paragraphs: [
          "End-to-end encryption protects content from the server, but it relies on each person actually having the other's real public key. If that exchange were ever quietly tampered with — a compromised server handing out a substituted key, for instance — messages would still encrypt and decrypt without error, just to the wrong recipient. The usual defense is a short fingerprint, computed from both people's public keys, that both sides can see and compare out of band — out loud, over a call, in person. If the numbers match, both sides have each other's genuine key. It costs almost nothing to build and is the only check of its kind, which is why it's worth keeping even though in practice most people never look at it.",
        ],
      },
      {
        id: "honesty",
        heading: "What this doesn't protect, said plainly",
        paragraphs: [
          "A good security design says what it doesn't do, not just what it does. This scheme uses one long-lived shared key per pairing rather than rotating to a fresh key for every message — a technique called forward secrecy. That means a device that is ever compromised, and still holds the current key, can read everything encrypted with it, past and future, not just what comes after the compromise. Building true forward secrecy means a full ratcheting protocol — sequencing, handling of out-of-order delivery, skipped-message recovery — real complexity that buys little for a small, two-person chat feature and a lot for a protocol meant to scale to group messaging across unreliable networks.",
          "It's also worth being honest that encryption hides content, not existence. A server that can't read a message can usually still see that two people exchanged one, roughly when, and roughly how large. Metadata privacy is a different, harder problem, and this design doesn't claim to solve it.",
        ],
      },
      {
        id: "close",
        heading: "The shape of the trade-off",
        paragraphs: [
          "None of this is exotic cryptography — every primitive here (ECDH, AES-GCM, PBKDF2-style key derivation for the passphrase backup) is built into the browser and has been for years. The interesting engineering is almost entirely in the orchestration around it: deciding when a key is allowed to be treated as durable, making sure a lost device degrades gracefully instead of cascading into breaking everyone else's chat, and being plain about what the design does and doesn't guarantee. Picking the smallest honest version of this — rather than importing a general-purpose messaging protocol built for problems this feature doesn't have — is usually the right call for a scoped, two-person feature like this one.",
        ],
      },
    ],
  },
];

export const getBlogPost = (id: string): BlogPost | undefined => blogPosts.find((p) => p.id === id);
