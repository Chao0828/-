let state = 0; // 0:待機, 1:記憶, 2:入力, 3:結果
let currentShape = 0;
let currentPlayerName = "";
let targets = [];
let userStrokes = [];
let highScores = [];
let confetti = [];
let timerId = null;
let memorizeStartTime = 0;
const MEMORIZE_DURATION = 2200;

const titleScreen = document.getElementById('title-screen');
const gameScreen = document.getElementById('game-screen');
const playerNameInput = document.getElementById('player-name-input');
const nameError = document.getElementById('name-error');
const enterGameBtn = document.getElementById('enter-game-btn');

const displayPlayerName = document.getElementById('display-player-name');
const changeNameBtn = document.getElementById('change-name-btn');
const startBtn = document.getElementById('start-btn');
const clearBtn = document.getElementById('clear-btn');
const checkBtn = document.getElementById('check-btn');
const retryBtn = document.getElementById('retry-btn');
const resetRankingBtn = document.getElementById('reset-ranking-btn');
const resultText = document.getElementById('result-text');
const bestScoreText = document.getElementById('best-score');
const modeSelect = document.getElementById('mode-select');
const titleBadge = document.getElementById('title-badge');

// タイトル画面の入室処理
enterGameBtn.addEventListener('click', enterGame);
playerNameInput.addEventListener('keypress', function(e) {
  if (e.key === 'Enter') enterGame();
});

function enterGame() {
  const rawName = playerNameInput.value.trim();
  if (rawName === "") {
    nameError.classList.add('visible');
    playerNameInput.classList.remove('shake');
    void playerNameInput.offsetWidth;
    playerNameInput.classList.add('shake');
    playerNameInput.focus();
    return;
  }

  nameError.classList.remove('visible');
  currentPlayerName = rawName;
  displayPlayerName.textContent = currentPlayerName;

  titleScreen.classList.add('hidden');
  gameScreen.classList.remove('hidden');
}

changeNameBtn.addEventListener('click', function() {
  if (timerId) clearTimeout(timerId);
  retryGame();
  gameScreen.classList.add('hidden');
  titleScreen.classList.remove('hidden');
  playerNameInput.focus();
});

function setup() {
  let canvas = createCanvas(400, 400);
  canvas.parent("p5-wrapper");
  strokeCap(ROUND);
  strokeJoin(ROUND);

  startBtn.addEventListener('click', startGame);
  clearBtn.addEventListener('click', clearStrokes);
  checkBtn.addEventListener('click', checkResult);
  retryBtn.addEventListener('click', retryGame);
  resetRankingBtn.addEventListener('click', resetRanking);

  highScores = JSON.parse(localStorage.getItem('sketchMemoryScores')) || [];
  updateRankingDisplay();
  updateButtonStates();
}

