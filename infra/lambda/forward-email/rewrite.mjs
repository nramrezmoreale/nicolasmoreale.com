// Turns a message received by SES into one SES can send on to a personal inbox.
//
// SES only sends mail From an address the account has verified, so the original
// sender moves to Reply-To and the display name says who wrote it:
//   From: "Jane Doe via nicolasmoreale.com" <hello@nicolasmoreale.com>
//   Reply-To: Jane Doe <jane@example.com>
// Replying in Gmail then goes straight to Jane. The body is passed through untouched.

// Headers SES rejects or that would be wrong once the message is resent.
const DROP = new Set(['return-path', 'sender', 'message-id', 'dkim-signature', 'domainkey-signature']);

/**
 * @param {Buffer} raw The message exactly as SES stored it.
 * @param {{ from: string, label: string }} options `from` is the verified address to send from,
 *   `label` is appended to the sender's name ("Jane Doe via <label>").
 * @returns {Buffer}
 */
export function rewrite(raw, { from, label }) {
  const { headerEnd, eol } = findHeaderEnd(raw);
  const fields = parseFields(raw.subarray(0, headerEnd).toString('latin1'));
  const body = raw.subarray(headerEnd);

  const original = fields.find((f) => f.name.toLowerCase() === 'from');
  const hasReplyTo = fields.some((f) => f.name.toLowerCase() === 'reply-to');
  const sender = original ? parseMailbox(unfold(original)) : null;
  const who = sender ? sender.name || sender.address : 'Unknown sender';

  const out = [];
  for (const field of fields) {
    const name = field.name.toLowerCase();
    if (DROP.has(name)) continue;
    if (name === 'from') {
      out.push(`From: ${encodePhrase(`${who} via ${label}`, eol)} <${from}>`);
      // Keep the original header bytes (folding, encoded words) for Reply-To.
      if (!hasReplyTo) out.push(renamed(field, 'Reply-To', eol));
      out.push(renamed(field, 'X-Original-From', eol));
      continue;
    }
    out.push(field.lines.join(eol));
  }
  if (!original) out.unshift(`From: ${encodePhrase(`${who} via ${label}`, eol)} <${from}>`);

  return Buffer.concat([Buffer.from(out.join(eol), 'latin1'), body]);
}

/** Index where the header block ends (the blank line stays with the body) and the line ending in use. */
function findHeaderEnd(raw) {
  const crlf = raw.indexOf('\r\n\r\n');
  const lf = raw.indexOf('\n\n');
  if (crlf !== -1 && (lf === -1 || crlf < lf)) return { headerEnd: crlf, eol: '\r\n' };
  if (lf !== -1) return { headerEnd: lf, eol: '\n' };
  return { headerEnd: raw.length, eol: '\r\n' };
}

/** Splits a header block into fields, keeping each field's original (folded) lines. */
function parseFields(text) {
  const fields = [];
  for (const line of text.split(/\r?\n/)) {
    if (/^[ \t]/.test(line) && fields.length) {
      fields[fields.length - 1].lines.push(line);
    } else if (line.includes(':')) {
      fields.push({ name: line.slice(0, line.indexOf(':')).trim(), lines: [line] });
    } else if (line.length && fields.length) {
      // Malformed line: keep it with the previous field rather than lose it.
      fields[fields.length - 1].lines.push(` ${line}`);
    }
  }
  return fields;
}

function unfold(field) {
  const value = field.lines.join('\r\n').slice(field.lines[0].indexOf(':') + 1);
  return value.replace(/\r?\n(?=[ \t])/g, '').trim();
}

function renamed(field, name, eol) {
  const [first, ...rest] = field.lines;
  return [`${name}:${first.slice(first.indexOf(':') + 1)}`, ...rest].join(eol);
}

/** Display name and address from a From value such as `"Jane" <jane@x.com>` or `jane@x.com (Jane)`. */
export function parseMailbox(value) {
  const text = toUnicode(value);
  const angle = text.match(/<([^<>]*)>/);
  if (angle) {
    const name = decodeWords(unquote(text.slice(0, angle.index).trim()));
    return { name: clean(name), address: angle[1].trim() };
  }
  const address = (text.match(/[^\s<>"(),;:]+@[^\s<>"(),;:]+/) || [''])[0];
  const comment = text.match(/\(([^()]*)\)/);
  return { name: clean(comment ? decodeWords(comment[1]) : ''), address };
}

// Raw 8-bit header bytes are usually UTF-8; fall back to Latin-1 if they aren't.
function toUnicode(latin1) {
  const utf8 = Buffer.from(latin1, 'latin1').toString('utf8');
  return utf8.includes('\uFFFD') && !latin1.includes('\uFFFD') ? latin1 : utf8;
}

function unquote(text) {
  const m = text.match(/^"((?:[^"\\]|\\.)*)"$/);
  return m ? m[1].replace(/\\(.)/g, '$1') : text;
}

/** Decodes RFC 2047 encoded words (=?charset?B|Q?text?=). */
export function decodeWords(text) {
  return text
    .replace(/(=\?[^?]+\?[BbQq]\?[^?]*\?=)\s+(?==\?[^?]+\?[BbQq]\?[^?]*\?=)/g, '$1')
    .replace(/=\?([^?*]+)(?:\*[^?]*)?\?([BbQq])\?([^?]*)\?=/g, (word, charset, encoding, data) => {
      try {
        const bytes =
          encoding.toUpperCase() === 'B'
            ? Buffer.from(data, 'base64')
            : Buffer.from(
                data.replace(/_/g, ' ').replace(/=([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16))),
                'latin1',
              );
        return new TextDecoder(charset.trim().toLowerCase()).decode(bytes);
      } catch {
        return word;
      }
    });
}

function clean(text) {
  return text.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

/** A display name as a quoted string, or as UTF-8 encoded words when it isn't plain ASCII. */
export function encodePhrase(text, eol = '\r\n') {
  if (/^[\x20-\x7E]*$/.test(text)) return `"${text.replace(/["\\]/g, '\\$&')}"`;
  const words = [];
  let chunk = '';
  for (const char of text) {
    // 45 bytes of UTF-8 -> 60 base64 characters, keeping each encoded word under 75.
    if (Buffer.byteLength(chunk + char) > 45) {
      words.push(chunk);
      chunk = '';
    }
    chunk += char;
  }
  if (chunk) words.push(chunk);
  return words.map((w) => `=?UTF-8?B?${Buffer.from(w).toString('base64')}?=`).join(`${eol} `);
}
