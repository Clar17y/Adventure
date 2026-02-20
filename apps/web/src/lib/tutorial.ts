export const TUTORIAL_STEP_WELCOME = 0;
export const TUTORIAL_STEP_EXPLORE = 1;
export const TUTORIAL_STEP_COMBAT = 2;
export const TUTORIAL_STEP_GATHER = 3;
export const TUTORIAL_STEP_TRAVEL = 4;
export const TUTORIAL_STEP_CRAFT = 5;
export const TUTORIAL_STEP_EQUIP = 6;
export const TUTORIAL_STEP_DONE = 7;
export const TUTORIAL_COMPLETED = 8;
export const TUTORIAL_SKIPPED = -1;

export type BottomTab = 'home' | 'explore' | 'inventory' | 'combat' | 'profile';

export interface TutorialStepDef {
  banner: string;
  dialog: { title: string; body: string };
  pulseTab: BottomTab | null;
}

export const TUTORIAL_STEPS: Record<number, TutorialStepDef> = {
  [TUTORIAL_STEP_WELCOME]: {
    banner: 'Welcome! You have 86,400 turns to spend. Let\u2019s learn the basics.',
    dialog: {
      title: 'Welcome, Adventurer!',
      body: 'Everything in this world costs turns. You earn 1 turn per second, and you have a full day\u2019s worth to start. Turns are used to explore, fight, gather resources, and craft gear. Let\u2019s walk through the basics!',
    },
    pulseTab: null,
  },
  [TUTORIAL_STEP_EXPLORE]: {
    banner: 'Head to the Explore tab and invest some turns to discover the area.',
    dialog: {
      title: 'Exploration',
      body: 'Use the turn slider to choose how many turns to invest in exploring your zone. The more turns you spend, the higher your chances of discovering encounter sites, resource nodes, and hidden treasure.',
    },
    pulseTab: 'explore',
  },
  [TUTORIAL_STEP_COMBAT]: {
    banner: 'You found an encounter site! Go to the Combat tab to fight the mobs there.',
    dialog: {
      title: 'Combat',
      body: 'Encounter sites contain groups of mobs to fight. Select a site and engage in combat to earn XP for your combat skills and collect loot drops. Winning makes you stronger!',
    },
    pulseTab: 'combat',
  },
  [TUTORIAL_STEP_GATHER]: {
    banner: 'Try mining some resources. Open the Explore tab and select Gather.',
    dialog: {
      title: 'Gathering',
      body: 'Resource nodes let you mine ore and other materials. These materials are used for crafting equipment. Select a node and invest turns to gather resources.',
    },
    pulseTab: 'explore',
  },
  [TUTORIAL_STEP_TRAVEL]: {
    banner: 'Travel to a town to craft gear. Open the Map from the Home tab.',
    dialog: {
      title: 'Zone Travel',
      body: 'Crafting can only be done in towns. Open the World Map to see connected zones and travel to Millbrook, the nearest town. Travelling costs turns based on distance.',
    },
    pulseTab: 'home',
  },
  [TUTORIAL_STEP_CRAFT]: {
    banner: 'You\u2019re in town! Open Crafting to make something from your materials.',
    dialog: {
      title: 'Crafting',
      body: 'Use gathered materials to craft equipment. Select a recipe you have materials for and craft it. Higher crafting skill levels unlock better recipes and increase your chance of a critical craft.',
    },
    pulseTab: 'explore',
  },
  [TUTORIAL_STEP_EQUIP]: {
    banner: 'Nice! Now equip your new gear from the Inventory tab.',
    dialog: {
      title: 'Equipment',
      body: 'Go to your inventory and equip the gear you\u2019ve crafted or looted. Equipment boosts your stats for combat and improves your chances of survival in tougher zones.',
    },
    pulseTab: 'inventory',
  },
  [TUTORIAL_STEP_DONE]: {
    banner: 'Tutorial complete! You\u2019ve learned the core loop. Good luck out there!',
    dialog: {
      title: 'Tutorial Complete!',
      body: 'You now know the core gameplay loop: Explore \u2192 Fight \u2192 Gather \u2192 Travel \u2192 Craft \u2192 Equip. Keep progressing your skills, discover new zones, and take on tougher challenges!',
    },
    pulseTab: null,
  },
};

export function isTutorialActive(step: number): boolean {
  return step >= 0 && step < TUTORIAL_COMPLETED;
}
