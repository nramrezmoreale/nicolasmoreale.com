import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decodeWords, encodePhrase, parseMailbox, rewrite } from '../lambda/forward-email/rewrite.mjs';

const opts = { from: 'hello@nicolasmoreale.com', label: 'nicolasmoreale.com' };
const msg = (lines, body = 'Hi Nico,\r\n\r\nCan we talk?\r\n') => Buffer.from(`${lines.join('\r\n')}\r\n\r\n${body}`, 'latin1');
const headersOf = (buf) => buf.toString('latin1').split('\r\n\r\n')[0];
const bodyOf = (buf) => buf.toString('latin1').split('\r\n\r\n').slice(1).join('\r\n\r\n');

test('moves the sender to Reply-To and sends from the verified address', () => {
  const out = rewrite(
    msg([
      'Return-Path: <jane@example.com>',
      'DKIM-Signature: v=1; a=rsa-sha256; d=example.com;',
      '\tb=abc123',
      'From: Jane Doe <jane@example.com>',
      'To: hello@nicolasmoreale.com',
      'Subject: Amazon Connect project',
      'Message-ID: <123@example.com>',
      'Content-Type: text/plain; charset=utf-8',
    ]),
    opts,
  );
  const h = headersOf(out);
  assert.match(h, /^From: "Jane Doe via nicolasmoreale\.com" <hello@nicolasmoreale\.com>$/m);
  assert.match(h, /^Reply-To: Jane Doe <jane@example\.com>$/m);
  assert.match(h, /^X-Original-From: Jane Doe <jane@example\.com>$/m);
  assert.match(h, /^Subject: Amazon Connect project$/m);
  assert.match(h, /^To: hello@nicolasmoreale\.com$/m);
  assert.doesNotMatch(h, /Return-Path|DKIM-Signature|b=abc123|Message-ID/i);
  assert.equal(bodyOf(out), 'Hi Nico,\r\n\r\nCan we talk?\r\n');
});

test('keeps an existing Reply-To', () => {
  const h = headersOf(
    rewrite(msg(['From: "Bot" <noreply@example.com>', 'Reply-To: support@example.com', 'Subject: x']), opts),
  );
  assert.match(h, /^Reply-To: support@example\.com$/m);
  assert.equal(h.match(/^Reply-To:/gim).length, 1);
  assert.match(h, /^From: "Bot via nicolasmoreale\.com" </m);
});

test('handles encoded and non-ASCII names', () => {
  const h = headersOf(rewrite(msg(['From: =?UTF-8?B?Sm9zw6kgTMOzcGV6?= <jose@example.es>', 'Subject: hola']), opts));
  const from = h.match(/^From: ([\s\S]*?)(?=\r\n\S)/m)[1];
  assert.equal(decodeWords(from.replace(/\r\n /g, ' ').replace(/ <.*$/, '')), 'José López via nicolasmoreale.com');
  assert.match(h, /^Reply-To: =\?UTF-8\?B\?Sm9zw6kgTMOzcGV6\?= <jose@example\.es>$/m);
  for (const line of h.split('\r\n')) assert.ok(line.length <= 998);
});

test('keeps folded headers and binary bodies intact', () => {
  const body = Buffer.from([0xff, 0x00, 0x0d, 0x0a, 0xc3, 0xa9]);
  const raw = Buffer.concat([
    Buffer.from('From: a@b.co\r\nSubject: a very long\r\n subject line\r\nReferences: <1@x>\r\n\t<2@x>\r\n\r\n', 'latin1'),
    body,
  ]);
  const out = rewrite(raw, opts);
  assert.ok(out.subarray(out.length - body.length).equals(body));
  const h = headersOf(out);
  assert.match(h, /^Subject: a very long\r\n subject line$/m);
  assert.match(h, /^References: <1@x>\r\n\t<2@x>$/m);
  assert.match(h, /^From: "a@b\.co via nicolasmoreale\.com" <hello@nicolasmoreale\.com>$/m);
});

test('works with bare LF line endings', () => {
  const out = rewrite(Buffer.from('From: x@y.z\nSubject: s\n\nbody\n'), opts).toString();
  assert.equal(out, 'From: "x@y.z via nicolasmoreale.com" <hello@nicolasmoreale.com>\nReply-To: x@y.z\nX-Original-From: x@y.z\nSubject: s\n\nbody\n');
});

test('adds a From when the message has none', () => {
  const h = headersOf(rewrite(msg(['Subject: no sender']), opts));
  assert.match(h, /^From: "Unknown sender via nicolasmoreale\.com" <hello@nicolasmoreale\.com>$/m);
  assert.doesNotMatch(h, /Reply-To/);
});

test('parses the usual From shapes', () => {
  assert.deepEqual(parseMailbox('"Doe, Jane" <jane@x.com>'), { name: 'Doe, Jane', address: 'jane@x.com' });
  assert.deepEqual(parseMailbox('<jane@x.com>'), { name: '', address: 'jane@x.com' });
  assert.deepEqual(parseMailbox('jane@x.com (Jane Doe)'), { name: 'Jane Doe', address: 'jane@x.com' });
  assert.deepEqual(parseMailbox('=?iso-8859-1?Q?Fran=E7ois?= <f@x.fr>'), { name: 'François', address: 'f@x.fr' });
  // Raw UTF-8 bytes in the header, as SES stores them (read as Latin-1).
  assert.deepEqual(parseMailbox(Buffer.from('Zoë <z@x.com>').toString('latin1')), { name: 'Zoë', address: 'z@x.com' });
});

test('splits long non-ASCII names into short encoded words', () => {
  const words = encodePhrase('Ñandú '.repeat(20)).split('\r\n ');
  assert.ok(words.length > 1);
  for (const w of words) assert.ok(w.length <= 75, w);
  assert.equal(decodeWords(words.join(' ')), 'Ñandú '.repeat(20));
});
