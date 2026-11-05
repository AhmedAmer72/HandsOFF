import { HERO_PROFILES } from "../config/heroProfiles";
import { RULES, cellKey } from "../config/gameRules";
import { ECONOMY } from "../config/economyRules";
import { TRAP_DEFINITIONS } from "../config/trapDefinitions";
import { findPath, type PlacedTrap } from "./path";
import type { Fact, HeroState, RaidEvent, RaidReport } from "./types";

export interface RaidInput {
  day: number;
  seed: number;
  hero: HeroState;
  traps: PlacedTrap[];
  tutorial: boolean;
}

export function simulateRaid(input: RaidInput): { report: Omit<RaidReport, "decision">; hero: HeroState } {
  const profile = HERO_PROFILES[input.hero.id];
  const hero: HeroState = {
    ...input.hero,
    hp: input.tutorial && input.day === 1 ? RULES.tutorialHeroHp : input.hero.maxHp,
    maxHp: input.tutorial && input.day === 1 ? RULES.tutorialHeroHp : input.hero.maxHp,
    facts: input.hero.facts.filter((fact) => !fact.burned),
    inventory: { ...input.hero.inventory },
    memory: [...input.hero.memory],
    history: [...input.hero.history],
  };
  const facts = hero.facts;
  const path = findPath(input.traps, facts, profile);
  const events: RaidEvent[] = [];
  const triggered: string[] = [];
  const learned: Fact[] = [];
  let tick = 0;
  let survived = true;
  let goldEarned = 0;
  let goldLost = 0;
  let foughtSkeleton = false;

  const push = (event: Omit<RaidEvent, "tick" | "heroHp">) => {
    events.push({ ...event, tick: tick++, heroHp: hero.hp });
  };

  push({ type: "enter", text: `${profile.name} enters Ashgate at the south corridor.`, ix: path[0]?.ix, iz: path[0]?.iz });

  for (const cell of path) {
    push({ type: "move", text: `${profile.name} steps to ${cell.ix}, ${cell.iz}.`, ix: cell.ix, iz: cell.iz });
    const trap = input.traps.find((entry) => entry.ix === cell.ix && entry.iz === cell.iz);
    if (trap && !triggered.includes(trap.id)) {
      const rule = TRAP_DEFINITIONS[trap.trapId];
      const damage = rule.damage;
      if (damage > 0) {
        hero.hp = Math.max(0, hero.hp - damage);
        triggered.push(trap.id);
        const fact = factFor(trap, input.day);
        learned.push(fact);
        push({
          type: "trap",
          text: `${rule.name} hits ${profile.name} for ${damage}.`,
          ix: cell.ix,
          iz: cell.iz,
          trapId: trap.trapId,
          damage,
        });
      } else {
        triggered.push(trap.id);
        learned.push(factFor(trap, input.day));
        push({ type: "trap", text: `${profile.name} is drawn onto the bait plate.`, ix: cell.ix, iz: cell.iz, trapId: trap.trapId, damage: 0 });
      }
      if (hero.hp <= 0) {
        survived = false;
        push({ type: "death", text: `${profile.name} dies on the ${rule.name}.`, ix: cell.ix, iz: cell.iz });
        break;
      }
    }

    const skeleton = RULES.skeleton;
    if (!foughtSkeleton && cell.ix === skeleton.ix && cell.iz === skeleton.iz && hero.hp > 0 && survived) {
      foughtSkeleton = true;
      let enemyHp = Number(skeleton.hp);
      const armor = profile.armor + (hero.equipment.includes("axe") || hero.equipment.includes("sword") ? 0 : 0);
      const attack = profile.attack + (hero.equipment.includes("axe") ? 4 : hero.equipment.includes("staff") ? 3 : 0);
      while (hero.hp > 0 && enemyHp > 0) {
        if (hero.hp / hero.maxHp < profile.fleeAt) {
          push({ type: "flee", text: `${profile.name} breaks off. Health is too low for their nerve.`, ix: cell.ix, iz: cell.iz });
          survived = true;
          enemyHp = 0;
          break;
        }
        enemyHp -= attack;
        push({ type: "combat", text: `${profile.name} strikes the skeleton for ${attack}.`, ix: cell.ix, iz: cell.iz, damage: attack });
        if (enemyHp <= 0) {
          push({ type: "combat", text: `The skeleton falls.`, ix: cell.ix, iz: cell.iz, damage: 0 });
          break;
        }
        const taken = Math.max(1, skeleton.attack - armor);
        hero.hp = Math.max(0, hero.hp - taken);
        push({ type: "combat", text: `The skeleton hits ${profile.name} for ${taken}.`, ix: cell.ix, iz: cell.iz, damage: taken });
      }
      learned.push({
        id: `skeleton-${input.day}-${hero.id}`,
        kind: "skeleton",
        ix: skeleton.ix,
        iz: skeleton.iz,
        text: `A skeleton guards ${skeleton.ix}, ${skeleton.iz}.`,
        quality: 2,
        burned: false,
      });
      if (hero.hp <= 0) {
        survived = false;
        push({ type: "death", text: `${profile.name} dies in the fight.`, ix: cell.ix, iz: cell.iz });
        break;
      }
    }
  }

  if (survived && hero.hp > 0 && events.some((event) => event.ix === RULES.grid.vault.ix && event.iz === RULES.grid.vault.iz && event.type === "move")) {
    goldEarned = ECONOMY.heroPayOnSurvival;
    goldLost = ECONOMY.vaultSteal;
    hero.gold += goldEarned;
    push({ type: "vault", text: `${profile.name} reaches the vault and leaves with ${goldEarned} gold.` });
    push({ type: "survive", text: `${profile.name} survives the raid.` });
  } else if (survived) {
    push({ type: "survive", text: `${profile.name} withdraws while still standing.` });
  }

  if (!survived) {
    hero.memory = [`Died on day ${input.day} inside Ashgate.`, ...hero.memory].slice(0, 12);
  } else {
    hero.facts = mergeFacts(hero.facts, learned.map((fact) => ({ ...fact, burned: false })));
    hero.memory = [`Survived day ${input.day}.`, ...hero.memory].slice(0, 12);
  }

  const pageFacts = survived ? [] : learned.map((fact) => ({ ...fact, burned: false }));
  return {
    hero,
    report: {
      id: `raid-${input.day}-${input.seed}-${hero.id}`,
      day: input.day,
      seed: input.seed,
      heroId: hero.id,
      events,
      facts: pageFacts,
      survived,
      goldEarned,
      goldLost,
      trapsTriggered: triggered,
    },
  };
}

function factFor(trap: PlacedTrap, day: number): Fact {
  const rule = TRAP_DEFINITIONS[trap.trapId];
  return {
    id: `${trap.trapId}-${cellKey(trap.ix, trap.iz)}-d${day}`,
    kind: trap.trapId,
    ix: trap.ix,
    iz: trap.iz,
    text: `${rule.name} at tile ${trap.ix}, ${trap.iz}.`,
    quality: rule.damage > 0 ? 3 : 1,
    burned: false,
  };
}

function mergeFacts(current: Fact[], extra: Fact[]) {
  const map = new Map(current.map((fact) => [fact.id, fact]));
  for (const fact of extra) map.set(fact.id, fact);
  return [...map.values()];
}

export function sameRaid(a: RaidEvent[], b: RaidEvent[]) {
  return JSON.stringify(a) === JSON.stringify(b);
}
