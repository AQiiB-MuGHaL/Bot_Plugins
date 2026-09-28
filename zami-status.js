/**
 * ════════════════════════════════════════════════
 *  ZAMI-MD · STATUS TOOLS
 * ════════════════════════════════════════════════
 *  .save        → status/message pe reply karo, save ho jayega
 *  .autoread on/off   → status auto seen
 *  .autoreact on/off  → status pe auto react 💗 🍷 🍒 🤓
 *  .emojis      → react emojis dekho / badlo
 *
 *  Auto:
 *    • Koi bhi status aate hi AUTO SEEN ✅
 *    • Foran AUTO REACT 💗 🍷 🍒 🤓 (random)
 * ════════════════════════════════════════════════
 */

const fs = require('fs');
const path = require('path');

const CFG = path.join(__dirname, 'zami-status.json');
const DEF = { autoRead: true, autoReact: true, emojis: ['💗','🍷','🍒','🤓'], seen: 0, reacted: 0, saved: 0 };
const load = () => { try { return { ...DEF, ...JSON.parse(fs.readFileSync(CFG,'utf8')) }; } catch { return { ...DEF }; } };
const save = d => { try { fs.writeFileSync(CFG, JSON.stringify(d, null, 2)); } catch {} };

const P   = () => (global.prefix || process.env.PREFIX || '.');
const BOT = () => (global.botName || process.env.BOT_NAME || 'ZAMI-MD');
const num = u => String(u || '').split('@')[0].split(':')[0];

/* ══════════════════════════════════════════
   COMMAND HANDLER  (.save etc)
   ══════════════════════════════════════════ */
