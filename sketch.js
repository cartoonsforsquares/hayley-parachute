let chute;
let hayley;
let hands;
let popSound;
let hayleys = [];   // every Hayley currently on screen

const CHUTE_OFFSET = 105;   // how far above Hayley the chute sits — tune to taste
const GRAVITY = 0.15;      // how fast falling Hayleys accelerate
const CATCH_RADIUS = 70;    // how close the hands need to be to catch her
const POP_DELAY_MIN = 450; // ms before a chute can pop, minimum
const POP_DELAY_MAX = 3000; // ms before a chute can pop, maximum
const SPAWN_INTERVAL = 650; // ms between new Hayleys appearing
const HEADER_CLEARANCE = 90; // vertical space reserved for the headline text at the top
const MAX_MISSED = 10; // game stops once this many Hayleys have fallen

let score = 0;
let missed = 0;
let lastSpawnTime = 0;
let gameOver = false;
let isMobile = false; // true on touch devices (phones/tablets); detected once in setup()

function preload() {
  chute  = loadImage("assets/Parachute.png");
  hayley = loadImage("assets/Hayley.png");
  hands  = loadImage("assets/Hands.png");
  moreFont  = loadFont("assets/Chubbo-BoldItalic.ttf");
  scoreFont = loadFont("assets/GeistMono-Bold.ttf");
  popSound  = loadSound("assets/bubble-pop.mp3");
}

function setup() {
  // Detect touch devices once, so taps get a slightly bigger catch radius than a precise mouse cursor
  isMobile = (window.matchMedia && matchMedia('(pointer: coarse)').matches) || 'ontouchstart' in window;

  createCanvas(windowWidth, windowHeight);
  imageMode(CENTER);
  chute.resize(0, 100);
  hayley.resize(0, 220);
  hands.resize(0, 150);
  noCursor(); // the cupped hands replace the system cursor

  // Stop the page from scrolling/zooming while the player drags a finger
  const c = document.querySelector('canvas');
  if (c) c.style.touchAction = 'none';

  // start with a few floating Hayleys
  for (let i = 0; i < 5; i++) spawnHayley();
  lastSpawnTime = millis();
}

function touchStarted() {
  // Block the default touch behaviour so the page does not scroll or refresh
  return false;
}

function touchMoved() {
  // Block the default touch behaviour so dragging does not scroll the page
  return false;
}

function draw() {
  background('pink');

  if (gameOver) {
    drawRetryScreen();
    image(hands, mouseX, mouseY, hands.width, hands.height);
    return;
  }

  if (millis() - lastSpawnTime > SPAWN_INTERVAL) {
    spawnHayley();
    lastSpawnTime = millis();
  }

  for (let i = hayleys.length - 1; i >= 0; i--) {
    const h = hayleys[i];
    updateHayley(h);
    drawHayley(h);

    if (h.state === 'falling') {
      // Fingers are less precise than a mouse cursor, so give touch a bigger catch radius
      const catchRadius = isMobile ? CATCH_RADIUS * 1.4 : CATCH_RADIUS;
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

  drawHUD();

  // cupped hands follow the cursor
  image(hands, mouseX, mouseY, hands.width, hands.height);
}

// Creates one Hayley (chute included), floating, with a random pop time.
function spawnHayley() {
  // Keep the chute's top edge below the headline text — no overlap.
  const minY = HEADER_CLEARANCE + CHUTE_OFFSET + chute.height / 2;
  const maxY = Math.max(minY + 40, height * 0.4);

  hayleys.push({
    x: random(width * 0.1, width * 0.9),
    y: random(minY, maxY),
    vy: 0,
    state: 'floating', // 'floating' -> 'falling'
    popAt: millis() + random(POP_DELAY_MIN, POP_DELAY_MAX)
  });
}

// Advances a single Hayley's state (popping her chute, applying gravity).
function updateHayley(h) {
  if (h.state === 'floating' && millis() > h.popAt) {
    h.state = 'falling';
    popSound.play();
  }
  if (h.state === 'falling') {
    h.vy += GRAVITY;
    h.y += h.vy;
  }
}

// Draws one Hayley (and her chute, if it hasn't popped yet).
function drawHayley(h) {
  if (h.state === 'floating') {
    image(chute, h.x, h.y - CHUTE_OFFSET, chute.width, chute.height);
  }
  image(hayley, h.x, h.y, hayley.width, hayley.height);
}

function drawHUD() {
  // responsive text
  const ts = constrain(width * 0.045, 16, 35);

  push();
  textFont(moreFont);
  fill('black'); noStroke(); textSize(ts); textAlign(CENTER, TOP);
  text("Catch Hayley before her parachute pops!", width / 2, ts * 0.6);
  pop();

  push();
  textFont(scoreFont);
  fill('black'); noStroke(); textSize(ts - 5); textAlign(CENTER, BOTTOM);
  text(`CAUGHT: ${score}   MISSED: ${missed}`, width / 2, height - ts * 0.8);
  pop();
}
// Shown once missed reaches MAX_MISSED. Click anywhere to retry.
function drawRetryScreen() {
  const ts = constrain(width * 0.045, 16, 35);

  push();
  textFont(moreFont);
  fill('black'); noStroke(); textSize(ts * 2); textAlign(CENTER, CENTER);
  text("Retry ?", width / 2, height / 2);
  pop();
}

function mousePressed() {
  if (!gameOver) return;

  score = 0;
  missed = 0;
  hayleys = [];
  gameOver = false;
  for (let i = 0; i < 5; i++) spawnHayley();
  lastSpawnTime = millis();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
