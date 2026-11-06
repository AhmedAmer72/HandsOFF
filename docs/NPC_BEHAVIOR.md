# NPC behavior

Decisions are utility scores, not generated text. The sentence is built from the same reward and danger numbers the score uses.

Kara: risk aversion 1.55, threshold 8, buys rumours and a phial, flees below 45% health, walks around known damaging traps.

Brann: risk aversion 0.72, threshold 4, buys an axe or sword, flees only below 15% health, treats known traps as a small detour.

Ivo: risk aversion 1.25, threshold 6, buys a staff or phial and rumours.

`chooseRaider` offers the raid to Kara, then Brann, then Ivo, and keeps the first acceptance.

A fact changes the future only if it is on that hero and `burned` is false. Burn sets `burned` and does not copy the fact to Orrin. Escape appends it to Orrin's rumour list. A purchase copies it onto the buyer and moves Gold.

The skeleton does not path. It fights when the hero's path enters tile 2,1. That is why a detour around the center spike also avoids the fight.