function draw() {
  // 温かみのある上質紙のような背景色
  background(249, 247, 242);

  // 「かんたん」モードのときだけ背景にうっすら方眼ガイドを描画
  if (modeSelect.value === "easy") {
    drawGridGuide();
  }

  // 記憶時間の残りゲージ
  if (state === 1) {
    let elapsed = millis() - memorizeStartTime;
    let ratio = constrain(1 - (elapsed / MEMORIZE_DURATION), 0, 1);
    noStroke();
    fill(31, 111, 102, 45);
    rect(0, 0, width, 5);
    fill(31, 111, 102);
    rect(0, 0, width * ratio, 5);
  }

  // お手本の描画（記憶フェーズと結果画面のみ表示。入力中は全モードで完全に消える）
  if (state === 1) {
    noFill();
    stroke(31, 111, 102);
    strokeWeight(5);
    drawTargetShape();
  } else if (state === 3) {
    noFill();
    stroke(31, 111, 102, 120);
    strokeWeight(5);
    drawTargetShape();
  }

  // ユーザーの描いた線
  if (state === 2 || state === 3) {
    let isHardMode = (modeSelect.value === "hard");
    strokeWeight(6);

    for (let i = 0; i < userStrokes.length; i++) {
      let points = userStrokes[i];
      for (let j = 0; j < points.length; j++) {
        let pt = points[j];

        if (state === 2 && isHardMode) {
          pt.alpha = max(0, pt.alpha - 4.5);
        }

        let displayAlpha = (state === 3) ? 255 : pt.alpha;
        if (displayAlpha > 0) {
          stroke(217, 78, 63, displayAlpha);
          if (j === 0) {
            point(pt.x, pt.y);
          } else {
            let prev = points[j - 1];
            line(prev.x, prev.y, pt.x, pt.y);
          }
        }
      }
    }
  }

  // 高得点時の紙吹雪
  if (state === 3 && confetti.length > 0) {
    noStroke();
    for (let i = 0; i < confetti.length; i++) {
      let c = confetti[i];
      push();
      translate(c.x, c.y);
      rotate(c.angle);
      fill(c.color);
      rectMode(CENTER);
      rect(0, 0, c.w, c.h);
      pop();

      c.x += c.vx;
      c.y += c.vy;
      c.vy += 0.15;
      c.angle += c.vAngle;
    }
  }
}

// かんたんモード用の方眼ノート風ガイド線
function drawGridGuide() {
  for (let x = 40; x < width; x += 40) {
    if (x === 200) {
      stroke(160, 152, 140, 110); // 中央線は少し濃く
    } else {
      stroke(160, 152, 140, 55);
    }
    strokeWeight(1);
    line(x, 0, x, height);
  }
  for (let y = 40; y < height; y += 40) {
    if (y === 200) {
      stroke(160, 152, 140, 110);
    } else {
      stroke(160, 152, 140, 55);
    }
    strokeWeight(1);
    line(0, y, width, y);
  }
}

function drawTargetShape() {
  if (targets.length > 0) {
    beginShape();
    for (let i = 0; i < targets.length; i++) {
      vertex(targets[i].x, targets[i].y);
    }
    endShape(CLOSE);
  }
}

function mousePressed() {
  if (state === 2 && mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height) {
    userStrokes.push([]);
  }
}

function mouseDragged() {
  if (state === 2 && mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height) {
    if (userStrokes.length > 0) {
      userStrokes[userStrokes.length - 1].push({ x: mouseX, y: mouseY, alpha: 255 });
    }
  }
}

function startGame() {
  if (timerId) clearTimeout(timerId);
  state = 1;
  userStrokes = [];
  targets = [];
  confetti = [];
  titleBadge.classList.add('hidden');
  updateButtonStates();

  resultText.textContent = "形と位置を覚えてください";
  resultText.style.color = "#1f6f66";

  currentShape = floor(random(8));
  generateShapeTargets(currentShape);
  memorizeStartTime = millis();

  timerId = setTimeout(function() {
    if (state === 1) {
      state = 2;
      updateButtonStates();
      if (modeSelect.value === "easy") {
        resultText.style.color = "#26282a";
        resultText.textContent = "方眼のマス目を頼りに輪郭をなぞろう";
      } else if (modeSelect.value === "hard") {
        resultText.style.color = "#d94e3f";
        resultText.textContent = "描いた線が消えます！感覚でなぞろう";
      } else {
        resultText.style.color = "#26282a";
        resultText.textContent = "記憶を頼りに輪郭をなぞろう";
      }
    }
  }, MEMORIZE_DURATION);
}

function clearStrokes() {
  if (state === 2) {
    userStrokes = [];
    resultText.textContent = "線を消しました。もう一度なぞってください";
  }
}