async function handler(sock, m) {
  try {
    const body = m.body || '';
    const p = P();
    if (!body.startsWith(p)) return false;

    const args = body.slice(p.length).trim().split(/\s+/);
    const cmd  = (args.shift() || '').toLowerCase();
    const from = m.key.remoteJid;
    const me   = sock.user.id.split(':')[0] + '@s.whatsapp.net';

    const send  = t => sock.sendMessage(from, { text: t }, { quoted: m });
    const react = e => sock.sendMessage(from, { react: { text: e, key: m.key } });
    const db = load();

    switch (cmd) {

      /* ───────── SAVE STATUS ───────── */
      case 'save': case 'sv': case 'take': case 'steal': {
        const ctx = m.message?.extendedTextMessage?.contextInfo;
        const q   = ctx?.quotedMessage;

        if (!q) {
          await send(`❌ *Kisi status/message pe reply karke* *${p}save* likho`);
          return true;
        }

        await react('⏳');

        const owner = ctx.participant || from;
        const type  = Object.keys(q)[0];
        const cap   = q[type]?.caption || q.conversation || q.extendedTextMessage?.text || '';
        const info  = `\n\n╭──〔 💾 *SAVED* 〕──╮\n│ 👤 wa.me/${num(owner)}\n│ ⏰ ${new Date().toLocaleString()}\n╰──────────────────╯\n${cap ? '\n📝 ' + cap : ''}\n👑 ${BOT()}`;

        try {
          /* ── TEXT ── */
          if (type === 'conversation' || type === 'extendedTextMessage') {
            const t = q.conversation || q.extendedTextMessage?.text || '';
            await sock.sendMessage(me, { text: `💾 *SAVED STATUS*\n\n${t}${info}` });
          }
          /* ── MEDIA (image / video / audio / sticker / document) ── */
          else {
            const { downloadContentFromMessage } = require('baileys').downloadContentFromMessage
              ? require('baileys')
              : require('@whiskeysockets/baileys');

            const map = {
              imageMessage: 'image', videoMessage: 'video',
              audioMessage: 'audio', stickerMessage: 'sticker',
              documentMessage: 'document', viewOnceMessage: 'image',
              documentWithCaptionMessage: 'document'
            };
            const kind = map[type] || 'image';

            const stream = await downloadContentFromMessage(q[type], kind);
            let buf = Buffer.from([]);
            for await (const c of stream) buf = Buffer.concat([buf, c]);

            const payload =
              kind === 'image'   ? { image: buf,  caption: `💾 *SAVED*${info}` } :
              kind === 'video'   ? { video: buf,  caption: `💾 *SAVED*${info}` } :
              kind === 'audio'   ? { audio: buf,  mimetype: 'audio/mp4', ptt: !!q[type]?.ptt } :
              kind === 'sticker' ? { sticker: buf } :
                                   { document: buf, fileName: q[type]?.fileName || 'file',
                                     mimetype: q[type]?.mimetype || 'application/octet-stream' };

            await sock.sendMessage(me, payload);
            if (kind === 'audio' || kind === 'sticker')
              await sock.sendMessage(me, { text: `💾 *SAVED*${info}` });
          }

          db.saved++; save(db);
          await react('✅');
          if (from !== me) await send(`✅ *SAVED!*\n_Aapki chat me bhej di gayi_ 💾\n\n📊 Total saved: *${db.saved}*`);

        } catch (e) {
          await react('❌');
          await send(`❌ Save fail: \`${(e?.message||'error').slice(0,80)}\``);
        }
        return true;
      }

      /* ───────── AUTO READ ───────── */
      case 'autoread': case 'autoseen': {
        const v = (args[0]||'').toLowerCase();
        if (v !== 'on' && v !== 'off') {
          await send(`⚙️ Use: *${p}autoread on/off*\n\nAbhi: ${db.autoRead ? '🟢 ON' : '🔴 OFF'}`); return true;
        }
        db.autoRead = v === 'on'; save(db);
        await react('⚙️');
        await send(`╭──〔 👁️ *AUTO SEEN* 〕──╮\n│ Status: ${db.autoRead ? '🟢 *ON*' : '🔴 *OFF*'}\n│ ${db.autoRead ? 'Sab status auto seen honge' : 'Auto seen band'}\n╰──────────────────╯`);
        return true;
      }

      /* ───────── AUTO REACT ───────── */
      case 'autoreact': case 'autolike': {
        const v = (args[0]||'').toLowerCase();
        if (v !== 'on' && v !== 'off') {
          await send(`⚙️ Use: *${p}autoreact on/off*\n\nAbhi: ${db.autoReact ? '🟢 ON' : '🔴 OFF'}\nEmojis: ${db.emojis.join(' ')}`); return true;
        }
        db.autoReact = v === 'on'; save(db);
        await react('⚙️');
        await send(`╭──〔 💗 *AUTO REACT* 〕──╮\n│ Status: ${db.autoReact ? '🟢 *ON*' : '🔴 *OFF*'}\n│ Emojis: ${db.emojis.join(' ')}\n╰──────────────────╯`);
        return true;
      }

      /* ───────── EMOJIS ───────── */
      case 'emojis': case 'setemoji': {
        const rest = args.join(' ').trim();
        if (!rest) {
          await send(`╭──〔 😀 *REACT EMOJIS* 〕──╮\n│ ${db.emojis.join('  ')}\n│\n│ Badalne ke liye:\n│ *${p}emojis 💗 🍷 🍒 🤓*\n╰──────────────────╯`);
          return true;
        }
        const list = [...rest].filter(c => /\p{Extended_Pictographic}/u.test(c));
        if (!list.length) { await send('❌ Koi emoji nahi mila'); return true; }
        db.emojis = [...new Set(list)]; save(db);
        await react('✅');
        await send(`✅ *Emojis set:* ${db.emojis.join(' ')}`);
        return true;
      }

      /* ───────── STATUS STATS ───────── */
      case 'statusinfo': case 'stinfo': {
        await react('📊');
        await send(
`╭━━〔 📊 *STATUS STATS* 〕━━┈⊷
│
│ 👁️ *Auto Seen:* ${db.autoRead ? '🟢 ON' : '🔴 OFF'}
│ 💗 *Auto React:* ${db.autoReact ? '🟢 ON' : '🔴 OFF'}
│ 😀 *Emojis:* ${db.emojis.join(' ')}
│
│ 👀 *Seen:* ${db.seen}
│ 💗 *Reacted:* ${db.reacted}
│ 💾 *Saved:* ${db.saved}
│
╰━━━━━━━━━━━━━━━━┈⊷
👑 ${BOT()}`);
        return true;
      }
    }
    return false;
  } catch (e) {
    console.log('[zami-status]', e?.message);
    return false;
  }
}

/* ══════════════════════════════════════════
   AUTO SEEN + AUTO REACT  (background)
   ══════════════════════════════════════════ */
function watch(sock) {
  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const msg of messages || []) {
      try {
        if (msg.key?.remoteJid !== 'status@broadcast') continue;
        if (msg.key?.fromMe) continue;

        const db = load();
        const me = sock.user.id;

        /* 👁️ AUTO SEEN */
        if (db.autoRead) {
          await sock.readMessages([msg.key]).catch(() => {});
          db.seen++;
        }

        /* 💗 AUTO REACT — foran */
        if (db.autoReact) {
          const emoji = db.emojis[Math.floor(Math.random() * db.emojis.length)];
          const owner = msg.key.participant || msg.participant;

          await sock.sendMessage('status@broadcast', {
            react: { text: emoji, key: msg.key }
          }, {
            statusJidList: [owner, me].filter(Boolean)
          }).catch(async () => {
            // fallback (purane baileys)
            await sock.sendMessage('status@broadcast', {
              react: { text: emoji, key: msg.key }
            }).catch(() => {});
          });

          db.reacted++;
        }

        save(db);
      } catch {}
    }
  });
}

module.exports = { handler, watch, load, save };
module.exports.command = ['save','sv','take','steal','autoread','autoseen','autoreact','autolike','emojis','setemoji','statusinfo'];
module.exports.tags = ['status'];
module.exports.desc = 'Status save + auto seen + auto react';
