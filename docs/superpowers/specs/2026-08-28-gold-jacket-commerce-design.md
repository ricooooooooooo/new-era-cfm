# Gold Jacket Commerce + Legacy Cleanup Design

## Goal
Turn the Gold Jacket Dev Shop into a real account-aware storefront with automatic purchase-cap enforcement, while removing prediction-market UI and keeping the 48-hour advance timer dormant until the first real Madden week advance.

## 1. Dev Shop Storefront

### Products
- Star Dev — $2
  - Max 1 per player per season.
- Superstar Dev — $5
  - Max 1 per player per season.
- X-Factor Dev — $8
  - Max 1 per player per season.
- +2 Non-Physical Attribute — $1
  - Max 6 purchases per player per season.
  - Player OVR cap: 96.
- +1 Physical Upgrade — $3
  - Max 3 purchases per player per franchise.
  - Target physical attribute cap: 93.

### BOGO
- An order containing at least one paid Dev purchase (Star, Superstar, or X-Factor) may include exactly one free +1 Physical Upgrade.
- The free physical does not stack with additional Dev purchases in the same order.
- The free physical still consumes one of the player/franchise physical-upgrade slots and still obeys the 93 attribute cap.

### Store UX
- Product cards should feel like a real retail storefront, not a Discord embed.
- Each product supports quantity selection.
- Add-to-cart is separate from checkout.
- The cart shows products, quantities, unit prices, line totals, discount/free BOGO line, and order total.
- Products or player/application combinations that hit a cap show a sold-out/limit-reached state instead of allowing another purchase.
- Example copy:
  - "SOLD OUT FOR THIS PLAYER"
  - "AVAILABLE NEXT SEASON"
  - "6 / 6 USED • SEASON LIMIT REACHED"
  - "3 / 3 USED • FRANCHISE LIMIT REACHED"

### Checkout
- Checkout requires the logged-in Discord account.
- Each purchased item is assigned to a player and, when required, one or more attributes.
- Purchase is final at the instant the user presses Purchase.
- Purchase immediately consumes all relevant caps.
- Purchase survives refreshes, logouts, and devices.
- Checkout creates a formatted order summary users can copy to clipboard.
- Checkout exposes:
  - Copy Order
  - Pay with Cash App
  - DM Commissioner
- Cash App link must be exactly: https://cash.app/$ricorips

### Copy/Paste Order Format
Example:

GOLD JACKET DEV SHOP ORDER
Discord: @username
Team: Cardinals
Season: 1

1x Superstar Dev — $5
Player: Marvin Harrison Jr.

2x +2 Non-Physical — $2
Player: Marvin Harrison Jr.
Attributes: Catching, Route Running

1x FREE +1 Physical — $0
Player: Marvin Harrison Jr.
Attribute: Speed

TOTAL: $7
ORDER ID: GJ-...

Paid via Cash App: https://cash.app/$ricorips

### Purchase Tracking
Every order is tied to:
- logged-in Discord user ID
- Discord username/display name
- team
- league ID
- season
- order ID
- created timestamp

Every line item stores:
- product type
- paid/free
- quantity
- unit price
- player identity
- target attributes, when applicable
- season
- whether voided

### Cap Enforcement
The server computes eligibility from prior non-voided purchases, never from browser state.

Dev caps:
- Star: 1/player/season
- Superstar: 1/player/season
- X-Factor: 1/player/season

Non-physical:
- 6/player/season

Physical:
- 3/player/franchise
- paid and free physical upgrades both count

### Automatic Purchase Behavior
When Purchase is pressed:
1. Server reloads current user, team, league, season, and prior purchases.
2. Server validates every cart line against caps.
3. Server validates the one-free-physical maximum.
4. Server records the order atomically enough that duplicate client clicks cannot create duplicate valid purchases.
5. UI immediately re-fetches availability.
6. Sold-out states update immediately.

### Commissioner Controls
Commissioner can void an order.
Voiding:
- preserves purchase history
- marks the order/lines voided
- returns consumed caps to availability
- does not silently delete historical data

Users cannot void their own completed purchases.

## 2. Prediction Market Removal

Gold Jacket does not use prediction markets.

Remove from public-facing UI:
- prediction-market navigation
- betting buttons
- market quick actions
- wallet/coin prompts used only for prediction markets

Do not initially delete legacy API/database code if other old routes still import it. Hide/remove the user-facing paths first to avoid unrelated breakage. Legacy backend deletion can happen after dependency inspection.

## 3. Advance Timer

The countdown must not run during pre-launch setup.

States:
- No Gold Jacket league connected: hidden.
- Gold Jacket league exists but no week advance has been observed: hidden.
- First observed synced Madden week change: create a 48:00:00 countdown.
- Each later synced season/week change: reset to 48:00:00.
- At zero: show ADVANCE DUE until the next advance.

A newly created league at Week 1 does not by itself start the timer.

## Data Storage

Prefer the existing `league_syncs` table for lightweight append-only Gold Jacket event records because the project already uses it for persisted structured payloads.

Event types:
- `dev_shop_order`
- `dev_shop_order_void`
- `advance_timer`

No new external payment integration is required. Cash App remains an outbound payment link.

## Security / Integrity

- Never trust Discord ID, team, season, prices, totals, eligibility, or caps sent by the browser.
- Server derives account identity from the existing authenticated Discord session.
- Server owns product prices and limits.
- Order IDs are generated server-side.
- Duplicate checkout submissions must be idempotent or rejected.
- Commissioner-only void endpoint must use existing project authorization helpers.

## Visual Direction

Black, warm ivory, metallic gold.
Retail/store feel: clean product grid, large pricing, clear quantity controls, sticky cart, polished checkout.
No New Era purple.
No NE Coin language.
No prediction-market styling.

## Success Criteria

- A logged-in owner can add products, configure player targets, checkout, copy the order, open Cash App, and DM the commissioner.
- Purchase caps update immediately after Purchase.
- Caps are preserved across sessions/devices.
- Commissioner void restores eligibility.
- One and only one free physical can be attached to an eligible order.
- The timer is hidden until the first real week advance.
- League / Dev Shop / Media public pages contain no visible New Era branding after their respective rebrand pass.
