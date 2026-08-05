// Golden Bouffant — Crude narrative lines
const DEATH_LINES = [
  "Not again… I can still taste the raccoon.",
  "Died with a half-eaten candy bar in my hand. Peak performance.",
  "The last thing I saw was a boot. Then the other boot.",
  "Wig's gone. Dignity's gone. House dress is somehow still intact. Of course it is.",
  "I swung. I missed. I died. Classic Kraig.",
  "Someone tell my ex I went out fighting. Don't tell her I was wearing this.",
  "That pirate called me 'Dress Boy' right before he ended me. Rude.",
  "I had a good run. For about forty seconds.",
  "Next time I'm starting with the loud fart food. Strategic.",
  "If I wake up one more time on this beach I'm going to start charging rent.",
  "Killed by a trash panda. Again. My mother would be so proud.",
  "The house dress survives everything. I do not.",
  "Note to self: stop dying near the spicy ones.",
  "I blacked out thinking about wigs. At least I'm consistent.",
  "This city keeps spitting me back out. Rude."
];

const WIG_QUIPS = {
  yellow: [
    "Instant dignity. Temporary, but I'll take it.",
    "Smells like the inside of a divorce lawyer's trunk.",
    "Finally something between my shiny dome and the judgment of every raccoon in a three-block radius.",
    "I look like a man who peaked in a thrift store dressing room.",
    "This wig has seen things. Judging by the smell, so has the previous owner's crotch."
  ],
  red: [
    "I look like I just robbed a clown at knifepoint. Perfect.",
    "I look like I just lost a fight with a clown and fucked the winner.",
    "Red means stop. Nothing about me has ever stopped.",
    "This one says 'I will fight you.' Reality says 'I will fart and run.'",
    "I feel dangerous. The kind of dangerous that still uses a nightlight."
  ],
  blue: [
    "Cool breeze up top. Still sweating everywhere else.",
    "Cool air on my scalp, hot shame everywhere else.",
    "I look like a weatherman who got banned from the station for public indecency.",
    "This wig makes me feel faster. My gut still moves at the speed of regret.",
    "If I die in this, at least the coroner will say I looked aerodynamic."
  ],
  green: [
    "Now the raccoons might think I'm one of them. Risky.",
    "I blend in with the moss, the trash, and the broken dreams.",
    "Raccoons might try to mate with me. I'm not ruling it out.",
    "Camouflage for a man who refused to take the house dress off even during the apocalypse.",
    "If a tree falls on me while I'm wearing this, the tree is still the winner."
  ],
  purple: [
    "Royalty. Trash royalty, but still.",
    "I look like the ghost of a failed drag queen who died mid-split.",
    "Royalty. The kind that gets kicked out of the castle for shitting in the fountain.",
    "This wig demands respect. It will receive a boot to the face instead.",
    "Purple is the color of bruised egos, bad decisions, and that one night I don't talk about."
  ],
  silver: [
    "Metallic. Cold. Like every woman who's ever touched me.",
    "I look like a satellite dish that developed a drinking problem.",
    "This one has the emotional range of a butter knife and twice the edge.",
    "Silver fox? More like silver roadkill with confidence issues."
  ],
  black: [
    "I look like a funeral director who lost a bet. I respect it.",
    "I look like a funeral director who lost a bet and then lost the funeral.",
    "This wig absorbs light, hope, and any remaining chance of getting laid.",
    "Dark enough to hide the shame. Not dark enough to hide the house dress.",
    "If I stare into this wig long enough I can see my father shaking his head."
  ],
  orange: [
    "I look like a traffic cone that gained sentience just long enough to regret it.",
    "Orange means caution. The only caution here is 'do not reproduce.'",
    "This one is louder than my stomach and twice as empty.",
    "If they find my body in this, they'll assume I was trying to warn people about myself."
  ],
  pink: [
    "I look like a birthday cake that escaped the party and developed a substance problem.",
    "Soft. Sweet. Deeply wrong on a grown man's head.",
    "This wig makes pirates laugh so hard they almost forget to stab me. Almost.",
    "Pink is the color of innocence. I am the opposite of that sentence."
  ],
  rainbow: [
    "Every color of the rainbow and none of the dignity. A perfect metaphor for my life.",
    "I look like a piñata that fought back and still lost.",
    "This is what happens when God gives up halfway through making a person.",
    "If the Golden Bouffant is salvation, this is the fever dream you have in the ambulance."
  ],
  golden: [
    "…Holy shit. This is the one. Don't you fucking fade on me.",
    "I can feel my life expectancy rising. And my blood pressure. And something else.",
    "For the first time in days I don't look like a cautionary tale. I look like the main character of a cautionary tale.",
    "If this wig dies on my head I am going to haunt whoever sold it.",
    "I would kill for this wig. I have killed for less. Mostly raccoons.",
    "Put this on and suddenly the house dress looks intentional. Almost fashionable. Almost.",
    "This is the closest I've come to getting hard in three years and it's because of a hairpiece. I'm not okay."
  ]
};

const RACCOON_TAUNTS = [
  "It's the bald one again.",
  "He's still wearing the dress.",
  "Do not make eye contact.",
  "Back for more? Glutton for punishment.",
  "Same dress. New wig. Same smell.",
  "I almost feel bad. Almost.",
  "You again. At this point I'm rooting for you. A little.",
  "If you die one more time I'm keeping the house dress as a trophy."
];

const PIRATE_TAUNTS = [
  "Look boys… the walking laundry pile is back.",
  "Dress Boy! Didn't I kill you yesterday?",
  "You're like a bad rash. Keeps coming back.",
  "I respect the commitment. I still hate the dress.",
  "That wig's new. Still won't save you.",
  "Kraig. Yeah, we know your name now. Still gonna gut you though.",
  "You're the only reason this job is still entertaining."
];

const CARCASS_LINES = [
  "Please don't still be warm… goddamn it.",
  "There's a half-eaten sandwich in here. Jackpot.",
  "This one had better taste than me. I'm weirdly jealous.",
  "Note to self: stop dying near the spicy ones."
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getDeathLine() {
  return pick(DEATH_LINES);
}

function getWigQuip(wigId) {
  const list = WIG_QUIPS[wigId] || WIG_QUIPS.yellow;
  return pick(list);
}

function getRaccoonTaunt() {
  return pick(RACCOON_TAUNTS);
}

function getPirateTaunt() {
  return pick(PIRATE_TAUNTS);
}

function getCarcassLine() {
  return pick(CARCASS_LINES);
}
