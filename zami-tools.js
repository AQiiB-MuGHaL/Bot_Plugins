/**
 * ════════════════════════════════════════════════
 *  ZAMI-MD · AUTOMATION TOOLS PLUGIN
 * ════════════════════════════════════════════════
 *  Commands:
 *    .menu              → saari commands ki list
 *    .leavegc           → group se exit + report
 *    .autoleave on/off  → auto leave mode
 *    .block @user       → user ko block + report
 *    .report @user      → user ko report
 *    .unblock @user     → unblock
 *    .blocklist         → blocked users list
 *
 *  Install: is file ko bot ke `plugins/` folder me daal do
 * ════════════════════════════════════════════════
 */

const fs = require('fs');
const path = require('path');

/* ── settings store ── */
const CFG = path.join(__dirname, 'zami-tools.json');
const load = () => { try { return JSON.parse(fs.readFileSync(CFG,'utf8')); } catch { return { autoLeave:false, autoBlock:false, reports:[] }; } };
const save = d => fs.writeFileSync(CFG, JSON.stringify(d, null, 2));

const P = () => (global.prefix || process.env.PREFIX || '.');
const BOT = () => (global.botName || process.env.BOT_NAME || 'ZAMI-MD');

/* ── helpers ── */
const jid = u => String(u).includes('@') ? u : u.replace(/\D/g,'') + '@s.whatsapp.net';
const num = u => String(u).split('@')[0].split(':')[0];

/* ══ REAL REPORT (WhatsApp spam report) ══
   Baileys me alag alag versions me alag API hai — sab try karte hain */
async function doReport(sock, target, isGroup = false) {
  const ways = [];

  // 1) official-ish: query node
  ways.push(async () => {
    await sock.query({
      tag: 'iq',
      attrs: { to: '@s.whatsapp.net', type: 'set', xmlns: 'w:biz' },
      content: [{
        tag: 'report',
        attrs: { jid: target, reason: 'spam', ...(isGroup ? { type: 'group' } : {}) }
      }]
    });
  });

  // 2) spam report node
  ways.push(async () => {
    await sock.query({
      tag: 'iq',
      attrs: { to: 's.whatsapp.net', type: 'set', xmlns: 'spam' },
      content: [{ tag: 'spam_report', attrs: { jid: target, reason: 'spam' } }]
    });
  });

  // 3) built-in helpers (agar version me hain)
  ways.push(async () => { if (sock.reportSpam) await sock.reportSpam(target); else throw 0; });
  ways.push(async () => { if (sock.report)     await sock.report(target, 'spam'); else throw 0; });

  for (const w of ways) {
    try { await w(); return true; } catch {}
  }
  return false;
}

function target(m) {
  const ctx = m.message?.extendedTextMessage?.contextInfo;
  if (ctx?.mentionedJid?.length) return ctx.mentionedJid[0];
  if (ctx?.participant) return ctx.participant;
  const t = (m.body || '').split(' ').slice(1).join('');
  if (/\d{8,}/.test(t)) return jid(t);
  return null;
}

/* ══════════════════════════════════════════
   MENU
   ══════════════════════════════════════════ */
const MENU = () => `
╭━━〔 *${BOT()}* 〕━━┈⊷
┃ 🤖 *AUTOMATION TOOLS*
╰━━━━━━━━━━━━━━━━┈⊷

╭──〔 👥 *GROUP* 〕
│
│ ⚡ *${P()}leavegc*
│    Group se exit + report
│
│ ⚡ *${P()}autoleave on/off*
│    Auto leave + report mode
│
│ ⚡ *${P()}gcinfo*
│    Group ki details
│
╰────────────────╯

╭──〔 🚫 *USER* 〕
│
│ ⚡ *${P()}block @user*
│    Block + report karo
│
│ ⚡ *${P()}unblock @user*
│    Unblock karo
│
│ ⚡ *${P()}report @user*
│    User ko report karo
│
│ ⚡ *${P()}blocklist*
│    Blocked users list
│
╰────────────────╯

╭──〔 💾 *STATUS* 〕
│
│ ⚡ *${P()}save*
│    Status pe reply → save
│
│ ⚡ *${P()}autoread on/off*
│    Status auto seen 👁️
│
│ ⚡ *${P()}autoreact on/off*
│    Auto react 💗 🍷 🍒 🤓
│
│ ⚡ *${P()}emojis*
│    React emojis badlo
│
│ ⚡ *${P()}statusinfo*
│    Status stats
│
╰────────────────╯

╭──〔 ⚡ *SYSTEM* 〕
│
│ ⚡ *${P()}ping*
│    Bot ki speed check
│
│ ⚡ *${P()}list*
│    Poori command list
│
│ ⚡ *${P()}alive*
│    Bot status
│
╰────────────────╯

╭──〔 ⚙️ *SETTINGS* 〕
│
│ ⚡ *${P()}autoblock on/off*
│    Report par auto block
│
│ ⚡ *${P()}reports*
│    Sab reports dekho
│
│ ⚡ *${P()}clearreports*
│    Reports saaf karo
│
╰────────────────╯

👑 *MADE BY ZAMI* · ${BOT()}
`.trim();

