# RapidMedi — Delivery Partner App
## AI Engineering Specification Document (v1.0)

> **Scope note:** This document specifies the **React Native Delivery Partner App only**. It excludes the Customer App, Medical Store App, Admin Dashboard, and backend implementation code, which are governed by separate specifications. This document describes the data contracts and backend behaviors the Delivery Partner App depends on, without implementing them.

> **Document type:** Specification only. No source code. Written to be sufficient for an autonomous coding agent (Claude Code, Cursor, etc.) to implement the app without redesigning the architecture. Where a requirement in the source brief was ambiguous, a reasonable production-grade assumption is made and explicitly flagged as **[ASSUMPTION]**.

Primary target: **Android** (React Native), architected so an iOS build can be added later without structural rework (no Android-only native modules used where a cross-platform equivalent exists; platform-specific code isolated behind a service-interface layer).

---

## 1. Project Overview

The Delivery Partner App is the operational tool for verified riders ("Delivery Partners") to fulfil RapidMedi's hyperlocal medicine deliveries: receive assignments, navigate to pickup and drop-off, confirm handoffs, and get paid — reliably, on a spectrum of real-world Android devices and network conditions.

**Non-functional baseline the entire spec is built around:** the app must degrade gracefully, never silently lose a critical action, and never let the client alone decide something the backend must authorize. Delivery partners are often on prepaid data plans with poor coverage in exactly the moments that matter (basements of pharmacies, apartment stairwells) — every design decision below assumes network and GPS are unreliable, not exceptional.

**[ASSUMPTION-01]** "Reliably... where platform capabilities permit" for phone-restart persistence is interpreted as: the app must restore the in-progress delivery state and resume location tracking automatically after a restart **only if the user re-opens the app or grants the OS permission to auto-start on boot** (Android restricts background auto-start without explicit user action on most OEM skins) — the spec does not claim guaranteed auto-resume without user interaction, since that would overstate what Android reliably allows.

---

## 2. Most Important Privacy Rule

**Core principle: the Delivery Partner receives only what is operationally necessary to complete the delivery — nothing more.**

### 2.1 Customer information visible to the Delivery Partner
| Field | Visible? | Notes |
|---|---|---|
| Customer first name | Yes | Last name withheld |
| Delivery address (required fields only) | Yes | Building/street/area needed for physical delivery |
| Delivery landmark | Yes | As supplied by customer |
| Order ID | Yes | RapidMedi order reference, not payment reference |
| Delivery OTP | Yes | Only at the point delivery is being completed — see Section 13 |
| Delivery instructions relevant to handoff | Yes | e.g. "leave with security guard" |
| Real phone number | **Never** | Masked calling only (Section 15) |
| Full/legal name | No | |
| Exact GPS coordinates beyond what's needed to plot the delivery pin | No | Only the delivery pin + address text |
| Order contents / medical details | No | The partner is a logistics actor, not privy to prescription details |
| Payment method / amount | **[ASSUMPTION-02]** No, except COD amount to collect | COD collection amount is operationally necessary and therefore shown; online-payment amount is not |

### 2.2 Pharmacy information visible to the Delivery Partner
| Field | Visible? | Notes |
|---|---|---|
| Pickup location (address/pin) | Yes | |
| Store display name | Conditionally | Shown only if operationally required for physical wayfinding (e.g., mall unit number); legal/owner name never shown |
| Pickup order ID | Yes | |
| Pickup instructions | Yes | e.g. "use back entrance" |
| Pharmacy owner's personal phone number | **Never** | Masked calling only |

### 2.3 Communication architecture
All customer/pharmacy contact happens through **RapidMedi-controlled communication**, never a raw phone number reaching the device dialer with the real number. The app architecture supports:
- **Masked calling** — a virtual/proxy number connects the call; provider-agnostic interface (Section 30) so the underlying telephony vendor (e.g., Exotel/Knowlarity-class provider) can be swapped without app changes.
- **Virtual phone numbers** issued per-order, expiring at order completion.
- **Call routing** through the backend telephony service, never a client-resolved number.
- **Call logging** (duration, timestamp, outcome) written server-side, not trusted from client.
- **Support-mediated communication** as the fallback path whenever masked calling is unavailable (Section 15.3).

If the masked-calling service is unavailable, the app shows **"Contact RapidMedi Support"** and does **not** fall back to revealing a real number under any circumstance.

---

## 3. Delivery Partner Security

Hard authorization boundaries — enforced **server-side**, with the client UI reflecting (never defining) these boundaries:

- A partner can only ever read/write data for **assignments belonging to their own `partnerId`** — enforced via Firestore Security Rules matching `request.auth.uid == resource.data.partnerId` on every partner-facing collection.
- A partner **cannot** browse other partners, customers, or pharmacies — no client query pattern exists that would return other entities' documents, and Security Rules deny any such query at the rules layer regardless of what the client attempts.
- A partner **cannot** access financial information belonging to any other user.
- A partner **cannot** modify their own KYC verification status — that field is writable only by Admin Cloud Functions (Section 32); the client has read-only access to `kycStatus`.
- A partner **cannot** modify a delivery record after `status: completed` — Firestore rules deny writes to `orders/{orderId}` and `deliveryAssignments/{assignmentId}` once `status` is in a terminal state, for every field except a narrow partner-initiated `reportIssue` sub-write (Section 14).
- A partner **cannot** change delivery charges — charges are computed and stored server-side; the field is never client-writable.
- A partner **cannot** manipulate the delivery OTP — OTP is generated, stored (hashed), and verified entirely server-side (Section 13); the client only ever sends the entered digits to a Cloud Function for verification, never reads or writes the correct value.
- A partner **cannot** change order ownership (reassign an order to another partner) — reassignment is an Admin Dashboard–only action.

**Never trust client-side state for authorization.** Every state-transition Cloud Function (accept, pickup-confirm, OTP-verify, complete, cancel) independently re-validates: (a) the calling `uid` matches the assignment's `partnerId`, (b) the assignment is in a state where the requested transition is legal, (c) the partner's account is currently `active`/not suspended. A client that's out of sync (e.g., showing a stale "Accept" button after an assignment already expired) simply gets a rejected function call with a clear error code — it can never force an illegal state change.

---

## 4. Main Delivery Lifecycle

```
 Delivery Assigned
        │
        ▼
 New Delivery Alert  ──────────────┐ (timeout, Section 5)
        │ Accept                   │
        ▼                          ▼
 Navigate to Pharmacy        Reassigned to
        │                    another partner
        ▼
 Arrived at Pharmacy
        │
        ▼
 Pickup Verification
        │
        ▼
 Medicine Picked Up
        │
        ▼
 Navigate to Customer
        │
        ▼
 Arrived at Customer Location
        │
        ▼
 Customer Verification
        │
        ▼
 Delivery OTP Requested/Entered
        │
        ▼
 OTP Verified (server)
        │
        ▼
 Delivery Completed
        │
        ▼
 Earnings Updated (server-computed)
        │
        ▼
 Delivery History Updated
```

### 4.1 State definitions

For each state: **Allowed actions / Forbidden / UI state / Backend state / Notifications / Location behavior / Failure / Timeout / Cancellation / Recovery.**