// 8種類の図形データ生成
function generateShapeTargets(shape) {
  if (shape === 0) { // 円
    for (let a = 0; a < TWO_PI; a += 0.1) {
      targets.push({ x: 200 + cos(a) * 115, y: 200 + sin(a) * 115 });
    }
  } else if (shape === 1) { // 正方形
    targets.push({ x: 95, y: 95 }, { x: 305, y: 95 }, { x: 305, y: 305 }, { x: 95, y: 305 });
  } else if (shape === 2) { // 正三角形
    targets.push({ x: 200, y: 75 }, { x: 320, y: 295 }, { x: 80, y: 295 });
  } else if (shape === 3) { // ひし形
    targets.push({ x: 200, y: 70 }, { x: 310, y: 200 }, { x: 200, y: 330 }, { x: 90, y: 200 });
  } else if (shape === 4) { // 六角形
    for (let i = 0; i < 6; i++) {
      let a = i * TWO_PI / 6 - HALF_PI;
      targets.push({ x: 200 + cos(a) * 120, y: 200 + sin(a) * 120 });
    }
  } else if (shape === 5) { // 星
    let outer = 130, inner = 55;
    for (let i = 0; i < 10; i++) {
      let a = i * TWO_PI / 10 - HALF_PI;
      let r = (i % 2 === 0) ? outer : inner;
      targets.push({ x: 200 + cos(a) * r, y: 205 + sin(a) * r });
    }
  } else if (shape === 6) { // ハート
    for (let a = 0; a < TWO_PI; a += 0.08) {
      let x = 200 + 8 * (16 * pow(sin(a), 3));
      let y = 180 - 8 * (13 * cos(a) - 5 * cos(2 * a) - 2 * cos(3 * a) - cos(4 * a));
      targets.push({ x: x, y: y });
    }
  } else if (shape === 7) { // 稲妻
    targets.push(
      { x: 220, y: 65 },
      { x: 115, y: 215 },
      { x: 195, y: 215 },
      { x: 175, y: 335 },
      { x: 285, y: 185 },
      { x: 205, y: 185 }
    );
  }

  interpolatePoints();
}

function interpolatePoints() {
  let temp = [];
  for (let i = 0; i < targets.length; i++) {
    let p1 = targets[i];
    let p2 = targets[(i + 1) % targets.length];
    let d = dist(p1.x, p1.y, p2.x, p2.y);
    let steps = max(1, floor(d / 5));
    for (let t = 0; t < 1; t += 1 / steps) {
      temp.push({ x: lerp(p1.x, p2.x, t), y: lerp(p1.y, p2.y, t) });
    }
  }
  targets = temp;
}

function checkResult() {
  if (state !== 2) return;

  let allUserPoints = [];
  for (let i = 0; i < userStrokes.length; i++) {
    allUserPoints = allUserPoints.concat(userStrokes[i]);
  }
  if (allUserPoints.length === 0) {
    resultText.style.color = "#d94e3f";
    resultText.textContent = "線を描いてから判定ボタンを押してください";
    return;
  }

  state = 3;
  updateButtonStates();

  // 線からのズレ（正確さ）
  let precisionSum = 0;
  for (let i = 0; i < allUserPoints.length; i++) {
    let minDist = 9999;
    for (let j = 0; j < targets.length; j++) {
      let d = dist(allUserPoints[i].x, allUserPoints[i].y, targets[j].x, targets[j].y);
      if (d < minDist) minDist = d;
    }
    precisionSum += max(0, 42 - minDist) / 42;
  }
  let precisionRate = precisionSum / allUserPoints.length;

  // 輪郭全体をどれだけなぞれたか（カバー率）
  let coveredCount = 0;
  for (let j = 0; j < targets.length; j++) {
    let minDist = 9999;
    for (let i = 0; i < allUserPoints.length; i++) {
      let d = dist(targets[j].x, targets[j].y, allUserPoints[i].x, allUserPoints[i].y);
      if (d < minDist) minDist = d;
    }
    if (minDist < 28) {
      coveredCount++;
    }
  }
  let coverageRate = coveredCount / targets.length;

  let rawScore = (precisionRate * 0.55 + coverageRate * 0.45) * 100;
  let finalScore = constrain(round(rawScore), 0, 100);

  if (finalScore >= 85) {
    createConfetti();
  }

  let mode = modeSelect.value;
  let titleText = getUniqueTitle(finalScore, mode);

  resultText.style.color = "#d94e3f";
  resultText.textContent = `${currentPlayerName}さんの一致度：${finalScore}%`;

  titleBadge.textContent = `称号：${titleText}`;
  titleBadge.classList.remove('hidden');

  let modeLabel = "ふつう";
  if (mode === "easy") modeLabel = "かんたん";
  if (mode === "hard") modeLabel = "むずかしい";

  highScores.push({
    name: currentPlayerName,
    score: finalScore,
    title: titleText,
    modeLabel: modeLabel
  });
  highScores.sort((a, b) => b.score - a.score);
  highScores = highScores.slice(0, 5);
  localStorage.setItem('sketchMemoryScores', JSON.stringify(highScores));

  updateRankingDisplay();
}