/* ══════════════════════════════════════════
   MAIN HANDLER
   ══════════════════════════════════════════ */
async function handler(sock, m) {
  try {
    const body = m.body || '';
    const p = P();
    if (!body.startsWith(p)) return false;

    // status plugin ke commands
    try {
      const st = require('./zami-status');
      if (await st.handler(sock, m)) return true;
    } catch {}



    const args = body.slice(p.length).trim().split(/\s+/);
    const cmd  = (args.shift() || '').toLowerCase();
    const from = m.key.remoteJid;
    const isGroup = from.endsWith('@g.us');
    const sender = m.key.participant || from;
    const me = sock.user.id.split(':')[0] + '@s.whatsapp.net';
    const isOwner = num(sender) === num(me) || m.key.fromMe;

    const send  = t => sock.sendMessage(from, { text: t }, { quoted: m });
    const react = e => sock.sendMessage(from, { react: { text: e, key: m.key } });

    const db = load();

    switch (cmd) {

      /* ───────── MENU ───────── */
      case 'menu': case 'help': case 'cmd': {
        await react('📜');
        await send(MENU());
        return true;
      }

      /* ───────── PING (speed) ───────── */
      case 'ping': case 'speed': case 'p': {
        const t0 = Date.now();
        await react('⚡');
        const sent = await sock.sendMessage(from, { text: '⚡ _Pinging..._' }, { quoted: m });
        const ms = Date.now() - t0;

        const up = process.uptime();
        const h = Math.floor(up/3600), mn = Math.floor(up%3600/60), s = Math.floor(up%60);
        const mem = process.memoryUsage();
        const mb = n => (n/1048576).toFixed(1) + ' MB';

        const bar = ms < 300 ? '████████░░ ⚡ SUPER FAST'
                  : ms < 800 ? '██████░░░░ 🟢 FAST'
                  : ms < 2000 ? '████░░░░░░ 🟡 NORMAL'
                  : '██░░░░░░░░ 🔴 SLOW';

        await sock.sendMessage(from, {
          text:
`╭━━〔 ⚡ *PING* 〕━━┈⊷
│
│ 🚀 *Speed:* ${ms} ms
│ 📊 ${bar}
│
│ ⏱️ *Uptime:* ${h}h ${mn}m ${s}s
│ 💾 *RAM:* ${mb(mem.heapUsed)} / ${mb(mem.rss)}
│ 🖥️ *Node:* ${process.version}
│ 💻 *Platform:* ${process.platform}
│
╰━━━━━━━━━━━━━━━━┈⊷

👑 *${BOT()}* is online ✅`,
          edit: sent.key
        }).catch(async () => {
          await send(`⚡ *PING*\n\n🚀 Speed: *${ms} ms*\n📊 ${bar}\n⏱️ Uptime: ${h}h ${mn}m ${s}s\n💾 RAM: ${mb(mem.heapUsed)}\n\n👑 ${BOT()}`);
        });
        return true;
      }

      /* ───────── LIST (total commands) ───────── */
      case 'list': case 'allmenu': case 'commands': {
        await react('📋');
        const all = [
          { c:'save',        d:'Status save (reply)',   t:'💾 STATUS' },
          { c:'autoread',    d:'Status auto seen',      t:'💾 STATUS' },
          { c:'autoreact',   d:'Auto react 💗🍷🍒🤓',   t:'💾 STATUS' },
          { c:'emojis',      d:'React emojis badlo',    t:'💾 STATUS' },
          { c:'statusinfo',  d:'Status stats',          t:'💾 STATUS' },
          { c:'menu',        d:'Main menu',             t:'📜 SYSTEM' },
          { c:'list',        d:'Poori command list',    t:'📜 SYSTEM' },
          { c:'ping',        d:'Bot speed check',       t:'📜 SYSTEM' },
          { c:'alive',       d:'Bot status',            t:'📜 SYSTEM' },
          { c:'leavegc',     d:'Group exit + report',   t:'👥 GROUP'  },
          { c:'autoleave',   d:'Auto exit + report',    t:'👥 GROUP'  },
          { c:'gcinfo',      d:'Group details',         t:'👥 GROUP'  },
          { c:'block',       d:'Block + report user',   t:'🚫 USER'   },
          { c:'unblock',     d:'Unblock user',          t:'🚫 USER'   },
          { c:'report',      d:'Report user',           t:'🚫 USER'   },
          { c:'blocklist',   d:'Blocked users',         t:'🚫 USER'   },
          { c:'autoblock',   d:'Auto block on report',  t:'⚙️ SETTINGS'},
          { c:'reports',     d:'Reports log',           t:'⚙️ SETTINGS'},
          { c:'clearreports',d:'Clear reports',         t:'⚙️ SETTINGS'}
        ];

        const cats = [...new Set(all.map(x => x.t))];
        let out =
`╭━━〔 📋 *COMMAND LIST* 〕━━┈⊷
┃ 🤖 *${BOT()}*
┃ 📊 Total: *${all.length}* commands
┃ 🔣 Prefix: *${p}*
╰━━━━━━━━━━━━━━━━┈⊷
`;
        let i = 0;
        for (const c of cats) {
          out += `\n╭──〔 *${c}* 〕\n│\n`;
          for (const x of all.filter(a => a.t === c))
            out += `│ ${String(++i).padStart(2,'0')}. *${p}${x.c}*\n│     ${x.d}\n`;
          out += `│\n╰────────────────╯\n`;
        }
        out += `\n👑 *MADE BY ZAMI* · ${BOT()}`;
        await send(out);
        return true;
      }

      /* ───────── ALIVE ───────── */
      case 'alive': case 'status': case 'bot': {
        await react('🤖');
        const up = process.uptime();
        const h = Math.floor(up/3600), mn = Math.floor(up%3600/60), s = Math.floor(up%60);
        await send(
`╭━━〔 🤖 *${BOT()}* 〕━━┈⊷
│
│ ✅ *Status:* Online & Active
│ ⏱️ *Uptime:* ${h}h ${mn}m ${s}s
│ 💾 *RAM:* ${(process.memoryUsage().heapUsed/1048576).toFixed(1)} MB
│ 🔣 *Prefix:* ${p}
│ 📊 *Reports:* ${db.reports.length}
│ 🚪 *Auto Leave:* ${db.autoLeave ? '🟢 ON' : '🔴 OFF'}
│ 🚫 *Auto Block:* ${db.autoBlock ? '🟢 ON' : '🔴 OFF'}
│
╰━━━━━━━━━━━━━━━━┈⊷

_Type *${p}menu* for commands_
👑 *MADE BY ZAMI*`);
        return true;
      }

      /* ───────── GROUP EXIT + REPORT ───────── */
      case 'leavegc': case 'left': case 'exitgc': {
        if (!isGroup) { await send('❌ Ye command sirf group me chalti hai'); return true; }
        if (!isOwner) { await send('❌ Sirf owner use kar sakta hai'); return true; }

        await react('🚪');
        const meta = await sock.groupMetadata(from).catch(() => null);
        const gname = meta?.subject || 'Unknown';

        // 1️⃣ pehle REPORT (leave ke baad report nahi hota!)
        const rep = await doReport(sock, from, true);

        // 2️⃣ phir message
        await send(
`╭──〔 🚪 *LEAVING GROUP* 〕──╮
│
│ 📛 *Group:* ${gname}
│ 👥 *Members:* ${meta?.participants?.length || '?'}
│ 📤 *Reported:* ${rep ? '✅' : '⚠️ partial'}
│ ⏰ ${new Date().toLocaleString()}
│
╰──────────────────╯

👋 *${BOT()} is leaving...*`).catch(() => {});

        db.reports.push({ type: 'group', id: from, name: gname, action: 'leave', at: Date.now() });
        save(db);

        // 3️⃣ owner ko log (leave se PEHLE)
        await sock.sendMessage(me, {
          text: `🚪 *GROUP LEFT + REPORTED*\n\n📛 ${gname}\n👥 ${meta?.participants?.length || '?'} members\n📤 Report: ${rep ? '✅' : '⚠️'}\n🆔 ${from}\n⏰ ${new Date().toLocaleString()}`
        }).catch(() => {});

        // 4️⃣ aakhir me LEAVE
        await new Promise(r => setTimeout(r, 1500));
        try { await sock.groupLeave(from); } catch (e) { console.log('leave fail', e?.message); }
        return true;
      }

      /* ───────── AUTO LEAVE ───────── */
      case 'autoleave': {
        if (!isOwner) { await send('❌ Owner only'); return true; }
        const v = (args[0] || '').toLowerCase();
        if (v !== 'on' && v !== 'off') { await send(`⚙️ Use: *${p}autoleave on* / *${p}autoleave off*\n\nAbhi: ${db.autoLeave ? '🟢 ON' : '🔴 OFF'}`); return true; }
        db.autoLeave = v === 'on'; save(db);
        await react('⚙️');
        await send(`╭──〔 ⚙️ *AUTO LEAVE* 〕──╮\n│\n│ Status: ${db.autoLeave ? '🟢 *ON*' : '🔴 *OFF*'}\n│ ${db.autoLeave ? 'Naye groups se auto exit + report' : 'Auto leave band'}\n│\n╰──────────────────╯`);
        return true;
      }

      /* ───────── BLOCK + REPORT ───────── */
      case 'block': case 'ban': {
        if (!isOwner) { await send('❌ Owner only'); return true; }
        const u = target(m);
        if (!u) { await send(`❌ Use: *${p}block @user*\nya reply karke *${p}block*`); return true; }

        await react('🚫');

        // 1️⃣ pehle report (block ke baad report fail hota hai)
        const rep = await doReport(sock, u, false);

        // 2️⃣ phir block
        let blocked = true;
        try { await sock.updateBlockStatus(u, 'block'); }
        catch (e) { blocked = false; console.log('block fail', e?.message); }

        db.reports.push({ type: 'user', id: u, action: 'block', at: Date.now() });
        save(db);

        await send(
`╭──〔 🚫 *USER BLOCKED* 〕──╮
│
│ 👤 *User:* wa.me/${num(u)}
│ 🚫 *Blocked:* ${blocked ? '✅' : '❌'}
│ 📤 *Reported:* ${rep ? '✅' : '⚠️ partial'}
│ 📊 *Total:* ${db.reports.length}
│ ⏰ ${new Date().toLocaleString()}
│
╰──────────────────╯

_Ab ye aapko message nahi kar sakta_`);
        return true;
      }

      /* ───────── UNBLOCK ───────── */
      case 'unblock': case 'unban': {
        if (!isOwner) { await send('❌ Owner only'); return true; }
        const u = target(m);
        if (!u) { await send(`❌ Use: *${p}unblock @user*`); return true; }
        await react('✅');
        try { await sock.updateBlockStatus(u, 'unblock'); } catch {}
        await send(`✅ *UNBLOCKED*\n\n👤 wa.me/${num(u)}\n_Ab ye message kar sakta hai_`);
        return true;
      }

      /* ───────── REPORT ONLY ───────── */
      case 'report': case 'spam': {
        if (!isOwner) { await send('❌ Owner only'); return true; }
        const u = target(m);
        if (!u) { await send(`❌ Use: *${p}report @user*\nya reply karke *${p}report*`); return true; }

        await react('📤');
        const rep = await doReport(sock, u, false);

        db.reports.push({ type: 'user', id: u, action: 'report', at: Date.now() });
        if (db.autoBlock) { try { await sock.updateBlockStatus(u, 'block'); } catch {} }
        save(db);

        await send(
`╭──〔 📤 *USER REPORTED* 〕──╮
│
│ 👤 *User:* wa.me/${num(u)}
│ 📤 *Reported:* ${rep ? '✅' : '⚠️ partial'}
│ 🚫 *Auto Block:* ${db.autoBlock ? '✅' : '❌'}
│ 📊 *Total reports:* ${db.reports.length}
│ ⏰ ${new Date().toLocaleString()}
│
╰──────────────────╯`);
        return true;
      }

      /* ───────── AUTO BLOCK ───────── */
      case 'autoblock': {
        if (!isOwner) { await send('❌ Owner only'); return true; }
        const v = (args[0] || '').toLowerCase();
        if (v !== 'on' && v !== 'off') { await send(`⚙️ Use: *${p}autoblock on/off*\n\nAbhi: ${db.autoBlock ? '🟢 ON' : '🔴 OFF'}`); return true; }
        db.autoBlock = v === 'on'; save(db);
        await react('⚙️');
        await send(`⚙️ *AUTO BLOCK:* ${db.autoBlock ? '🟢 ON' : '🔴 OFF'}\n_${db.autoBlock ? 'Report karte hi block ho jayega' : 'Sirf report hoga'}_`);
        return true;
      }

      /* ───────── BLOCKLIST ───────── */
      case 'blocklist': case 'blocked': {
        if (!isOwner) { await send('❌ Owner only'); return true; }
        await react('📋');
        const list = await sock.fetchBlocklist().catch(() => []);
        if (!list.length) { await send('📋 *BLOCKLIST*\n\n_Koi user blocked nahi_'); return true; }
        await send(`╭──〔 📋 *BLOCKLIST* 〕──╮\n│\n${list.map((u,i)=>`│ ${i+1}. wa.me/${num(u)}`).join('\n')}\n│\n│ 📊 Total: *${list.length}*\n╰──────────────────╯`);
        return true;
      }

      /* ───────── REPORTS LOG ───────── */
      case 'reports': {
        if (!isOwner) { await send('❌ Owner only'); return true; }
        await react('📊');
        if (!db.reports.length) { await send('📊 *REPORTS*\n\n_Koi report nahi_'); return true; }
        const last = db.reports.slice(-15).reverse();
        await send(`╭──〔 📊 *REPORTS LOG* 〕──╮\n│\n${last.map((r,i)=>
`│ ${i+1}. ${r.type==='group'?'👥':'👤'} ${r.name || num(r.id)}\n│    ${r.action||'left'} · ${new Date(r.at).toLocaleDateString()}`).join('\n')}\n│\n│ 📊 Total: *${db.reports.length}*\n╰──────────────────╯`);
        return true;
      }

      case 'clearreports': {
        if (!isOwner) { await send('❌ Owner only'); return true; }
        db.reports = []; save(db);
        await react('🗑️');
        await send('🗑️ *Reports saaf ho gaye*');
        return true;
      }

      /* ───────── GROUP INFO ───────── */
      case 'gcinfo': case 'groupinfo': {
        if (!isGroup) { await send('❌ Sirf group me'); return true; }
        await react('ℹ️');
        const meta = await sock.groupMetadata(from).catch(() => null);
        if (!meta) { await send('❌ Info nahi mili'); return true; }
        const admins = meta.participants.filter(x => x.admin).length;
        await send(
`╭──〔 ℹ️ *GROUP INFO* 〕──╮
│
│ 📛 *Name:* ${meta.subject}
│ 👥 *Members:* ${meta.participants.length}
│ 👑 *Admins:* ${admins}
│ 🆔 *ID:* ${meta.id}
│ 🔒 *Locked:* ${meta.announce ? 'Yes' : 'No'}
│
╰──────────────────╯`);
        return true;
      }
    }
    return false;
  } catch (e) {
    console.log('[zami-tools]', e?.message);
    return false;
  }
}