**State: `assigned` (New Delivery Alert)**
- Allowed: Accept, Reject (if `rejection allowed` per Section 5.2), View order summary.
- Forbidden: Navigate, Pickup actions, viewing full customer address (only approximate pickup distance/area shown pre-accept — full address unlocks on Accept, minimizing exposure to a partner who ultimately doesn't take the job).
- UI: Full-screen alert overlay (Section 6), Accept/Reject buttons, countdown timer.
- Backend: `deliveryAssignments/{id}.status = 'pending_acceptance'`, `expiresAt` timestamp set.
- Notifications: High-priority push + in-app alert + sound + vibration.
- Location: Partner's last known location is what the assignment offer was computed from; no new tracking starts yet.
- Failure: Push fails to deliver → in-app polling fallback (Section 25.4) picks it up on next app foreground.
- Timeout: Configurable window (**[ASSUMPTION-03]** default 30 seconds) → auto-expires, reassigned by backend, app shows "Assignment expired."
- Cancellation: N/A (not yet accepted).
- Recovery: If app was killed, a re-opened app checks for any `pending_acceptance` assignment still within its expiry window and re-shows the alert.

**State: `accepted` → `navigating_to_pharmacy`**
- Allowed: Start navigation, Call pharmacy (masked), Report issue, Cancel (with reason, subject to cancellation-rate tracking).
- Forbidden: Confirm pickup (locked until `arrived_at_pharmacy` or a manual override tolerance — see 11.1), mark delivered.
- UI: Active Delivery Screen (Section 23) showing pharmacy destination, map, ETA.
- Backend: `status = 'en_route_pickup'`; foreground location tracking begins (Section 8–9).
- Notifications: "Pickup reminder" nudge if the partner hasn't moved toward the pharmacy within a configurable window.
- Location: Foreground high-accuracy tracking active; background tracking active if app backgrounded (Section 35 battery strategy).
- Failure: GPS unavailable → app still allows manual "I've arrived" with a confirmation dialog, flagged server-side for lower confidence (not blocked, since GPS problems are common and shouldn't block livelihood-critical actions — but flagged for anomaly review, Section 47).
- Timeout: **[ASSUMPTION-04]** No hard timeout on this leg (real-world traffic varies) but a stale-if-no-progress flag surfaces to Admin Ops Escalation after a configurable window with zero movement.
- Cancellation: Partner-initiated cancellation here requires a reason code and triggers backend reassignment; excessive cancellations affect Reliability Score (Section 27).
- Recovery: On app relaunch, current assignment + status is re-fetched from Firestore as source of truth; UI simply re-renders the correct screen for whatever state the backend says it's in.

**State: `arrived_at_pharmacy`**
- Allowed: View pickup order details, initiate Pickup Verification (Section 11).
- Forbidden: Skip straight to "Picked Up" without the verification step.
- UI: "Arrived" confirmation → Pickup Verification screen.
- Backend: `status = 'arrived_pickup'`, `arrivedAtPharmacyAt` timestamp (geofence-assisted, see 8.1, with manual fallback).
- Notifications: None outbound to partner beyond in-app; pharmacy-side app (separate spec) is notified.
- Location: Continues tracking; geofence check against pharmacy coordinates.
- Failure/Timeout/Cancellation/Recovery: as above pattern, applied to this leg.

**State: `picked_up` → `en_route_delivery`**
- Allowed: Start navigation to customer, Call customer (masked), Report issue, Cancel (higher scrutiny — package is already out).
- Forbidden: Complete delivery without OTP (Section 13).
- UI: Active Delivery Screen, destination switched to customer.
- Backend: `status = 'en_route_delivery'`, package handoff timestamp logged.
- Location: Continues tracking; this leg's route is what's shown on the customer's live-tracking view (separate Customer App spec).

**State: `arrived_at_customer`**
- Allowed: Customer Verification, Request/Enter OTP.
- Forbidden: Mark delivered without server OTP verification (Section 12–13).
- Backend: `status = 'arrived_delivery'`, geofence-assisted arrival timestamp.

**State: `otp_verification`**
- See Section 13 in full. On success → `status = 'delivered'`. On failure → retry flow, capped, escalates to Support override.

**State: `completed`**
- Allowed: View summary, View earnings for this delivery.
- Forbidden: Any further status writes to this order (terminal state, immutable per Section 3).
- Backend: `status = 'completed'`, `completedAt`, triggers `calculateEarnings` Cloud Function (Section 20).
- Notifications: Earnings-updated notification (low priority, in-app).
- Location: Tracking for this order stops immediately (Section 34 — data minimization).

**State: `failed` / `cancelled`** — see Section 14 for the full failure-reason taxonomy and recovery/escalation behavior per reason.

---

## 5. Order Assignment

The backend is the **sole authority** on who receives an assignment. Factors it considers (documented for context; implemented server-side, not in this app):
distance from pharmacy, current partner location, online status, current workload/active-delivery state, estimated travel time, reliability score, acceptance rate, cancellation rate, historical delivery performance.

**The app never independently decides or influences which partner an order routes to** — its only role is to present the offer it's given and report the partner's response.

### 5.1 Assignment alert contents (client-rendered from server payload)
Order ID, pickup distance (approx, pre-full-address), estimated pickup time, estimated earnings for this delivery (**[ASSUMPTION-05]**: shown pre-accept since this is standard gig-platform practice and materially affects the accept/reject decision partners need to make quickly), Accept button, Reject button (if rejection is currently allowed for this partner — see 5.2).

### 5.2 Timeout & edge-case behavior

| Scenario | Behavior |
|---|---|
| Partner ignores the offer | Auto-expires at timeout (default 30s, App Config–driven); backend reassigns; partner's non-response is recorded (affects response-rate metric, not necessarily penalized identically to an explicit reject — **[ASSUMPTION-06]**). |
| Partner explicitly rejects | Immediate reassignment; reason optionally captured (quick-select: too far / going offline / other); affects rejection-rate metric. |
| Partner loses internet mid-offer | Offer countdown is server-authoritative (server-side expiry timestamp, not a client timer alone) — if the partner's response never reaches the backend before expiry, it's treated identically to "ignored," regardless of what the local UI displayed. |
| Partner accepts but immediately goes offline | Accepted assignment stands (can't be silently backed out of by toggling offline — see Section 7); going offline mid-active-delivery does not cancel the delivery; it only means no *new* assignments will be offered. App surfaces a persistent banner: "You have an active delivery — you cannot go offline until it's complete or cancelled with a reason." |
| Partner's GPS unavailable at accept time | Assignment still accepted (GPS isn't required to accept, only to navigate) — app shows a GPS-required warning banner and blocks the "Arrived" confirmations until location resolves or a manual-override with justification is used. |
| Partner's phone dies | Backend detects staleness via absence of location pings beyond a threshold (Section 9.5) and surfaces the order to Admin Escalation for manual reassignment; the partner's in-progress order is not silently auto-cancelled without Ops review, to avoid unfairly penalizing a partner for a dead battery versus abandonment — **[ASSUMPTION-07]**. |
| Partner force-closes the app | Identical to phone-dies case from the backend's perspective (no distinguishing signal available) — same staleness-detection path. |

---

## 6. Loud Delivery Alert

New assignments are safety/livelihood-critical interrupts and must cut through whatever the partner is doing (driving, resting, using another app).

### 6.1 Android notification channels
| Channel ID | Purpose | Importance |
|---|---|---|
| `delivery_assignments` | New delivery offers | `IMPORTANCE_HIGH` (heads-up notification, sound+vibration) |
| `delivery_updates` | Pickup reminders, customer-waiting nudges | `IMPORTANCE_DEFAULT` |
| `earnings_kyc` | Earnings updates, KYC status changes, document expiry | `IMPORTANCE_LOW` |
| `system_announcements` | General app/system messages | `IMPORTANCE_DEFAULT` |

Each channel is user-configurable in Android system settings **except** `delivery_assignments`, which the app strongly discourages muting (in-app copy explains why) but cannot force-prevent, since Android gives the OS/user final control over channel-level muting from Android 8+ — **the spec does not claim the app can override this OS behavior.**

### 6.2 Sound & vibration
- Assignment alert: distinct, attention-grabbing tone (not the default notification chime) — looping for a few seconds while the alert is on-screen, distinct from a generic "message received" sound so partners can distinguish by ear.
- Vibration pattern: pronounced, repeating short-long pattern.
- Both respect system Do-Not-Disturb unless the partner has explicitly allowed the app's notification channel to bypass DND — **[ASSUMPTION-08]**: the app does not attempt to bypass DND without explicit OS-level permission, which is standard Android policy and cannot be worked around from application code.

### 6.3 Foreground / background / terminated handling
| App state | Behavior |
|---|---|
| Foreground | In-app full-screen alert overlay renders immediately from an active Firestore listener on the partner's pending-assignment doc; push notification is suppressed to avoid double-alerting (data-only FCM message triggers the in-app UI instead of a system notification when foregrounded). |
| Background | FCM notification message (not just data) triggers a heads-up system notification; tapping it deep-links into the New Delivery Alert screen. |
| Terminated | FCM notification message wakes the app via the OS notification tray tap (standard Android behavior) — **the app cannot reliably auto-launch and display a full-screen UI from a fully terminated state without the user tapping the notification**, which is a documented Android platform restriction, not a gap in this spec. A high-priority notification with actionable buttons (Accept/Reject directly from the notification tray, via `RemoteInput`/action intents) mitigates this by letting the partner respond without fully opening the app. |

### 6.4 Permissions required
`POST_NOTIFICATIONS` (Android 13+), notification channel creation at app install/first-run, and — for the tray action buttons — background execution permission for the resulting Cloud Function call (handled via a lightweight background service, not requiring the full app UI to be foregrounded).

---

## 7. Online / Offline System

| Status | Meaning | Can receive new assignments? |
|---|---|---|
| **ONLINE** | Partner has toggled availability on and has no active delivery. | Yes |
| **OFFLINE** | Partner has toggled availability off, or app/session is not authenticated. | No |
| **BUSY** | Partner has an active (non-terminal) delivery assignment. | No — automatically set by the backend the moment an assignment is accepted; cannot be independently toggled by the partner. |

**Backend is authoritative.** The client's ONLINE/OFFLINE toggle only ever *requests* a status change via a Cloud Function (`updateAvailability`); the function validates that the partner isn't currently `BUSY` (an active assignment exists) before honoring an OFFLINE request, and validates KYC/suspension status before honoring an ONLINE request. The locally displayed toggle state is a reflection of the last confirmed server state (via Firestore listener), not an optimistic-only local flag — if the two disagree even briefly, the UI shows a syncing state rather than a possibly-wrong value.

Going offline mid-delivery is explicitly disallowed (Section 5.2); the toggle is disabled with an explanatory tooltip while `BUSY`.

---

## 8. Location System

### 8.1 Location types, clearly distinguished
| Location type | Who reads it | When | Precision |
|---|---|---|---|
| **Delivery Partner location** | Backend (for assignment matching + live tracking to Customer App), Admin Dashboard (Section 9) | Continuously while ONLINE or BUSY; stops when OFFLINE | High-accuracy GPS while actively tracking |
| **Pharmacy location** | Delivery Partner app (read-only, for navigation) | From assignment acceptance through pickup | Fixed pin, pharmacy-registered address |
| **Customer location** | Delivery Partner app (read-only, for navigation) | From pickup confirmation through delivery completion **only** — not before, minimizing exposure (Section 34) | Approximate delivery pin + address text, not raw device GPS of the customer |

### 8.2 Foreground vs. background location
- **Foreground:** High-accuracy mode (`PRIORITY_HIGH_ACCURACY`), used whenever the Active Delivery Screen is visible.
- **Background:** Required while BUSY so tracking continues if the partner switches to a navigation app or locks the screen — implemented via a foreground service with a persistent, dismissible-only-on-delivery-completion notification ("RapidMedi is tracking your delivery"), per Android's background-location policy (foreground service + notification is mandatory for continuous background location on modern Android, not optional).

### 8.3 Update frequency (battery-aware, detailed in Section 35)
- Time-based fallback: every 15–20 seconds **[ASSUMPTION-09: exact interval configurable server-side via Remote Config, not hardcoded]**.
- Distance-based trigger: also fires an update if the partner has moved more than a configurable threshold (e.g., 50m) since the last sent point, whichever comes first — avoids both silence during fast movement and pointless chatter while stationary.

### 8.4 Permission flows
```
Request 'When in Use' → Granted → Request 'Always'/Background (Android 10+) → Granted → Full tracking enabled
                     → Denied → Show rationale → Retry / Open Settings
Background denied → App still functions for foreground-only tracking with an explicit
                     warning that background tracking (needed while screen is off / app
                     backgrounded during BUSY) will be degraded; partner is guided to
                     Settings with a clear explanation of why it matters for their earnings/deliveries.
Location services (system-level) disabled → Full-screen blocking state: "Turn on Location
                     Services to receive deliveries" with a direct Settings deep-link;
                     partner cannot go ONLINE until resolved.
Permission permanently denied ("Don't ask again") → Persistent, non-dismissible-until-resolved
                     banner with Settings deep-link; identical ONLINE-block as above.
```

### 8.5 GPS quality handling
- **Poor accuracy** (accuracy radius beyond a threshold, e.g. >50m): location point is still sent (tagged with its accuracy value) but UI shows a subtle "GPS signal weak" indicator; arrival geofence checks widen their tolerance rather than blocking the partner outright.
- **Network location fallback**: if GPS fix is unavailable, coarse network-based location is used as a fallback for map centering only — **never** used to satisfy a geofence-based arrival confirmation (those always require GPS-fix-quality data or an explicit manual override, logged as such).
- **Mock location detection [ASSUMPTION-10]:** the app checks Android's `isFromMockProvider()` flag on every location update; mock-flagged points are still transmitted (so the backend has full signal) but tagged `isMocked: true` server-side, contributing to a fraud-risk flag (Section 33) rather than silently blocking the app — outright blocking real users on imperfect detection would be worse than flagging for review.

### 8.6 Location caching, freshness, validation
- Last known location cached locally (MMKV) for instant map centering on cold start, always labeled with its own timestamp so staleness is visible/usable by the app logic (e.g., don't treat a 20-minute-old cached point as "current").
- Every location payload sent to the backend includes `timestamp`, `accuracy`, `speed` (if available), `isMocked` flag — the Cloud Function (`processLocationUpdate`) rejects points with implausible values (e.g., speed implying teleportation between two consecutive points — see Section 47 "GPS reports impossible movement") rather than blindly trusting them.

---

## 9. Live Tracking

```
Delivery Partner Device
     │  (foreground/background location updates, batched)
     ▼
 Local Queue (MMKV-backed, survives brief network loss)
     │  (flush on interval + on reconnect)
     ▼
processLocationUpdate Cloud Function (validates, dedupes, rejects implausible points)
     │
     ▼
 deliveryLocations/{assignmentId} (latest point + rolling short history)
     │
     ▼
 Customer App live-tracking view (reads only current position + coarse route progress,
 never the partner's full historical trail beyond this one active order)
```

### 9.1 Update strategy
- **Interval:** 15–20s base cadence (Remote-Config adjustable), **plus** distance-triggered updates (Section 8.3).
- **Battery-aware throttling:** if device battery drops below a configurable threshold (e.g., 15%) the app widens the interval (e.g., to 30–40s) and surfaces a low-battery warning to the partner, trading tracking granularity for keeping the phone alive through the delivery — [ASSUMPTION-11].
- **Background updates:** continue via the foreground service (Section 8.2) at the same or a slightly relaxed cadence, never fully stopping while BUSY.
- **Network retry & batching:** if a send fails, the point is retained in the local queue and retried with exponential backoff; if multiple points accumulate during an outage, they're sent as a single batched write on reconnect (bounded batch size, oldest-first, capped total retained points to avoid unbounded local storage growth — older-than-cap points are dropped, since a live-tracking feature doesn't need a full offline history, only recent-enough continuity).
- **Duplicate prevention:** each point carries a client-generated sequence ID; the Cloud Function dedupes by `(assignmentId, sequenceId)`.
- **Invalid location prevention:** points with `accuracy` worse than a hard ceiling, or coordinates outside a plausible bounding box for the order's service area, are rejected server-side (logged, not silently dropped, for observability).
- **Stale location handling:** if no valid point has been received for a configurable window (e.g., 5 minutes) while an assignment is active, the assignment is flagged `locationStale: true`, surfaced to Admin Ops Escalation (ties to Admin Dashboard spec Section 52) — this is the mechanism behind the "phone died / app force-closed" detection referenced in Section 5.2.

---

## 10. Map and Navigation

- Primary: **Google Maps** embedded map for in-app route preview + "Open in Google Maps" deep link for turn-by-turn navigation (leverages a tool drivers already know, rather than reinventing turn-by-turn — safer and faster to ship).
- Deep link pattern: `google.navigation:q=<lat>,<lng>&mode=d` (driving), with a graceful fallback to a generic maps intent chooser if Google Maps isn't installed.
- In-app map shows: partner's current position, destination pin (pharmacy or customer depending on current leg), a simplified route line (for context, not authoritative turn-by-turn — that's delegated to Google Maps).
- "Return to RapidMedi" — after external navigation, the app's own notification/persistent foreground-service notification acts as the way back (tap to return); the app doesn't attempt to programmatically detect when the partner "arrives" via the external app — arrival is still confirmed via the in-app Arrived button + geofence-assist (Section 8.5/11).
- Destination details shown: address text, landmark, and (pickup only) any store display info permitted under Section 2.2 — never more than the privacy rules allow, even on the map screen.

---

## 11. Pharmacy Pickup

```
Assigned → Navigate to Pharmacy → Arrived → View Pickup Order →
Verify Order ID → Collect Package → Confirm Pickup → Start Delivery
```

### 11.1 Pickup confirmation mechanism — recommendation & rationale

**Recommended: Pickup PIN (numeric code) shown to the pharmacy staff on their Store App, entered by the delivery partner, verified server-side** — with **Order ID matching** as a secondary/redundant check.

**Why, compared to alternatives:**
- **QR code** — requires camera scanning UX (extra friction, harder in low light/rain, needs the pharmacy to have a printed/displayed code ready), and camera permission adds another permission-friction point for a marginal security gain over a PIN in this specific context (pharmacy staff are present and can hand over a code verbally/on-screen).
- **Barcode** — same friction profile as QR, plus barcode generation/printing overhead most small pharmacies won't reliably maintain.
- **Store confirmation alone (pharmacy taps "handed over" with no partner-side input)** — too weak; doesn't prove the *correct* partner picked up the *correct* order, and creates a dispute vacuum ("I never got it" vs "I gave it to someone").
- **Pickup PIN** — low friction (4–6 digit numeric entry, same interaction pattern partners already learn for delivery OTP, reducing cognitive load by reusing a familiar pattern), works with zero extra hardware/printing, doesn't require camera permission, and is easy for pharmacy staff of any technical skill level to relay. Combined with **Order ID cross-check** (partner confirms the Order ID displayed matches what the pharmacy states), this gives strong assurance without QR/barcode's friction cost.

### 11.2 Flow detail
1. Partner marks **Arrived** (geofence-assisted + manual confirm).
2. App displays the expected Order ID for this pickup.
3. Partner asks pharmacy staff for the Pickup PIN (shown on the pharmacy's own Store App for this order) and enters it.
4. `verifyPickup` Cloud Function checks the PIN against the server-stored value (hashed, single-use, scoped to this assignment) — success flips `status → picked_up`, timestamps the handoff, and is the trigger that finally reveals the customer's delivery-navigation destination in full (data-minimization: full delivery address detail is only strictly needed from this point forward — **[ASSUMPTION-12]**, since prior to pickup the partner only needs the pharmacy's location).
5. On PIN mismatch: retry allowed up to a capped count (mirrors OTP retry pattern, Section 13.3), then escalates to "Contact Support" for a manual pharmacy-confirmed override, logged as an exception path.

---

## 12. Customer Delivery

```
Out for Delivery → Near Customer → Arrived → Verify Customer →
Request OTP → Enter OTP → Verify OTP (server) → Complete Delivery
```

- **"Near Customer"** — a proximity-based UI nudge (not a hard state) once within a configurable radius of the delivery pin, reminding the partner to prepare for handoff (e.g., have the package ready, note any delivery instructions).
- **"Arrived"** — geofence-assisted + manual confirm, same pattern as pharmacy arrival.
- **Customer Verification** — a lightweight, non-invasive check appropriate for a medicine (sometimes sensitive/prescription) handoff: partner confirms the customer's first name matches (as shown in-app) before proceeding to OTP — this is a soft social check, not a hard system gate, since names can be mis-stated innocently (e.g., someone else at the address receiving on the customer's behalf); the OTP is the actual hard gate.
- **The Delivery Partner cannot mark an order delivered without backend OTP verification, ever** — there is no "mark delivered manually" button anywhere in the partner-facing UI; the *only* path to `status: completed` is a successful `verifyDeliveryOTP` Cloud Function call (or an explicit Admin/Support override function, which is not partner-accessible — Section 13.5).

