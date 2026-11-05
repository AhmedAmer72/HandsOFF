# Local economy

Gold and Cinder are in-game counts. They are not a cryptocurrency and they never leave the browser.

Price formula, in `src/game/engine/pricing.ts`:

`clamp(base * 0.55, base * 2.4, round(base * targetStock / max(stock, 1)))`

Stock above target lowers the price. Stock below target raises it. The reason string states the stock and the target.

Mira starts with 90 Gold and stock of nails, hammers, axes, and swords. Tallow starts with 80 Gold and phials, torches, lanterns, and staves. Orrin starts with 70 Gold and an empty rumour book. A purchase that the buyer cannot afford, or that the merchant does not stock, returns the save unchanged.

Player listings move a stack out of inventory. Cancel puts it back. Buy-back spends the player's Gold. Listing when the stack is empty does nothing.

Each new day removes 6 Gold for upkeep and moves merchant stock one step toward the target, capped by max stock, and charges the merchant 4 Gold if they have it.

The workshop spends 4 nails to add one spike kit. The next spike trap then costs 0 Gold and consumes the kit.