/* ══════════════════════════════════════════
   AUTO LEAVE — naye group me add hone par
   ══════════════════════════════════════════ */
function watch(sock) {
  sock.ev.on('groups.upsert', async (groups) => {
    const db = load();
    if (!db.autoLeave) return;
    for (const g of groups) {
      try {
        const me = sock.user.id.split(':')[0] + '@s.whatsapp.net';

        await sock.sendMessage(g.id, {
          text: `🚫 *AUTO LEAVE ACTIVE*\n\n_${BOT()} is leaving & reporting this group._\n\n👑 ZAMI-MD`
        }).catch(() => {});

        await new Promise(r => setTimeout(r, 1200));

        // report PEHLE, leave BAAD me
        const rep = await doReport(sock, g.id, true);

        db.reports.push({ type: 'group', id: g.id, name: g.subject || '?', action: 'autoleave', at: Date.now() });
        save(db);

        await sock.sendMessage(me, {
          text: `🚪 *AUTO LEFT + REPORTED*\n\n📛 ${g.subject || '?'}\n📤 Report: ${rep ? '✅' : '⚠️'}\n🆔 ${g.id}\n⏰ ${new Date().toLocaleString()}`
        }).catch(() => {});

        await new Promise(r => setTimeout(r, 1200));
        await sock.groupLeave(g.id).catch(() => {});
      } catch (e) { console.log('[autoleave]', e?.message); }
    }
  });
}

module.exports = { handler, watch, MENU, load, save };

/* ── agar bot purane format me plugins load karta hai ── */
module.exports.command = ['menu','help','cmd','list','allmenu','commands','ping','speed','alive','status','leavegc','autoleave','block','unblock','report','autoblock','blocklist','reports','clearreports','gcinfo'];
module.exports.tags = ['tools'];
module.exports.desc = 'ZAMI-MD automation tools';
