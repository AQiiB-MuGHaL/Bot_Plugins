# 🤖 ZAMI-MD · BOT PLUGINS

> Ye files sirf **BOT** ke liye hain — pair website se koi taalluq nahi.

---

## 📁 Files (sirf 2)

```
plugins/
 ├── zami-tools.js      ← main (menu, ping, group, block, report)
 └── zami-status.js     ← status (save, auto seen, auto react)
```

> `zami-tools.json` aur `zami-status.json` **khud ban jayengi** — aap mat banana.
> `zami-source.js` agar hai to **delete kar do**: `rm plugins/zami-source.js`

---

## ⚡ Install

### 1. Files copy karo
```bash
cp zami-tools.js  /path/to/bot/plugins/
cp zami-status.js /path/to/bot/plugins/
```

### 2. Bot ke `index.js` me 4 lines

**Upar:**
```js
const zamiTools  = require('./plugins/zami-tools');
const zamiStatus = require('./plugins/zami-status');
```

**Socket banne ke baad:**
```js
const sock = makeWASocket({ ... });

zamiTools.watch(sock);     // auto leave
zamiStatus.watch(sock);    // auto seen + auto react  ⬅️ ZAROORI
```

**Message handler ke andar (sabse pehle):**
```js
sock.ev.on('messages.upsert', async ({ messages }) => {
  const m = messages[0];
  if (!m.message) return;

  m.body = m.message.conversation
        || m.message.extendedTextMessage?.text
        || m.message.imageMessage?.caption
        || m.message.videoMessage?.caption
        || '';

  if (await zamiTools.handler(sock, m)) return;   // ⬅️ ye line

  // ... baaki aapka code
});
```

> `zami-tools.js` khud `zami-status.js` ko load kar leta hai — commands ke liye ek hi line kaafi hai.

---

## 📜 Saari Commands (19)

### 💾 STATUS
| Command | Kaam |
|---|---|
| `.save` | Status/message pe **reply** karke save |
| `.autoread on/off` | Status auto seen 👁️ |
| `.autoreact on/off` | Auto react 💗 🍷 🍒 🤓 |
| `.emojis 💗🍷🍒🤓` | React emojis badlo |
| `.statusinfo` | Status stats |

### 📜 SYSTEM
| Command | Kaam |
|---|---|
| `.menu` | Main menu |
| `.list` | Poori command list |
| `.ping` | Bot speed check ⚡ |
| `.alive` | Bot status |

### 👥 GROUP
| Command | Kaam |
|---|---|
| `.leavegc` | Group **exit + report** |
| `.autoleave on/off` | Naye group me add hote hi **auto exit + report** |
| `.gcinfo` | Group details |

### 🚫 USER
| Command | Kaam |
|---|---|
| `.block @user` | **Block + report** |
| `.unblock @user` | Unblock |
| `.report @user` | Report |
| `.blocklist` | Blocked users |

### ⚙️ SETTINGS
| Command | Kaam |
|---|---|
| `.autoblock on/off` | Report par auto block |
| `.reports` | Reports log |
| `.clearreports` | Reports saaf |

---

## 🎯 Auto Features (background)

| Feature | Default | Kaam |
|---|---|---|
| 👁️ **Auto Seen** | 🟢 ON | Har status foran seen |
| 💗 **Auto React** | 🟢 ON | Foran react: 💗 🍷 🍒 🤓 |
| 🚪 **Auto Leave** | 🔴 OFF | `.autoleave on` karo |
| 🚫 **Auto Block** | 🔴 OFF | `.autoblock on` karo |

---

## 🔐 Security
- Group/user commands **sirf owner** chala sakta hai
- `.save` sab chala sakte hain (media aapki chat me aata hai)
- Har action ka log owner ko DM me

---

## 💡 Prefix
Plugin khud `global.prefix` ya `process.env.PREFIX` padh leta hai.
Manual:
```js
global.prefix = '.';
global.botName = 'ZAMI-MD';
```
