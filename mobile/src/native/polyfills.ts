// Runs before anything else (see index.ts). The shared chat encryption (lib/e2eeCrypto.ts) is written against the
// standard WebCrypto API; react-native-quick-crypto provides the same API natively (ECDH, HKDF, PBKDF2, AES-GCM in
// C++), so messages encrypted here and in a browser are byte-for-byte the same format.
import { install } from "react-native-quick-crypto";

install();

// Hermes ships TextEncoder; TextDecoder is only needed for UTF-8, so fill it in if this runtime lacks it.
type Decoder = { decode(input?: ArrayBufferView | ArrayBuffer): string };
const g = globalThis as unknown as { TextDecoder?: new () => Decoder };

if (typeof g.TextDecoder === "undefined") {
  class Utf8Decoder implements Decoder {
    decode(input?: ArrayBufferView | ArrayBuffer): string {
      if (!input) return "";
      const bytes = input instanceof ArrayBuffer
        ? new Uint8Array(input)
        : new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
      let out = "";
      for (let i = 0; i < bytes.length;) {
        const b = bytes[i++];
        let cp: number;
        if (b < 0x80) cp = b;
        else if (b >= 0xc0 && b < 0xe0) cp = ((b & 0x1f) << 6) | (bytes[i++] & 0x3f);
        else if (b >= 0xe0 && b < 0xf0) cp = ((b & 0x0f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f);
        else if (b >= 0xf0) cp = ((b & 0x07) << 18) | ((bytes[i++] & 0x3f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f);
        else cp = 0xfffd;
        out += String.fromCodePoint(cp);
      }
      return out;
    }
  }
  g.TextDecoder = Utf8Decoder;
}