function createConfetti() {
  confetti = [];
  const colors = ['#1f6f66', '#d94e3f', '#e5a93c', '#3d5a80', '#7b6d8d'];
  for (let i = 0; i < 65; i++) {
    confetti.push({
      x: 200,
      y: 190,
      vx: random(-7, 7),
      vy: random(-10, -2),
      w: random(6, 12),
      h: random(4, 8),
      angle: random(TWO_PI),
      vAngle: random(-0.2, 0.2),
      color: random(colors)
    });
  }
}

function getUniqueTitle(score, mode) {
  if (mode === "hard" && score >= 85) {
    return "暗闇の魔術師";
  }
  if (score >= 95) return "人間コピー機";
  if (score >= 85) return "記憶の匠";
  if (score >= 70) return "いい線いってる画伯";
  if (score >= 50) return "うろ覚えスケッチャー";
  if (score >= 30) return "前衛的な抽象画家";
  return "自由すぎるピカソ";
}

function updateRankingDisplay() {
  const rankingList = document.getElementById('ranking-list');
  rankingList.innerHTML = '';

  if (highScores.length > 0) {
    bestScoreText.textContent = highScores[0].score;
  } else {
    bestScoreText.textContent = "--";
  }

  for (let i = 0; i < highScores.length; i++) {
    const li = document.createElement('li');

    const leftSpan = document.createElement('span');
    leftSpan.textContent = `${i + 1}位 [${highScores[i].modeLabel}] ${highScores[i].name}（${highScores[i].title}）`;

    const rightSpan = document.createElement('span');
    rightSpan.className = 'rank-score';
    rightSpan.textContent = `${highScores[i].score}%`;

    li.appendChild(leftSpan);
    li.appendChild(rightSpan);
    rankingList.appendChild(li);
  }
}

function resetRanking() {
  if (confirm("ランキングの履歴をすべて削除しますか？")) {
    highScores = [];
    localStorage.removeItem('sketchMemoryScores');
    updateRankingDisplay();
  }
}

function retryGame() {
  if (timerId) clearTimeout(timerId);
  state = 0;
  targets = [];
  userStrokes = [];
  confetti = [];
  titleBadge.classList.add('hidden');
  resultText.textContent = "「スタート」を押すと図形が表示されます";
  resultText.style.color = "#26282a";
  updateButtonStates();
}

function updateButtonStates() {
  if (state === 0 || state === 3) {
    startBtn.disabled = false;
    clearBtn.disabled = true;
    checkBtn.disabled = true;
    modeSelect.disabled = false;
    changeNameBtn.disabled = false;
  } else if (state === 1) {
    startBtn.disabled = true;
    clearBtn.disabled = true;
    checkBtn.disabled = true;
    modeSelect.disabled = true;
    changeNameBtn.disabled = true;
  } else if (state === 2) {
    startBtn.disabled = true;
    clearBtn.disabled = false;
    checkBtn.disabled = false;
    modeSelect.disabled = true;
    changeNameBtn.disabled = true;
  }
}