# ZONIX Web Dispatcher — Complete System Specification

## 1. System Vision & Architecture
A standalone, high-security, web-based freight dispatcher portal that runs in standard modern browsers (Chrome, Edge, Safari, Brave) with:
- Dedicated master DAT One account pool (isolated from the desktop app).
- Hard limit of **8–10 concurrent dispatchers per master DAT seat**.
- Sticky residential proxy mapping to prevent DAT security/bot bans.
- Zero client installation required.

---

## 2. Injected Dispatch Automation Suite (Client-Side)

### A. Rich Emoji Copy Engine
Scrapes visible load row and detail pane to generate a structured, ready-to-paste dispatch pitch:
```text
📍 PICKUP: Wharton, TX (10/15)
🏁 DELIVERY: Ramseur, NC (TBD)
🛣️ MILES: 1185 mi
⚖️ WEIGHT: 43,000 lbs | Van
💵 RATE: $2,700 ($2.28/mi)
🏢 BROKER: Landstar Ranger Inc
📋 BROKER MC#: 178439
📞 PHONE: Contact Broker
📦 COMMODITY: –
📡 TRACKING: Not Required
📝 NOTES: Ana x422; Post ID: IGR00173
```

### B. `[Calc]` Live RPM & Expense Math Audit Modal
- **Route Header**: Origin to Destination, total loaded miles, equipment class (Class 8), live diesel price.
- **Visual Route Map**: Route line from Origin (P) to Destination (D).
- **Top Metrics**:
  - Gross Revenue ($ and $/mi).
  - Operating Expenses (Break-even $/mi).
  - Net Profit with visual badge: `[ ✓ PROFITABLE ]` (green) or `[ ✕ BELOW BREAK-EVEN ]` (red).
- **Transparent Expense Audit**:
  - Diesel Fuel Expense: `Miles ÷ Truck MPG × Live Diesel Rate`
  - DEF: 2.5% ratio of diesel.
  - Tolls: State baseline corridor reserve.
  - Maintenance & Tire Wear: `$0.17/mi` (ATRI Class 8).
  - Fixed Operating Overhead: `$0.24/mi` (truck note, insurance, ELD, permits).
- **Controls**: `BROKER PAY ($)`, `DIESEL ($/GAL)`, `TRUCK MPG`, and `[Copy Pitch]` button.

### C. `[Email]` 1-Click Broker Negotiation Suite
- Auto-extracts broker email, load inquiry subject with lane & equipment.
- Injects carrier credentials: MC#, DOT#, company name, trailer specs, and contact phone.
- Actions: `[Prefilled Gmail]`, `[⚡ 1-Click Send (Background)]`, `[📋 Copy Body]`, and template switcher.

### D. Navigation Lockdown
- Strictly lock down the DAT One interface so dispatchers can **only** use `Search Loads`.
- Hide / disable `Dashboard`, `My Trucks`, `My Loads`, `Private Network`, `Tools`, `My Account`, `Billing`, `Support`, and `Company Profile`.

### E. Subscription & Tab Enforcement HUD
- Floating badge in bottom corner showing `Remaining Time: X Days Remaining` and `Exp: YYYY-MM-DD`.
- Tab Limiter: Restricts user to 1 or 2 concurrent search tabs to prevent spamming DAT.

---

## 3. Web Security & Anti-Tamper Shield
1. **DevTools & Inspection Trap**:
   - 350ms infinite `debugger` loop freezing unauthorized DevTools if opened.
   - Keyboard blockers: `F12`, `Ctrl+Shift+I`, `Ctrl+Shift+J`, `Ctrl+Shift+C`, `Ctrl+U`.
   - Right-click (`contextmenu`) disabled across document.
2. **Console Annihilation**:
   - `window.console` wiped and `Object.freeze(window.console)`.
3. **Headless & Anti-Bot Guard**:
   - Blocks Puppeteer, Selenium, and headless automation tools.
4. **IP Leak Protection**:
   - WebRTC negotiation disabled.
   - Strips `X-Forwarded-For`, `CF-Connecting-IP`, and real client IP headers so DAT only sees the proxy IP.

---

## 4. Admin Control Architecture
1. **User Seat Provisioning**:
   - Create Email/Password, assign plan, set Start & Expiry dates, and search tab limits.
   - 1-click Instant Kill Switch (terminates proxy socket and forces redirect to `/login` in < 100ms).
   - Single-seat device fingerprint locking.
2. **DAT Account Pool Manager**:
   - Master DAT accounts configured with max capacity (default 10 users).
   - Auto-routes user 11 to the next available DAT account.
   - Dedicated sticky residential proxy binding per DAT master account.
   - Real-time cookie health monitor (Active, Expiring Soon, Disconnected).