---

## 13. Delivery OTP

- **Generation:** OTP is generated server-side (Cloud Function, cryptographically-adequate random 4–6 digit code — **[ASSUMPTION-13]** 4-digit for lower friction, consistent with typical delivery-OTP UX conventions) at the point the order transitions to `en_route_delivery` (or slightly earlier, pre-generated at order confirmation, so it's ready to send whenever the customer needs it) and delivered to the **customer's** app/SMS — never to the partner's app in cleartext at generation time.
- **Storage:** Only a hash of the OTP is stored server-side; verification compares hashes, not plaintext, so no code path (including a compromised admin query) can trivially read out a valid OTP.
- **Expiration:** OTP is valid for the duration of the active delivery window (**[ASSUMPTION-14]**: e.g., 2 hours from generation, comfortably covering any realistic delivery duration) — regenerable via Resend (below) if it expires while the order is still legitimately in progress.
- **Entry & verification:** Partner enters the digits the customer reads aloud/shows on their phone into the app; `verifyDeliveryOTP` Cloud Function checks the hash server-side and only then transitions `status → delivered`.
- **Retry limits:** Capped at a small number of attempts (**[ASSUMPTION-15]**: 3) before the input is temporarily locked and the app surfaces "Too many attempts — contact Support" — prevents OTP brute-forcing from the partner side.
- **Rate limiting:** The verify function itself is rate-limited per assignment (not just per app-side attempt count) to prevent any bypass via direct function invocation outside the UI.
- **Resend:** Customer-initiated (from Customer App, not partner-initiated — the partner never triggers OTP resend, since that surface should stay in the hands of the person who needs to receive/read the code) — regenerates and re-delivers the OTP.
- **Customer unable to receive OTP (phone unavailable, SMS delivery failure, etc.):** Partner selects "Customer can't receive OTP" → routes to Support-mediated resolution (Section 13.5) rather than leaving the partner stuck.
- **Partner enters wrong OTP repeatedly:** After retry cap, same Support-override path.
- **Support override process:** A Support Admin (Admin Dashboard, separate spec) can, after verifying the situation through the masked-call/support channel, trigger an **Admin-assisted completion** Cloud Function — a distinct, heavily audit-logged function, never accessible from the partner app, that requires an explicit reason code and admin identity, and still writes the same immutable audit trail as any other privileged action (mirrors Admin Dashboard Section 98 Audit Logs).
- **The Delivery Partner can never generate or modify the OTP** — no function or Firestore write path exposed to the partner role touches the OTP value itself, only the verify-attempt endpoint.

---

## 14. Delivery Failure

Every failure state requires a **reason code** from a controlled vocabulary (never free-text-only, to keep downstream analytics/fraud-detection usable), with optional free-text elaboration.

| Failure category | Reason code (representative) | Partner-facing flow | Escalation |
|---|---|---|---|
| Customer unavailable | `customer_unavailable` | Partner attempts contact (masked call) → waits a configurable grace period at location → marks failure with proof-of-attempt (call log auto-attached) | Auto-escalates to Support if grace period elapses |
| Wrong address | `address_incorrect` | Partner reports; Support contacts customer for correction | Immediate Support notification |
| Customer refuses delivery | `customer_refused` | Partner marks refused; package handling instructions shown (return to pharmacy vs. hold, per Ops policy) | Support notified for customer follow-up |
| Customer cannot provide OTP | `otp_unavailable` | Routes to Section 13.5 override flow | Support-mediated |
| Pharmacy package missing | `package_missing_at_pharmacy` | Partner reports at pickup stage; assignment may be cancelled/reassigned by backend | Immediate escalation, pharmacy-side spec handles their side |
| Damaged package | `package_damaged` | Partner reports with optional photo evidence upload | Escalated; may trigger replacement/refund flow (Admin Dashboard) |
| Medicine mismatch | `item_mismatch` | Partner reports discrepancy noticed at pickup | Escalated to pharmacy + Support |
| Payment issue (COD) | `cod_payment_issue` | Partner reports collection problem | Escalated to Finance (Admin Dashboard) |
| Road closure / route blocked | `route_blocked` | Partner reports; app suggests re-routing via external navigation | Informational, no auto-escalation unless SLA at risk |
| Vehicle breakdown | `vehicle_breakdown` | Partner reports; **critical incident** path (Section 24) | Immediate Ops notification; reassignment triggered |
| Accident | `accident` | **Critical incident** path | Immediate Ops + safety escalation |
| GPS failure | `gps_failure` | Manual-override arrival confirmations enabled (Section 8.5) | Flagged, not blocking |
| Phone battery dead | (detected via staleness, Section 9.1, not partner-self-reported since by definition they can't report if the phone is dead) | N/A — backend-detected | Ops Escalation |
| Network unavailable | Local queue + retry (Sections 9, 28) | Transparent to partner where possible | Escalates only if prolonged |
| Delivery partner unable to continue (personal emergency, etc.) | `partner_unable_to_continue` | Partner reports; order reassigned | Immediate Ops notification |
| Customer requests cancellation | `customer_requested_cancellation` | Partner relays / Support confirms via customer's own channel (not solely partner-reported, to prevent abuse) | Support-mediated confirmation before backend honors it |

**Critical incidents** (`vehicle_breakdown`, `accident`, any partner-flagged safety issue) always trigger an immediate, high-priority notification to Admin Ops/Support regardless of time of day, and surface the RapidMedi Support contact prominently — see Section 24 for the full safety system.

---

## 15. Customer Communication

- **Call Customer / Message Customer** buttons on the Active Delivery Screen — both route through RapidMedi-controlled communication (Section 2.3); the app never has access to, stores, or displays the customer's real number at any point in its data model.
- **Masked call:** tapping "Call Customer" invokes a provider-issued virtual number (or a click-to-call flow through the telephony provider's SDK/API) that bridges to the customer's real number server-side; the device's own call log will show the virtual number, not the customer's real one.
- **Secure messaging [ASSUMPTION-16]:** an in-app, RapidMedi-hosted lightweight chat/quick-message feature (e.g., preset messages: "I've arrived", "Running 5 min late") rather than SMS to a real number — avoids exposing any number at all for simple status updates.
- **Call duration & attempt logging:** written server-side from the telephony provider's webhook/callback, not self-reported by the client (preventing a partner from falsifying "I tried calling" if that becomes relevant to a dispute).
- **If communication service is unavailable:** UI clearly shows **"Contact RapidMedi Support"** as the only path — no fallback to any real number is ever shown, under any failure condition.

## 16. Pharmacy Communication

Same architecture and rules as Section 15, applied to the pharmacy side: masked call to the pharmacy's registered operational line (not the owner's personal number), secure messaging for pickup-issue reporting (e.g., "package not ready", "wrong item prepared"), Support fallback identical in behavior.

---

## 17. Delivery Partner Registration

```
Registration → Document Upload → KYC Submitted → Under Review →
   ├─ Approved → Partner can go ONLINE
   └─ Rejected → Reason shown → Re-upload → back to Under Review
```

### 17.1 Required information
Name, mobile number (OTP-verified at signup), email (optional or required — **[ASSUMPTION-17]** optional, mobile is the primary identity), date of birth (age-eligibility check), gender (optional, only if operationally/legally needed — **[ASSUMPTION-18]** treated as optional), profile photo, Aadhaar number + image, PAN number + image, Driving License number + image + expiry date, vehicle type, vehicle registration number, RC number + image, vehicle insurance policy + expiry date, bank account number, IFSC code, account holder name, cancelled cheque or equivalent bank proof image.

### 17.2 Partner cannot receive deliveries until required verification is complete
The ONLINE toggle (Section 7) is hard-disabled — not just hidden — until `kycStatus.overall === 'approved'`; the app shows a clear checklist of what's pending.

### 17.3 Re-submission
Rejected documents can be re-uploaded individually (mirrors Admin Dashboard's per-document KYC review granularity) without re-entering unrelated fields; a resubmission-count limit (Admin-configured) applies before the case is escalated for manual outreach.

---

## 18. Document Security

- **Storage structure:** `kyc/deliveryPartners/{partnerId}/{documentType}/{fileId}.{ext}` in Firebase Storage — mirrors the Admin Dashboard spec's storage convention for consistency across the platform.
- **Access rules:** Never publicly readable. The partner app can only fetch **their own** documents (for the Profile screen's "view my submitted documents" feature) via a short-lived signed URL minted by a Cloud Function that verifies `request.auth.uid === partnerId`. Admin access is via the separate Admin Dashboard spec's `mintSignedDocUrl` equivalent, logged identically.
- **Download restrictions:** The app displays documents in-app (image viewer); it does not expose a "save to device gallery" affordance for KYC documents, reducing the risk of sensitive images ending up in an unprotected local gallery/backup.
- **Expiry tracking:** Driving License and Insurance expiry dates are stored as structured fields (not just embedded in the image) so the backend can run scheduled expiry checks (Section 26).
- **Verification status:** Read-only to the partner (`kycStatus.{documentType}: pending | verified | rejected`).
- **Audit logs:** Every document view/download-link mint is logged server-side (actor, document, timestamp), mirroring Admin Dashboard PR-04/PR-05.
- **Secure upload:** Client-side image compression before upload (reduces bandwidth cost on partners' often-limited data plans and speeds up the KYC flow); file-type validation (JPEG/PNG/PDF only for documents, size cap enforced both client-side pre-upload and server-side on receipt — never trust the client-side check alone); basic malware/content-type sniffing server-side (verify actual file bytes match the declared MIME type, not just the extension) before accepting into permanent storage.

---

## 19. Profile

Sections: Personal information (name, DOB, gender if provided — edit requests for identity fields route through a review flow rather than being freely self-editable, since they're tied to KYC), Profile image (freely re-uploadable, subject to basic content moderation), Vehicle information, KYC status (read-only, with re-upload actions on rejected items), Bank information (masked by default, matching Admin Dashboard's PR-02 masking convention, edit requires re-verification), Documents (view-only, per Section 18), Notification settings (per-channel toggles where Android allows, Section 6.1), Language selection, Support (entry point to contact flow), Logout, Account deletion request (submits a request for backend/Ops processing — not an instant self-service hard-delete, consistent with Admin Dashboard's soft-delete/BR-09 posture across the platform).

---

## 20. Earnings

- Today's / Weekly / Monthly earnings, delivery-wise earnings breakdown, incentives, bonuses, adjustments, completed-delivery count, pending settlement amount.
- **All earnings figures are server-computed and server-authoritative.** The `calculateEarnings` Cloud Function (Admin-Dashboard-spec-aligned naming, Section 20 there) runs on delivery completion, applying the delivery-charge/commission rule version active at order time (mirrors Admin Dashboard BR-14) plus any incentive rules; the client only ever **displays** values read from `earnings/{partnerId}` documents, never computes an authoritative total locally. A client-side "estimated earnings today" sum (for a snappy UI before the authoritative doc syncs) is clearly labeled as an estimate if ever shown ahead of server confirmation — **[ASSUMPTION-19]**.
- Internal financial information not relevant to the partner (platform commission internals, other partners' figures) is never exposed.

## 21. Delivery History

List of completed, cancelled, and failed deliveries: date, time, earnings for that delivery, status, order reference (RapidMedi order ID, not any payment-gateway reference), pickup area (coarse, e.g. locality name — not the full pharmacy address retroactively), delivery area (coarse, e.g. locality/landmark — not the customer's full historical address retained indefinitely in the partner-visible view). This coarsening is a deliberate data-minimization choice: a partner doesn't need indefinite access to a past customer's exact address once the delivery is long complete (Section 34).

## 22. Dashboard

```
┌─────────────────────────────────────────┐
│  [ONLINE/OFFLINE toggle]     [Support]   │
├─────────────────────────────────────────┤
│  Current Delivery (if BUSY) — prominent, │
│  tap-through to Active Delivery Screen   │
├───────────────┬───────────────────────────┤
│ Today's        │ Today's Earnings          │
│ Deliveries: N  │ ₹X                        │
├───────────────┴───────────────────────────┤
│  Quick Actions: Earnings · History ·      │
│  Documents · Notifications                │
├─────────────────────────────────────────┤
│  Performance summary (compact, tap for    │
│  detail) — acceptance rate, rating        │
└─────────────────────────────────────────┘
```

Active delivery, if any, always takes visual priority over analytics/summary content — the dashboard's job during a live delivery is to get the partner into the Active Delivery Screen with one tap, not to show them charts.

## 23. Active Delivery Screen

The single most-used, highest-stakes screen. Composition (top to bottom): status label (large, unambiguous — "Heading to Pharmacy" / "Heading to Customer"), map (majority of screen real estate), destination card (address + landmark, distance/ETA), primary action button (full-width, changes label per state: "Arrived at Pharmacy" → "Confirm Pickup" → "Arrived at Customer" → "Enter OTP"), secondary row: Navigate (opens external maps), Call (masked), Support. A visible, always-reachable "Report Issue" affordance (not buried in a menu) for the failure taxonomy in Section 14.

Design constraints: **large touch targets** (minimum 48dp per Android accessibility guidance), **one-handed usability** (primary action button reachable by thumb in the lower half of the screen), **minimal distractions** — no promotional content, no unrelated navigation chrome, nothing competing with the current delivery task.

---

## 24. Emergency / Safety

- **RapidMedi Support** — always-visible entry point (Active Delivery Screen, Dashboard) for non-emergency issues (customer/pharmacy problems, app issues, general help).
- **Accident reporting** — one-tap "I was in an accident" flow from the Report Issue surface: captures location, timestamp, optional photo, immediately flags Admin as a critical incident, and pauses the delivery-progress expectations for that order (no SLA penalty accrues while a critical incident is open).
- **Vehicle breakdown reporting** — similar immediate-flag flow, triggers reassignment consideration by Ops.
- **Unsafe situation reporting** — a general "I don't feel safe" escalation for situations like a hostile customer, unsafe delivery location, etc. — routes directly to Support with priority handling.
- **Emergency contact integration [ASSUMPTION-20]:** the app may surface a clearly-labeled, non-integrated link/shortcut to call local emergency services (e.g., a simple "Call 112" button using the standard Android dialer, not a masked/proxied call) — but this is presented as a convenience shortcut to the *standard device dialer*, not a RapidMedi-operated emergency response service.
- **Explicit disclaimer, shown contextually wherever safety features appear:** *"RapidMedi Support is not an emergency service. In a medical, safety, or law-enforcement emergency, contact local emergency services directly."* This distinction is treated as a hard requirement, not optional copy — the spec does not permit any UI language implying RapidMedi Support can or will dispatch emergency responders.

---

## 25. Notifications

| Notification | Channel (Section 6.1) | Priority | Trigger |
|---|---|---|---|
| New Delivery | `delivery_assignments` | High | New assignment offered |
| Delivery Accepted (confirmation) | `delivery_updates` | Default | Partner's own accept action confirmed by server |
| Pickup Reminder | `delivery_updates` | Default | No movement toward pharmacy within threshold |
| Customer Waiting | `delivery_updates` | Default | Partner near customer but hasn't marked arrived within threshold |
| Delivery Reminder | `delivery_updates` | Default | General nudge if a leg is taking unusually long |
| Support Response | `delivery_updates` | Default | Support replies to an open ticket/report |
| KYC Update | `earnings_kyc` | Low | Document approved/rejected |
| Document Expiry | `earnings_kyc` | Low→escalating | Section 26 reminder cascade |
| Payment Update | `earnings_kyc` | Low | Settlement processed |
| Incentive | `earnings_kyc` | Low | Bonus/incentive credited |
| System Announcement | `system_announcements` | Default | Platform-wide message from Admin |

### 25.1–25.4 Delivery behaviors
Foreground: rendered as in-app banners/toasts, not system notifications (avoids redundant double-alerting, consistent with Section 6.3). Background/terminated: standard FCM system notification. **25.4 Polling fallback:** on every app foreground event, the app reconciles state directly from Firestore (current assignment, KYC status, unread notifications) regardless of whether push notifications were reliably delivered — push is a convenience/urgency signal, never the sole source of truth for what the partner sees.

---

## 26. Document Expiry

Tracked: Driving License expiry, Insurance expiry, and any other document type flagged as having a legal/operational expiry (**[ASSUMPTION-21]**: RC itself often has no expiry in the same sense, so the expiry-tracking system is built generically — a per-document-type `hasExpiry: boolean` + `expiryDate` field — rather than hardcoding which documents expire, since this varies by state/vehicle-type and must stay Admin-configurable per the source brief's instruction not to assume uniform expiry behavior).

Reminder cascade: 30-day / 15-day / 7-day / 1-day-before / expired — each a `earnings_kyc`-channel notification with escalating tone, driven by a scheduled Cloud Function (mirrors Admin Dashboard's document-expiry monitoring). **On `expired`:** the backend automatically restricts the partner's ONLINE eligibility for the specific requirement tied to that document (configurable per document type — e.g., an expired DL blocks going ONLINE entirely, since it's typically a hard legal requirement, whereas some other document types might only trigger a warning depending on jurisdiction/Admin configuration) — this restriction is enforced server-side in the same `updateAvailability` function referenced in Section 7, not just as a client-side UI block.

---

## 27. Performance

Tracked and shown to the partner (their own metrics only): Acceptance Rate, Rejection Rate, Cancellation Rate, Average Pickup Time, Average Delivery Time, On-time Delivery Rate, Customer Rating, Store Pickup Delay (informational — helps the partner understand delays not of their own making), GPS Reliability (informational, helps partner understand why some arrivals needed manual confirmation), Active Hours.

The partner sees only metrics relevant to their own performance and improvement — never comparative rankings against other named partners (aggregate anonymized benchmarking, e.g., "your on-time rate vs. city average," is acceptable since it doesn't expose any other individual's data — **[ASSUMPTION-22]**).

---

## 28. Offline-First Behavior

- **Local state:** current active assignment (cached), online/offline toggle intent, queued location points, queued status-transition requests, queued issue reports.
- **Cached active delivery:** if network drops mid-delivery, the app continues showing the last-known state and allows the partner to proceed through UI steps (e.g., tapping "Arrived") — these are queued as pending actions, not silently blocked, so the partner isn't stuck unable to interact with their own screen.
- **Offline action queue:** each queued action carries a client-generated idempotency key (mirrors Admin Dashboard's Cloud Function idempotency pattern, Section 18 there) so a retried submission after reconnect can never double-process (e.g., can't double-confirm pickup or double-trigger OTP verification).
- **Retry mechanism:** exponential backoff on reconnect attempts; queue flushes in original order once connectivity returns.
- **Conflict resolution:** the backend is always the tiebreaker — if a queued client action conflicts with a state the backend has already moved past (e.g., the order was reassigned by Admin while the partner was offline), the queued action is rejected with a clear reason and the client re-syncs to the server's actual current state rather than fighting to apply a stale action.
- **Sync status indicator:** a small, unobtrusive UI element showing "Syncing..." / "All changes saved" / "Offline — will sync when connected" so the partner always has an honest signal, never a false "success" for an action that hasn't actually reached the server yet.
- **Critical invariant:** *the client never marks a delivery as permanently completed based on local/offline state alone* — `status: completed` only ever exists in the app's UI because the server confirmed it (via the OTP verification response or a subsequent Firestore sync), never as an optimistic-only local transition for this specific terminal state (other, reversible-if-wrong transitions like "Arrived" can be shown optimistically since they're low-stakes and self-correcting on sync).

---

## 29. State Management

| State category | Tool | Examples |
|---|---|---|
| Local UI state | React component state / Zustand (ephemeral, screen-scoped) | Form input values, modal open/closed, map camera position |
| Global app state | Zustand | Online/offline toggle intent, current assignment summary (mirrored from server for fast access), auth/session identity, notification permission status |
| Server state | TanStack Query | Assignment details, KYC status, earnings, delivery history, notifications — all Firestore-backed reads wrapped for caching/retry/optimistic-update consistency |
| Persistent local storage | React Native MMKV | Last known location cache, offline action queue, auth token cache, user preferences (language, notification toggles), draft form autosave |

Validation: React Hook Form + Zod for all structured input (registration fields, issue reports, OTP entry) — schemas shared conceptually with the Cloud Function-side validation (Admin Dashboard Section 130 pattern) to keep client and server rules from drifting apart.

---

## 30. Firebase

| Service | Usage in this app |
|---|---|
| **Firebase Authentication** | Phone-number (OTP) based sign-in for partners — matches the low-friction, no-password-to-remember expectation for a gig-worker audience; custom claim `role: 'delivery_partner'` plus `partnerId` set on account creation. |
| **Cloud Firestore** | Primary data store for assignments, orders (read-scoped), locations, earnings, KYC status, notifications, support tickets, history — see Section 31. |
| **Firebase Storage** | KYC document images, profile photo, optional issue-report photo evidence. |
| **Firebase Cloud Messaging** | New-assignment alerts, all notification categories (Section 25). |
| **Cloud Functions** | All privileged/business-logic operations (Section 32) — client never writes directly to authoritative fields. |
| **Firebase App Check** | Attaches attestation to every client request to Firestore/Functions, mitigating abusive/scripted traffic hitting the backend outside the real app (relevant given the OTP/location/earnings surfaces are prime abuse targets — Section 33). |

---

## 31. Firestore

### 31.1 Collections (Delivery-Partner-relevant)

```
/deliveryPartners/{partnerId}
/deliveryPartners/{partnerId}/kycDocuments/{docId}
/orders/{orderId}                         (read-scoped: partner sees only fields relevant per Section 2)
/deliveryAssignments/{assignmentId}
/deliveryLocations/{assignmentId}
/deliveryHistory/{partnerId}/entries/{entryId}
/notifications/{partnerId}/items/{notificationId}
/supportTickets/{ticketId}
/earnings/{partnerId}
/kyc/{partnerId}                          (status summary; documents live under kycDocuments)
/auditLogs/{logId}                        (write-only from partner's perspective — no read access)
/settings/{partnerId}                     (notification prefs, language)
```

### 31.2 Representative schemas

```json
// /deliveryPartners/{partnerId}
{
  "partnerId": "string",
  "fullName": "string",
  "phone": "string",
  "email": "string | null",
  "dob": "date",
  "profilePhotoUrl": "string",
  "vehicleType": "bike | scooter | bicycle",
  "vehicleNumber": "string",
  "cityId": "string",
  "status": "pending_verification | active | suspended | rejected | archived",
  "availability": "online | offline | busy",
  "kycStatus": {
    "drivingLicense": "pending | verified | rejected",
    "rc": "pending | verified | rejected",
    "aadhaar": "pending | verified | rejected",
    "vehicleInsurance": "pending | verified | rejected",
    "bank": "pending | verified | rejected",
    "overall": "pending | approved | rejected"
  },
  "reliabilityScore": "number",
  "lastKnownLocation": { "lat": "number", "lng": "number", "timestamp": "timestamp", "accuracy": "number" },
  "createdAt": "timestamp",
  "suspendedReason": "string | null",
  "deletedAt": "timestamp | null"
}

// /deliveryAssignments/{assignmentId}
{
  "assignmentId": "string",
  "orderId": "string",
  "partnerId": "string",
  "status": "pending_acceptance | en_route_pickup | arrived_pickup | picked_up | en_route_delivery | arrived_delivery | otp_pending | delivered | cancelled | failed",
  "pharmacy": { "pharmacyId": "string", "pickupPin": "string (hashed server-side)", "location": "geopoint", "displayInfo": "string | null" },
  "customer": { "firstName": "string", "deliveryAddress": "string", "landmark": "string | null", "instructions": "string | null", "location": "geopoint (coarse)" },
  "codAmount": "number | null",
  "expiresAt": "timestamp",
  "arrivedAtPharmacyAt": "timestamp | null",
  "pickedUpAt": "timestamp | null",
  "arrivedAtCustomerAt": "timestamp | null",
  "deliveredAt": "timestamp | null",
  "cancellation": { "reasonCode": "string | null", "cancelledBy": "partner | system | admin | null", "cancelledAt": "timestamp | null" },
  "createdAt": "timestamp"
}

// /deliveryLocations/{assignmentId}
{
  "assignmentId": "string",
  "partnerId": "string",
  "current": { "lat": "number", "lng": "number", "timestamp": "timestamp", "accuracy": "number", "speed": "number | null", "isMocked": "boolean" },
  "locationStale": "boolean",
  "updatedAt": "timestamp"
}

// /earnings/{partnerId}
{
  "partnerId": "string",
  "today": "number",
  "thisWeek": "number",
  "thisMonth": "number",
  "pendingSettlement": "number",
  "deliveryEarnings": [
    { "assignmentId": "string", "amount": "number", "incentive": "number", "date": "timestamp" }
  ],
  "updatedAt": "timestamp"
}
```

### 31.3 Read/write patterns & indexes
- Partner reads `deliveryAssignments` filtered by `partnerId == request.auth.uid` — composite index on `(partnerId, status)` for the "current active assignment" query.
- `deliveryHistory` composite index on `(partnerId, completedAt desc)` for paginated history.
- `notifications` composite index on `(partnerId, read, createdAt desc)`.
- All writes to `deliveryAssignments`, `earnings`, `kycStatus`, `deliveryLocations.current` (validated fields) route through Cloud Functions — Security Rules deny direct client writes to these paths outright (Section 33.3), matching the Admin Dashboard's "deny-by-default, functions re-check role" posture.

---

## 32. Cloud Functions

| Function | Trigger | Purpose |
|---|---|---|
| `createDeliveryAssignment` | Backend matching engine (not client) | Creates a `pending_acceptance` assignment, sends FCM alert |
| `handleAssignmentTimeout` | Scheduled/trigger on `expiresAt` | Expires unanswered offers, reassigns |
| `acceptAssignment` | Callable | Validates partner eligibility (online, not busy, KYC approved), transitions to `en_route_pickup`, sets `BUSY` |
| `rejectAssignment` | Callable | Records rejection, triggers reassignment |
| `processLocationUpdate` | Callable/HTTPS | Validates, dedupes, rejects implausible points; updates `deliveryLocations` |
| `updateDeliveryStatus` | Callable | Generic status-transition guard used for Arrived/geofence-assisted transitions not covered by a more specific function |
| `verifyPickup` | Callable | Validates Pickup PIN, transitions to `picked_up`, unlocks full delivery-destination detail |
| `verifyDeliveryOTP` | Callable | Validates OTP hash, transitions to `delivered`, triggers `calculateEarnings` |
| `completeDelivery` | Triggered by successful `verifyDeliveryOTP` | Finalizes order, stops location tracking for that assignment, writes `deliveryHistory` entry |
| `calculateEarnings` | Triggered by `completeDelivery` | Computes authoritative earnings using the delivery-charge/commission rule version active at order time |
| `reportDeliveryIssue` | Callable | Writes a reason-coded issue report, triggers escalation logic per Section 14's table |
| `updateAvailability` | Callable | Validates and applies ONLINE/OFFLINE toggle, enforcing BUSY-lock and KYC/expiry eligibility |
| `uploadDocument` (supporting function around Storage upload) | Callable | Validates file type/size server-side, writes `kycDocuments` metadata entry |
| `sendPartnerNotification` | Various triggers | Centralized notification dispatch for all categories in Section 25 |
| `checkDocumentExpiry` | Scheduled (daily) | Drives the Section 26 reminder cascade and eligibility restriction |
| `suspendAccount` | Callable (Admin-invoked, not partner-invoked — listed here for completeness of the data flow this app must handle) | Sets `status: suspended`; if partner is mid-delivery, triggers Admin-Dashboard-side reassignment, and the partner app immediately reflects the suspension (blocking further ONLINE toggling) via the real-time listener |
| `contactSupport` | Callable | Creates/updates a `supportTickets` entry, initiates masked-communication or ticket-based routing |
| `logAuditEvent` | Internal (called by the above, not directly by client) | Writes the immutable `auditLogs` entry for every privileged action, mirroring the Admin Dashboard's BR-08 write-through-audit principle |

Every callable function: (a) verifies `request.auth.uid` corresponds to the `partnerId` on the target record, (b) validates the requested transition against the record's current state (illegal transitions are rejected, not silently coerced), (c) is idempotent via a client-supplied idempotency key, (d) writes to `auditLogs` as part of the same invocation where the action is privileged/state-changing.

---

## 33. Security

- **Authentication:** Phone-OTP Firebase Auth (Section 30); session tokens short-lived, refreshed transparently.
- **Authorization:** Custom claim `role: 'delivery_partner'` checked in every Security Rule and every Cloud Function; a token with any other role is rejected by every partner-scoped rule/function.
- **Role validation:** Server-side only — the client never asserts its own role to gain access to anything.
- **Firestore security:** Deny-by-default; partner-scoped collections readable only where `resource.data.partnerId == request.auth.uid`; writes to authoritative fields (status, OTP, earnings, KYC status) denied entirely at the client SDK level, funneled through Cloud Functions (mirrors Admin Dashboard Section 134).
- **Storage security:** `/kyc/deliveryPartners/**` denied to public/other-partner reads; partner can read only their own path via signed URL; Admin access via the separate signed-URL-minting function, logged.
- **App Check:** Enforced on all Firestore/Functions calls from the app, rejecting traffic that doesn't carry a valid App Check attestation (mitigates scripted/bot traffic hitting sensitive endpoints like OTP verification or assignment acceptance).
- **Rate limiting:** Applied at the Cloud Function layer for OTP verification attempts (Section 13.3–13.4), location update frequency (rejecting abnormally high-frequency submissions as a potential abuse signal), and support-contact submissions.
- **OTP protection:** Hashed storage, capped retries, never exposed to the partner in plaintext, single-use.
- **Location privacy:** See Section 34 in full.
- **Sensitive document protection:** See Section 18.
- **Session handling:** Short-lived ID tokens, refresh tokens revocable server-side (Admin can force-logout a suspended partner — `revokeRefreshTokens` equivalent, mirroring Admin Dashboard Section 21).
- **Token handling:** Tokens never persisted in plaintext outside secure platform storage (Android Keystore-backed secure storage via the Auth SDK's own mechanisms, not manually serialized to MMKV).
- **Device security:** [ASSUMPTION-23] The app does not attempt aggressive root-detection blocking (which frequently produces false positives on legitimate but customized Android devices common among gig workers and would block real partners from earning) — instead, root/jailbreak status (where detectable) is logged as a risk signal contributing to the fraud-flag system (Section 33.1 below), not an automatic hard block, consistent with the "flag for review, don't punitively auto-block" philosophy applied to mock-location detection (Section 8.5).
- **Screenshot considerations:** `FLAG_SECURE` applied on screens displaying KYC document images or bank details, preventing screenshots/screen-recording of those specific screens where Android permits (`FLAG_SECURE` is an Android-standard, well-supported capability for this purpose).
- **Mock/GPS spoofing detection:** Section 8.5 — flagged, not blocking, contributing to the fraud-risk signal set below.
- **Audit logging:** Every privileged Cloud Function call writes an audit entry (Section 32), consistent in structure with the Admin Dashboard's `auditLogs` schema so both apps' events are queryable together by Admin/Support.

### 33.1 Fraud-risk signal set (feeds Admin Dashboard's Fraud Detection Ready Architecture, mirrored here for completeness)
Mock-location flags, implausible-movement flags (Section 47), repeated OTP-retry-cap hits, unusually high rejection/cancellation rate in a short window, multiple simultaneous login attempts from different devices for one account (Section 47), root/jailbreak signal — all logged to `fraudFlags`, all human-reviewed via the Admin Dashboard, none auto-punitive from the client side.

---

## 34. Location Security

- **Who can read current location:** The backend matching engine (for assignment computation), the Admin Dashboard (Ops/Support roles, per that spec's permission matrix), and — indirectly, via a purpose-built read — the Customer App's live-tracking view for the customer's *own currently active order only*, never any historical trail beyond that one delivery.
- **Who can read historical location:** Admin Dashboard (Ops/Support/Analytics per role) for operational and dispute-resolution purposes, retained per data-retention policy; the partner cannot query other partners' historical location, and cannot query their own beyond what the Delivery History / Performance screens surface as aggregated metrics (not raw coordinate trails).
- **Retention:** [ASSUMPTION-24] Raw fine-grained location points are retained for a bounded window (e.g., 90 days) sufficient for dispute resolution and fraud review, then aggregated/summarized (e.g., into performance metrics) and the raw points purged by a scheduled function — mirrors Admin Dashboard's `purgeExpiredData` pattern (Section 152/135 there).
- **When collection starts:** The moment the partner toggles ONLINE (needed for assignment-matching distance calculations) — not continuously in the background at all times regardless of availability.
- **When collection stops:** Immediately on toggling OFFLINE (when not BUSY) and immediately on delivery completion for that specific assignment's tracking stream (Section 4, `completed` state).
- **After delivery completion:** The live per-assignment tracking stream stops; the completed route is retained only as needed for the retention window above, not indefinitely displayed anywhere in the partner or customer app.
- **Data minimization principle applied throughout:** the app collects location only when operationally necessary (ONLINE or BUSY), shares it only with parties who need it for the current order, and does not retain or expose a partner's full movement history to anyone beyond what operational/compliance needs require.

---

## 35. Battery Optimization

- **Adaptive frequency:** base 15–20s interval, widened under low-battery conditions (Section 9.1); distance-based triggers reduce unnecessary updates while stationary.
- **Background tracking:** implemented via an Android **foreground service** (mandatory approach for reliable continuous background location on modern Android — a plain background service or WorkManager-only approach is not sufficient for continuous, timely location updates and is explicitly avoided here) with a persistent, low-priority notification explaining why (transparency requirement, not just a technical one — partners should always know when they're being tracked).
- **Network-aware batching:** points queued and sent in batches when the network briefly drops rather than firing constant failed-retry attempts that drain battery/data.
- **GPS accuracy modes:** high-accuracy only while BUSY or ONLINE-and-actively-relevant; when merely idle-ONLINE (waiting for an assignment, not yet assigned), a **[ASSUMPTION-25]** slightly relaxed accuracy/frequency mode is used, tightening back to high-accuracy the moment an assignment is accepted — balances "backend needs a reasonably fresh position for matching" against "don't drain an idle partner's battery at delivery-grade precision."
- **Stop tracking after delivery:** enforced (Section 34) — the foreground service and its notification are torn down the moment the assignment reaches `completed`/terminal state and the partner has no other active assignment.
- **Avoid unnecessary polling:** Firestore real-time listeners (push-based) are preferred over polling wherever the SDK supports it; the app avoids fixed-interval "check for updates" polling loops except as the documented Section 25.4 foreground-reconciliation fallback (which fires once per foreground event, not on a tight timer).

---

## 36. UI / UX

Simple, fast, professional, high-contrast, one-hand-friendly, large touch targets, minimal typing, minimal steps. Critical delivery actions (Accept, Confirm Pickup, Enter OTP, Complete) are always the single most visually dominant element on their respective screen — never competing with secondary content for attention. Animation is used sparingly (Section 38); the app optimizes for a partner glancing at the phone for 1–2 seconds while stationary at a light or paused briefly, not for a leisurely browsing session.

## 37. Design System

| Element | Specification |
|---|---|
| **Brand colors** | Primary brand color for CTAs/active states; the platform-wide status-color convention from the Admin Dashboard spec is reused for consistency: Green = success/active/verified/delivered, Amber = warning/pending, Red = danger/rejected/suspended/cancelled/critical-incident, Blue = info/in-progress, Gray = neutral/inactive. |
| **Typography** | System-legible sans-serif (Inter or equivalent); a monospace/tabular variant for OTP digits, PINs, and order IDs to aid fast, unambiguous reading. |
| **Spacing** | 4px base scale (4/8/12/16/24/32/48/64), generous on the Active Delivery Screen's primary button for thumb accuracy. |
| **Buttons** | Primary (one per screen, full-width where it's the main action), Secondary, Destructive (red, reserved for Cancel/Report-critical actions, always confirm-gated). |
| **Inputs** | Large touch-friendly fields; OTP/PIN inputs use segmented digit boxes with auto-advance and numeric keyboard forced. |
| **Cards** | DeliveryCard, EarningsCard — flat, minimal shadow, clear status badge. |
| **Status badges** | Color + icon + text label always together (never color-alone), matching the Admin Dashboard's accessibility posture. |
| **Bottom sheets** | Used for secondary actions (Report Issue category picker, Cancel-reason picker) so the main screen context stays visible underneath. |
| **Modals** | Reserved for must-acknowledge confirmations (Cancel delivery, Suspend-notice). |
| **Dialogs** | Confirmation dialogs before any destructive/irreversible-appearing action, naming the specific action on the confirm button (not generic "OK"), matching Admin Dashboard Section 120's convention. |
| **Toasts / Snackbars** | Non-blocking status feedback (sync status, minor confirmations); errors persist until dismissed, successes auto-dismiss. |
| **Icons** | Consistent icon set across status/action pairs (e.g., the same "pickup" icon everywhere pickup is referenced). |
| **Maps** | Google Maps SDK embed, minimal chrome, destination-focused camera framing. |
| **Navigation bars / Headers** | Minimal, back-navigation always available except mid-critical-action (e.g., not escapable mid-OTP-submit). |
| **Empty states** | Designed for "No deliveries today yet", "No notifications", etc. — encouraging, not blank. |
| **Error states** | Human-readable, action-oriented (Section 40). |
| **Skeleton screens** | Shape-matched loading placeholders for history/earnings lists, avoiding layout shift. |

## 38. Animations

Used only where useful: assignment-received alert entrance (draws attention, functional not decorative), status-transition micro-feedback (e.g., a brief checkmark on successful pickup confirmation), delivery-completed success state (a clear, satisfying but brief confirmation — this is a moment partners should feel good about, a small reward is appropriate), loading indicators, map camera transitions (smooth but fast). **Explicitly avoided:** any animation that delays a critical action's availability (e.g., no artificial delay before the "Confirm Pickup" button becomes tappable) or that plays during active navigation/critical-action sequences in a way that costs the partner time.

## 39. Accessibility

Large-text support (respects system font-scaling, layouts tested not to break at larger scales), screen-reader support (semantic labels on all icon-only buttons — Call, Navigate, Report Issue, etc.), high-contrast color choices meeting WCAG AA where feasible for outdoor/sunlight readability (a practical concern for this specific app beyond the standard accessibility rationale — partners are frequently reading the screen in direct sunlight), touch targets minimum 48dp, accessible status announcements (state changes announced to screen readers, not just visually indicated), color-independent status indicators (Section 37).

## 40. Error Handling

User-friendly, action-oriented messages for: network errors ("You're offline — we'll retry automatically" rather than a raw fetch error), Firebase errors (mapped to friendly copy, raw error codes logged not shown), GPS errors ("Can't get your location — check that Location is turned on"), permission errors (with a direct path to fix, e.g., Settings deep link), authentication errors ("Session expired — please log in again"), invalid OTP ("That code doesn't match — try again" with remaining-attempts count), assignment timeout ("This delivery is no longer available"), server errors (generic friendly fallback, never a raw stack trace or technical code shown to the partner), location unavailable, document upload failure ("Couldn't upload — check your connection and try again," with the file retained locally for retry, not lost), payment/earnings errors (routed to Support rather than shown as a raw error, since money issues need a human path, not just a dismissible toast).

## 41. Validation

React Hook Form + Zod, client-side for immediate feedback and server-side (Cloud Functions) as the authoritative check (client validation is never trusted alone — mirrors Admin Dashboard Section 131's posture). Validated fields: phone (10-digit Indian mobile pattern), email (standard format, if provided), name (non-empty, reasonable length), documents (required file presence, type, size), bank information (account number format, IFSC format `[A-Z]{4}0[A-Z0-9]{6}`), vehicle number (state-code-prefixed registration pattern), license number (format per issuing pattern), file size (client pre-check + server hard cap), file type (JPEG/PNG/PDF only), location (plausibility bounds, Section 8.6), OTP (numeric, fixed length per Section 13).

---

## 42. Folder Structure

```
rapidmedi-delivery-partner/
├── src/
│   ├── screens/            # One folder per screen (Dashboard, ActiveDelivery, Earnings, ...) —
│   │                        # keeps screen-level composition separate from reusable pieces
│   ├── components/         # Reusable, presentation-only UI primitives (Section 43)
│   ├── features/           # Feature-scoped logic+UI bundles (assignment, pickup, delivery, kyc,
│   │                        # earnings) — each feature owns its hooks/components/services together
│   │                        # so a feature can be reasoned about and modified in one place
│   ├── services/           # Thin wrappers around Cloud Function calls / Firestore queries —
│   │                        # isolates "how we talk to the backend" from UI code
│   ├── firebase/           # SDK initialization, converters, App Check setup
│   ├── hooks/               # Cross-feature custom hooks (useLocation, useOnlineStatus, ...)
│   ├── store/               # Zustand stores (session, ui, assignment-summary)
│   ├── navigation/          # React Navigation stack/tab definitions, deep-link handling
│   ├── utils/                # Formatting, masking, distance/time calculations
│   ├── constants/            # Status enums, reason codes, notification channel IDs
│   ├── types/                 # Shared TypeScript interfaces mirroring Firestore models
│   ├── models/                 # Data-model-adjacent helper classes/mappers (Firestore doc ↔ typed object)
│   ├── validation/              # Zod schemas
│   ├── location/                 # Location-service abstraction (foreground service control,
│   │                               # permission flows, mock-detection, geofencing) — isolated so
│   │                               # the platform-specific native location code has one clear home
│   ├── notifications/             # FCM setup, channel creation, notification-tap deep-link routing
│   ├── maps/                       # Map rendering + external-navigation deep-link helpers
│   ├── storage/                     # MMKV wrappers, offline queue implementation
│   ├── analytics/                    # Event-tracking wrapper (Section 44)
│   └── security/                      # App Check init, FLAG_SECURE screen wrapper, root-signal check
├── android/                             # Native Android project
├── ios/                                  # Native iOS project (scaffolded for future support, Section 51)
└── __tests__/                             # Mirrors src/ structure (Section 46)
```

Each folder exists to keep a **single, clear responsibility boundary**: `services/` never contains UI, `components/` never contains business logic or direct Firebase calls, `features/` is where the two meet for a specific user-facing capability, and platform-sensitive concerns (`location/`, `notifications/`, `security/`) are isolated behind clean interfaces specifically so the "architect for Android now, iOS later" requirement (Section 1) doesn't require touching business logic when a platform-specific implementation is swapped in later.

---

## 43. Reusable Components

| Component | Responsibility | Key props (conceptual) |
|---|---|---|
| `PrimaryButton` | Main CTA, full-width variant available | `label, onPress, loading, disabled` |
| `SecondaryButton` | Lower-emphasis action | `label, onPress, disabled` |
| `StatusBadge` | Color+icon+text status indicator (Section 37) | `status, size` |
| `DeliveryCard` | Summary card for a delivery (dashboard/history list item) | `assignment, onPress` |
| `EarningsCard` | Summary earnings figure with period label | `amount, period, trend?` |
| `MapView` | Wraps Google Maps SDK, shows current+destination pins and route line | `currentLocation, destination, routePolyline?` |
| `LocationPermissionModal` | Explains why location is needed, drives the permission flow (Section 8.4) | `stage ('foreground'|'background'|'servicesDisabled'), onResolve` |
| `OTPInput` | Segmented digit entry, auto-advance, numeric keyboard | `length, onComplete, error?, attemptsRemaining?` |
| `DocumentUploader` | Pick/capture image, client-side compress, upload with progress | `documentType, onUploaded, existingUrl?` |
| `KYCStatusCard` | Per-document verification status + re-upload action if rejected | `documentType, status, rejectionReason?, onReupload` |
| `LoadingScreen` | Full-screen loading with skeleton or spinner | `message?` |
| `ErrorState` | Friendly error display with retry action (Section 40) | `message, onRetry?` |
| `EmptyState` | Friendly empty-list display | `message, icon?` |
| `ConfirmationDialog` | Reusable confirm-before-destructive-action pattern (Section 37) | `title, message, confirmLabel, onConfirm, onCancel` |
| `SupportButton` | Always-available entry to Support (Section 24) | `context? (screen/order id for pre-filled context)` |
| `NotificationBanner` | In-app foreground alert rendering (Section 6.3, 25) | `notification, onDismiss, onAction` |

---

## 44. Analytics

Events tracked (product-usage analytics, distinct from location/business-logic data — this is internal telemetry to understand app usage and reliability, not a surveillance layer): App Opened, Login Started, Login Completed, Delivery Received, Delivery Accepted, Delivery Rejected, Navigation Started, Arrived at Store, Pickup Confirmed, Delivery Started, Arrived at Customer, OTP Verification Started, OTP Verification Failed, Delivery Completed, Delivery Failed, Support Contacted.

**No unnecessary personal information is collected in analytics events** — events carry `partnerId`, `assignmentId`/`orderId`, timestamp, and event-specific non-PII metadata (e.g., failure reason code) — never customer names, addresses, or phone numbers, even though those exist elsewhere in the data model for operational purposes.

## 45. Crash and Monitoring

Production observability requirements: crash reporting (Firebase Crashlytics or equivalent) capturing stack traces + breadcrumb trail (last N navigation events, last known state) for every crash; ANR (Application Not Responding) detection and reporting, especially relevant given this app's continuous location/foreground-service usage which is a common ANR risk area; location-failure monitoring (rate of failed location permission flows, failed GPS fixes) as a product-health metric, not just individual-user debugging; notification-delivery-failure monitoring (FCM send failures, tracked server-side); assignment-failure monitoring (offers that expired unanswered — both a partner-behavior signal and a potential app-bug signal if the rate spikes unexpectedly); API/backend-failure monitoring (Cloud Function error rates by function name, surfaced to an Ops dashboard — ties into the Admin Dashboard's System Health, Section 108/System Logs there); authentication-failure monitoring (OTP-login failure rate, potential SMS-delivery-provider issues).

---

## 46. Testing

| Layer | Approach |
|---|---|
| **Unit** | Pure functions: masking/formatting utilities, distance/ETA calculations, reason-code lookups, Zod schema validation logic. |
| **Integration** | Cloud Functions tested against the Firebase Emulator Suite (Firestore + Auth + Functions + Storage emulators) — every callable tested for its permission-check and audit-log-write behavior, including negative cases (wrong `partnerId`, illegal state transition, expired assignment). |
| **Component** | Critical interactive components (`OTPInput`, `ConfirmationDialog`, `LocationPermissionModal`, `DocumentUploader`) tested for correct rendering per state and correct callback invocation. |
| **Navigation** | Deep-link handling (notification-tap → correct screen), state-driven screen routing (app always lands on the screen matching the backend's current assignment status, not a stale local route). |
| **Firebase Emulator testing** | Full assignment-lifecycle flows run against emulators: offer → accept → pickup → OTP → complete, including the illegal-transition-rejected paths. |
| **Location testing** | Mocked location providers exercising: permission-denied flows, background-tracking continuity, mock-location flagging, stale-location detection, implausible-movement rejection. |
| **Offline testing** | Airplane-mode simulation mid-flow: queued actions, reconnect-and-flush, idempotency-key dedup verification. |
| **Notification testing** | Foreground/background/terminated delivery paths (Section 6.3), action-button-from-tray flows, channel-importance behavior. |
| **Background testing** | Foreground-service persistence across app backgrounding, screen-lock, and OS memory-pressure scenarios (verifying the service isn't killed prematurely, and if it is, that the app recovers gracefully on reopen per Recovery behavior in Section 4). |
| **OTP testing** | Correct/incorrect entry, retry-cap enforcement, expiry, resend, Support-override path. |
| **Security testing** | Firestore Security Rules unit-tested (`@firebase/rules-unit-testing`) for every "partner should NOT be able to read/write X belonging to another partner" case; attempted direct writes to authoritative fields (status, OTP, earnings) verified as rejected. |
| **Performance testing** | Location-update battery/data consumption profiling; cold-start time; Active Delivery Screen render performance on low-end Android devices (this app's real-world device floor skews toward budget Android hardware, not flagship phones — testing should reflect that). |
| **Device testing** | Explicit test matrix across low/mid-range Android devices and OS versions (Android 8–14 minimum range, given foreground-service/notification-permission behavior differs meaningfully across this span), plus varied OEM skins known for aggressive background-process killing (a well-known real-world Android fragmentation issue directly relevant to this app's background-location reliability). |
| **End-to-end** | Scripted full journeys against the Emulator Suite: registration→KYC-approval→first-delivery; assignment-timeout-and-reassignment; failure-and-escalation paths per Section 14's table; document-expiry-driven eligibility restriction. |

---

## 47. Edge Cases

Explicit expected behavior for every listed case:

| Edge case | Expected behavior |
|---|---|
| Partner goes offline during delivery | Blocked — Section 5.2/7; toggle disabled while BUSY. |
| Partner loses GPS | Manual-override arrival confirmation with flagging, not blocking (Section 8.5). |
| Partner loses internet | Offline queue + retry, transparent sync-status UI (Section 28). |
| Phone battery dies | Backend staleness detection → Ops Escalation, no punitive auto-cancel (Section 5.2, 9.1). |
| App is force closed | Same staleness-detection path; state re-syncs from server on reopen (Section 4 Recovery). |
| Customer changes address | Handled via the Customer App/Support updating the assignment's stored address; partner app reflects the update via its real-time listener, with a clear "Destination updated" notice if it changes mid-navigation. |
| Customer is unavailable | Section 14 `customer_unavailable` flow. |
| Customer refuses order | Section 14 `customer_refused` flow. |
| Pharmacy is closed | Partner reports at arrival; treated similarly to `package_missing_at_pharmacy`, escalated for reassignment/cancellation decision. |
| Pharmacy package unavailable | Section 14 `package_missing_at_pharmacy`. |
| Wrong package | Section 14 `item_mismatch`. |
| Damaged package | Section 14 `package_damaged`. |
| OTP fails | Section 13.3–13.5 retry-cap-then-Support-override path. |
| Partner rejects assignment | Section 5.2. |
| Partner accepts but does not move | Flagged via the no-progress staleness signal (Section 4's `accepted` state "Timeout" row) → Ops Escalation, not an automatic penalty (could be legitimate — e.g., waiting for traffic to clear), but visible for Ops follow-up. |
| Partner takes wrong route | Not blocked or corrected by the app (external navigation is the partner's tool of choice, Section 10) — only relevant if it triggers a stale/no-progress or implausible-movement flag. |
| GPS reports impossible movement | `processLocationUpdate` rejects the specific implausible point (Section 9.1) and contributes to the fraud-risk signal set (Section 33.1) if it recurs. |
| Mock location detected | Flagged (`isMocked: true`), not auto-blocked (Section 8.5, 33.1). |
| Multiple devices logged into same account | **[ASSUMPTION-26]** Firebase Auth allows multiple active sessions by default; this app treats a new-device login as a security-relevant event — the previous session receives a "New login detected on another device" notification and, if account-sharing abuse is suspected (a fraud-risk signal), it's flagged for Admin review rather than auto-locking either session, since legitimate multi-device use (e.g., a lost/replaced phone) is common. |
| Duplicate delivery events | Idempotency keys on every state-changing Cloud Function call prevent double-processing (Section 28, 32). |
| Duplicate notifications | Foreground/background suppression logic (Section 6.3) plus server-side dedup on the notification-dispatch function. |
| Duplicate completion request | `completeDelivery`/`verifyDeliveryOTP` are idempotent — a retried completion request against an already-`completed` order returns the existing success result rather than erroring or double-crediting earnings. |
| Backend timeout | Client shows a retry-friendly error (Section 40), the request is safely retryable due to idempotency keys. |
| Cloud Function failure | Logged to monitoring (Section 45); client falls back to its offline-queue retry behavior where applicable. |
| Partner account suspended during active delivery | The active assignment is reassigned via the Admin Dashboard's reassignment flow (that spec's Section 51/67); the partner app immediately reflects the suspension via its real-time listener and is blocked from further action on the order. |
| Document expires during active work | The document-expiry restriction (Section 26) applies to *future* ONLINE eligibility, not to forcibly interrupting an already-in-progress delivery — an in-progress delivery is allowed to complete even if a document expires mid-delivery, since abruptly stranding a customer's order over a paperwork timing issue is a worse outcome than a short grace period; the partner simply cannot go ONLINE again until resolved. **[ASSUMPTION-27]** |
| Customer support override | Section 13.5 — Admin-Dashboard-invoked, heavily audit-logged, never partner-accessible. |

---

## 48. Data Models

Conceptual (documentation-only) TypeScript-style interfaces — no implementation code, field-shape reference only:

```
DeliveryPartner { partnerId, fullName, phone, email?, dob, profilePhotoUrl, vehicleType,
  vehicleNumber, cityId, status, availability, kycStatus, reliabilityScore,
  lastKnownLocation, createdAt, suspendedReason?, deletedAt? }

DeliveryAssignment { assignmentId, orderId, partnerId, status, pharmacy{pharmacyId, pickupPin(hashed),
  location, displayInfo?}, customer{firstName, deliveryAddress, landmark?, instructions?, location},
  codAmount?, expiresAt, arrivedAtPharmacyAt?, pickedUpAt?, arrivedAtCustomerAt?, deliveredAt?,
  cancellation{reasonCode?, cancelledBy?, cancelledAt?}, createdAt }

Order { orderId, status (read-scoped mirror of the assignment's relevant fields — the partner's
  view of `orders` never exceeds what Section 2 permits), items[] (counts/categories only, not
  detailed prescription contents), amount (coarse — COD amount only where applicable) }

DeliveryLocation { assignmentId, partnerId, current{lat, lng, timestamp, accuracy, speed?, isMocked},
  locationStale, updatedAt }

Earnings { partnerId, today, thisWeek, thisMonth, pendingSettlement, deliveryEarnings[]{assignmentId,
  amount, incentive, date}, updatedAt }

KYC { partnerId, documents[]{documentType, status, rejectionReason?, submittedAt, reviewedAt?,
  reviewedBy? (admin-side reference, not partner-visible)}, overallStatus }

Vehicle { vehicleType, vehicleNumber, rcNumber, insurancePolicyNumber, insuranceExpiry }

Notification { notificationId, partnerId, category, title, body, deepLink?, read, createdAt }

SupportTicket { ticketId, partnerId, category, relatedAssignmentId?, status, messages[]{sender,
  body, timestamp}, createdAt, resolvedAt? }

DeliveryHistory { entryId, partnerId, assignmentId, orderId, status (completed|cancelled|failed),
  earnings, completedAt, pickupAreaCoarse, deliveryAreaCoarse }
```

## 49. API / Service Contracts

Conceptual contracts (backend-authoritative; client is a thin caller):

```
getCurrentDelivery(): DeliveryAssignment | null
getAssignments(): pending assignment offer, if any (single-item — partners are offered one at a time)
acceptAssignment(assignmentId, idempotencyKey): DeliveryAssignment
rejectAssignment(assignmentId, reasonCode?): void
updateDeliveryStatus(assignmentId, targetStatus, locationSnapshot?, idempotencyKey): DeliveryAssignment
updateLocation(locationBatch[], idempotencyKey): { accepted: number, rejected: number }
verifyPickup(assignmentId, pickupPin, idempotencyKey): DeliveryAssignment
verifyDeliveryOTP(assignmentId, otp, idempotencyKey): DeliveryAssignment
completeDelivery(assignmentId): DeliveryAssignment  // internal, triggered not directly client-invoked
reportDeliveryIssue(assignmentId, reasonCode, note?, photoUrl?): SupportTicket | AuditEntry
getEarnings(period?): Earnings
getDeliveryHistory(cursor?, pageSize?): DeliveryHistory[]
updateAvailability(targetStatus, idempotencyKey): { availability, reason? (if rejected, e.g. KYC incomplete) }
uploadDocument(documentType, file): KYCDocumentEntry
contactSupport(category, message, relatedAssignmentId?): SupportTicket
```

Every contract above is backend-authoritative: the client calls, the backend validates and decides, the client renders the result — no contract implies the client computes or asserts an authoritative outcome itself.

---

## 50. Acceptance Criteria

Representative examples (full traceable set mirrors every state in Section 4 and every rule in Sections 2–3):

- **AC-01 (Assignment offer):** Given an ONLINE, non-BUSY, KYC-approved partner within the matching radius of a new order, when the backend creates an assignment, then the partner receives a push notification within a defined SLA (e.g., <5s under normal conditions) and the assignment appears in the New Delivery Alert UI with Accept/Reject actions.
- **AC-02 (OTP gate):** Given an assignment in `arrived_delivery` status, when the partner attempts any UI path to mark the order complete without a successful `verifyDeliveryOTP` call, then no such path exists in the UI, and any direct function call without a valid OTP is rejected server-side.
- **AC-03 (Privacy):** Given a newly assigned order, when the partner views the assignment details before accepting, then the customer's real phone number is not present anywhere in the payload delivered to the client — verified by inspecting the actual Cloud Function/Firestore document schema, not just the rendered UI.
- **AC-04 (Offline resilience):** Given a partner taps "Confirm Pickup" while offline, when connectivity is restored, then exactly one `verifyPickup` call reaches the backend (idempotency-key-deduped) and the UI reflects the server-confirmed state, not a state that silently diverges from what the server actually recorded.
- **AC-05 (Suspension mid-delivery):** Given a partner with an active assignment is suspended by an Admin, when the suspension is applied, then the partner's app reflects the suspension within one real-time listener cycle and the partner cannot perform any further status-changing action on that assignment.
- **AC-06 (Document expiry eligibility):** Given a partner's Driving License has passed its `expiryDate` with no active delivery in progress, when the partner attempts to toggle ONLINE, then `updateAvailability` rejects the request with a clear reason tied to the specific expired document.

## 51. Future Roadmap

Explicitly out-of-scope for v1, so the build agent doesn't speculatively implement these — architecture should not preclude them:

- Multi-city operations (data model already carries `cityId` throughout to support this).
- Multiple vehicle types beyond the initial set, including EV-specific fields (e.g., charging-stop awareness).
- Scheduled deliveries (currently on-demand only).
- Multiple delivery modes (e.g., batched multi-order runs — current model is single-active-assignment-at-a-time by design, per Section 7's BUSY semantics).
- Delivery batching / route optimization (would require materially different assignment and navigation UX — not attempted in v1).
- Incentive engine expansion beyond the basic incentive/bonus fields already in the Earnings model.
- Surge incentives (dynamic, demand-based bonus multipliers).
- Partner wallet (in-app balance/instant-payout feature — v1 relies on the Admin Dashboard's Settlement Reports for payout processing, not an in-app wallet).
- Partner referral program (mirrors the Customer App's referral concept, not built for partners in v1).
- Partner ratings shown in richer detail (v1 shows the partner's own aggregate rating only, per Section 27).
- AI-assisted route optimization / predictive ETA (v1 uses standard Google Maps ETA, not a custom prediction model).
- Advanced ML-based fraud detection (v1 ships the rule-based signal set in Section 33.1 only, architecture-ready for a future scoring layer per the Admin Dashboard's Section 102 "Fraud Detection Ready Architecture").
- Full EV delivery support (charging infrastructure awareness, range-based assignment matching).
- Fleet management (multi-vehicle-per-partner, fleet-owner accounts).
- Enterprise pharmacy delivery / corporate accounts (B2B delivery flows distinct from the current consumer-order model).
- iOS release (architecture is iOS-ready per Section 1/42's platform-isolation approach, but v1 ships Android-only).

---

## 52. CTO Review — Additional Requirements Identified

Reviewing the above as a CTO of a healthcare-adjacent delivery platform surfaces several requirements not explicitly stated in the original brief, which have been folded into the relevant sections above (cross-referenced here for visibility):

- **Regulatory/compliance:** Medicine delivery may be subject to jurisdiction-specific rules on who can receive certain medicine categories (e.g., age verification for some OTC categories, prescription-bound items) — **[ASSUMPTION-28]**: this app treats such category-specific handoff rules as configurable business logic surfaced via the assignment's `instructions`/`customer` payload rather than hardcoded, since the exact regulatory requirement varies by jurisdiction and is genuinely outside a delivery-logistics app's job to independently interpret; the Pharmacy/Customer App specs are the more appropriate owners of prescription-validity logic. This app's job is limited to relaying whatever operational instruction it's given (e.g., "verify recipient is 18+") without embedding medical/legal judgment itself.
- **Data retention & right-to-erasure alignment:** Section 34's retention window and Section 18's document-access logging directly address this, mirroring the Admin Dashboard's PR-06.
- **Fraud prevention:** Section 33.1's signal set (mock location, implausible movement, OTP-retry abuse, multi-device login, root/jailbreak) was the single largest gap versus the original brief's action-item list and has been built into Sections 8, 9, 28, 32, and 33 throughout rather than bolted on as an afterthought.
- **Disaster recovery / observability:** Section 45's crash/ANR/location-failure/notification-failure/API-failure monitoring requirements were elevated to a first-class section rather than left implicit, since a delivery-logistics app failing silently in the field has direct livelihood and customer-trust consequences.
- **Abuse prevention:** Rate limiting (Section 33), idempotency (Sections 28, 32), and the "flag not block" philosophy for imperfect signals (mock-location, root-detection) collectively prevent both attacker abuse and false-positive harm to legitimate partners — a deliberate balance, not an oversight.
- **Cost optimization:** Battery/data-conscious location strategy (Sections 9, 35) doubles as a cost-optimization measure (reduced Firestore write volume, reduced FCM/data usage) alongside its user-experience rationale — both goals are served by the same design.
- **Scalability & reliability:** The offline-queue + idempotency + server-authoritative pattern (Section 28) is what allows this app to scale across genuinely unreliable network conditions across many cities without the backend ever receiving ambiguous or duplicated state.
- **Account sharing / OTP abuse / notification abuse:** Addressed via Section 47's edge-case table (multi-device login) and Section 33's rate-limiting/audit-logging posture.

---

*End of RapidMedi Delivery Partner App Engineering Specification v1.0.*
