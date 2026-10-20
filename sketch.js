let chute;
let hayley;
let hands;
let popSound;
let hayleys = [];   // every Hayley currently on screen

// How far above Hayley the chute sits, as a fraction of Hayley's height — kept
// proportional so the gap scales with sprite size instead of staying fixed
// (a fixed pixel gap looked "disconnected" once mobile sprites got smaller).
const CHUTE_OFFSET_RATIO = 0.477;
let CHUTE_OFFSET; // computed in setup() once Hayley's size is known
const GRAVITY = 0.15;      // how fast falling Hayleys accelerate (desktop)
const GRAVITY_MOBILE = 0.26; // faster fall on mobile — smaller sprites need more challenge
const CATCH_RADIUS = 70;    // how close the hands need to be to catch her
const POP_DELAY_MIN = 450; // ms before a chute can pop, minimum
const POP_DELAY_MAX = 3000; // ms before a chute can pop, maximum
const SPAWN_INTERVAL = 650; // ms between new Hayleys appearing
const MAX_MISSED = 10; // game stops once this many Hayleys have fallen
const LEVEL_EVERY = 20; // game speeds up every 20 catches (see hud.js)
const MAX_DRIFT = 2; // how far sideways a falling Hayley can drift per frame at max chaos

let score = 0;
let missed = 0;
let lastSpawnTime = 0;
let gameOver = false;
let isMobile = false; // true on touch devices (phones/tablets); detected once in setup()

function preload() {
  chute  = loadImage("assets/Parachute.png");
  hayley = loadImage("assets/Hayley.png");
  hands  = loadImage("assets/Hands.png");
  scoreFont = loadFont("assets/GeistMono-Bold.ttf");
  popSound  = loadSound("assets/bubble-pop.mp3");
}

function setup() {
  // Detect touch devices once, so taps get a slightly bigger catch radius than a precise mouse cursor
  isMobile = (window.matchMedia && matchMedia('(pointer: coarse)').matches) || 'ontouchstart' in window;

  createCanvas(windowWidth, windowHeight);
  // Match the device's actual pixel density so sprites render crisp, not blurry,
  // on high-resolution (retina) phone screens.
  pixelDensity(displayDensity());
  imageMode(CENTER);
  // Sprites were sized for a desktop window; phones are much narrower. Shrink them
  // for mobile, but not so far that they lose detail or look disconnected.
  chute.resize(0, isMobile ? 65 : 100);
  hayley.resize(0, isMobile ? 150 : 220);
  hands.resize(0, isMobile ? 95 : 150);
  CHUTE_OFFSET = hayley.height * CHUTE_OFFSET_RATIO;
  noCursor(); // the cupped hands replace the system cursor

  // Stop the page from scrolling/zooming while the player drags a finger
  const c = document.querySelector('canvas');
  if (c) c.style.touchAction = 'none';

  // start with a few floating Hayleys
  for (let i = 0; i < 5; i++) spawnHayley();
  lastSpawnTime = millis();
}

function touchStarted() {
  // p5 does not auto-simulate mousePressed once touchStarted exists, so retry
  // needs to be triggered from here directly for taps to work on phones.
  attemptRetry();
  // Block the default touch behaviour so the page does not scroll or refresh
  return false;
}

function touchMoved() {
  // Block the default touch behaviour so dragging does not scroll the page
  return false;
}

function draw() {
  background(CREAM);

  if (gameOver) {
    drawRetryScreen();
    image(hands, mouseX, mouseY, hands.width, hands.height);
    return;
  }

  checkLevelUp();

  // New Hayleys appear more often as the game speeds up
  if (millis() - lastSpawnTime > SPAWN_INTERVAL / chaos()) {
    spawnHayley();
    lastSpawnTime = millis();
  }

  for (let i = hayleys.length - 1; i >= 0; i--) {
    const h = hayleys[i];
    updateHayley(h);
    drawHayley(h);

    if (h.state === 'falling') {
      // Fingers are less precise than a mouse cursor, so give touch a bigger catch radius —
      // but not as generous as before now that mobile Hayleys are smaller and faster
      const catchRadius = isMobile ? CATCH_RADIUS * 1.15 : CATCH_RADIUS;
      if (dist(mouseX, mouseY, h.x, h.y) < catchRadius) {
        score++;
        hayleys.splice(i, 1);
        continue;
      }
      if (h.y - CHUTE_OFFSET > height) {
        missed++;
        hayleys.splice(i, 1);
        if (missed >= MAX_MISSED) gameOver = true;
        continue;
      }
    }
  }

  drawHeadline("Catch Hayley before\nher parachute pops!");
  drawScoreboard(`Caught: ${score}   Missed: ${missed}`);
  drawLevelBanner();

  // cupped hands follow the cursor
  image(hands, mouseX, mouseY, hands.width, hands.height);
}

// Creates one Hayley (chute included), floating, with a random pop time.
function spawnHayley() {
  // Keep the chute's top edge below the headline text — no overlap.
  const minY = hudLayout().headBottom + CHUTE_OFFSET + chute.height / 2;
  const maxY = Math.max(minY + 40, height * 0.4);

  hayleys.push({
    x: random(width * 0.1, width * 0.9),
    y: random(minY, maxY),
    vy: 0,
    vx: 0, // sideways drift, only added once the game speeds up
    state: 'floating', // 'floating' -> 'falling'
    // Chutes pop sooner as the game speeds up
    popAt: millis() + random(POP_DELAY_MIN, POP_DELAY_MAX) / chaos()
  });
}

// Advances a single Hayley's state (popping her chute, applying gravity).
function updateHayley(h) {
  if (h.state === 'floating' && millis() > h.popAt) {
    h.state = 'falling';
    // Once the game speeds up, Hayleys also drift sideways as they fall, so catching gets chaotic
    const drift = MAX_DRIFT * (chaos() - 1) / (MAX_CHAOS - 1);
    h.vx = random(-drift, drift);
    popSound.play();
  }
  if (h.state === 'falling') {
    // Gravity gets stronger as the game speeds up
    h.vy += (isMobile ? GRAVITY_MOBILE : GRAVITY) * chaos();
    h.y += h.vy;
    h.x = constrain(h.x + h.vx, 0, width);
  }
}

// Draws one Hayley (and her chute, if it hasn't popped yet).
function drawHayley(h) {
  if (h.state === 'floating') {
    image(chute, h.x, h.y - CHUTE_OFFSET, chute.width, chute.height);
  }
  image(hayley, h.x, h.y, hayley.width, hayley.height);
}

// The headline, scoreboard, retry screen, and speed-ups live in hud.js, shared by every game

function mousePressed() {
  attemptRetry();
}

// Resets the game back to its starting state. Called from both a mouse click
// and a touch tap, since the two are not automatically interchangeable once
// touchStarted() is defined (see note there).
function attemptRetry() {
  if (!gameOver) return;

  score = 0;
  missed = 0;
  hayleys = [];
  gameOver = false;
  resetLevels();
  for (let i = 0; i < 5; i++) spawnHayley();
  lastSpawnTime = millis();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
