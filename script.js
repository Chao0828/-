let state = 0; // 0:待機, 1:記憶, 2:入力, 3:結果
let currentShape = 0; 
let targets = []; 
let userStrokes = []; 
let highScores = []; 
let confetti = []; // 紙吹雪パーティクル用の配列
let timerId = null;

const startBtn = document.getElementById('start-btn');
const clearBtn = document.getElementById('clear-btn');
const checkBtn = document.getElementById('check-btn');
const retryBtn = document.getElementById('retry-btn');
const resetRankingBtn = document.getElementById('reset-ranking-btn');

const resultText = document.getElementById('result-text');
const bestScoreText = document.getElementById('best-score');
const playerNameInput = document.getElementById('player-name');
const modeSelect = document.getElementById('mode-select');
const titleBadge = document.getElementById('title-badge');

function setup() {
  let canvas = createCanvas(400, 400);
  canvas.parent("p5-wrapper"); 
  strokeCap(ROUND);

  startBtn.addEventListener('click', startGame);
  clearBtn.addEventListener('click', clearStrokes);
  checkBtn.addEventListener('click', checkResult);
  retryBtn.addEventListener('click', retryGame);
  resetRankingBtn.addEventListener('click', resetRanking);

  highScores = JSON.parse(localStorage.getItem('memoryGameScores_v3')) || [];
  updateRankingDisplay();
  updateButtonStates();
}

function draw() {
  background(250); 

  // 1. お手本の描画（記憶フェーズ or 結果フェーズ）
  if (state === 1 || state === 3) {
    noFill(); 
    stroke(100, 180, 220, state === 3 ? 100 : 255);
    strokeWeight(6); 
    if (targets.length > 0) {
      beginShape();
      for (let i = 0; i < targets.length; i++) {
        vertex(targets[i].x, targets[i].y);
      }
      endShape(CLOSE);
    }
  }

  // 2. ユーザーが描いた線の描画（入力フェーズ or 結果フェーズ）
  if (state === 2 || state === 3) {
    let isVanishMode = (modeSelect.value === "vanish");
    strokeWeight(8);

    for (let i = 0; i < userStrokes.length; i++) {
      let strokePoints = userStrokes[i];

      for (let j = 0; j < strokePoints.length; j++) {
        let pt = strokePoints[j];

        // 消えるモード中は少しずつ透明にする
        if (state === 2 && isVanishMode) {
          pt.alpha = max(0, pt.alpha - 4);
        }

        // 結果発表時はすべてハッキリ表示する
        let displayAlpha = (state === 3) ? 255 : pt.alpha;

        if (displayAlpha > 0) {
          stroke(255, 100, 120, displayAlpha);
          if (j === 0) {
            point(pt.x, pt.y);
          } else {
            let prevPt = strokePoints[j - 1];
            line(prevPt.x, prevPt.y, pt.x, pt.y);
          }
        }
      }
    }
  }

  // 3. 高得点時の紙吹雪アニメーション（結果フェーズ）
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

      // 位置と回転を更新
      c.x += c.vx;
      c.y += c.vy;
      c.vy += 0.15; // 重力で少しずつ下に落ちる
      c.angle += c.vAngle;
    }
  }
}

function mousePressed() {
  if (state === 2 && mouseX > 0 && mouseX < width && mouseY > 0 && mouseY < height) {
    userStrokes.push([]);
  }
}

function mouseDragged() {
  if (state === 2 && mouseX > 0 && mouseX < width && mouseY > 0 && mouseY < height) {
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

  resultText.textContent = "図形の形を記憶して！";
  resultText.style.color = "#2c3e50";

  currentShape = floor(random(5));
  generateShapeTargets(currentShape);

  timerId = setTimeout(function() {
    if (state === 1) {
      state = 2;
      updateButtonStates();
      if (modeSelect.value === "vanish") {
        resultText.textContent = "線が消えるぞ！感覚を信じてなぞって！";
      } else {
        resultText.textContent = "記憶を頼りに輪郭をなぞって！";
      }
    }
  }, 2000);
}

// なぞり書き中の線だけを消す（描き直し）
function clearStrokes() {
  if (state === 2) {
    userStrokes = [];
    resultText.textContent = "リセットしました！もう一度なぞってね。";
  }
}

function generateShapeTargets(shape) {
  if (shape === 0) { // 円
    for (let angle = 0; angle < TWO_PI; angle += 0.1) {
      targets.push({ x: 200 + cos(angle) * 110, y: 200 + sin(angle) * 110 });
    }
  } else if (shape === 1) { // 四角
    targets.push({ x: 100, y: 100 }); targets.push({ x: 300, y: 100 });
    targets.push({ x: 300, y: 300 }); targets.push({ x: 100, y: 300 });
    interpolatePoints(); 
  } else if (shape === 2) { // 猫
    targets.push({ x: 120, y: 80 });  targets.push({ x: 160, y: 130 }); 
    targets.push({ x: 240, y: 130 }); targets.push({ x: 280, y: 80 });  
    targets.push({ x: 310, y: 180 }); 
    for (let angle = 0; angle <= PI; angle += 0.1) {
      targets.push({ x: 200 + cos(angle) * 115, y: 180 + sin(angle) * 120 });
    }
    targets.push({ x: 90, y: 180 });  
    interpolatePoints();
  } else if (shape === 3) { // 星
    let outer = 130, inner = 55;
    for (let i = 0; i < 10; i++) {
      let angle = i * TWO_PI / 10 - HALF_PI;
      let r = (i % 2 === 0) ? outer : inner;
      targets.push({ x: 200 + cos(angle) * r, y: 200 + sin(angle) * r });
    }
    interpolatePoints();
  } else if (shape === 4) { // ハート
    for (let angle = 0; angle < TWO_PI; angle += 0.05) {
      let x = 200 + 8 * (16 * pow(sin(angle), 3));
      let y = 170 - 8 * (13 * cos(angle) - 5 * cos(2*angle) - 2 * cos(3*angle) - cos(4*angle));
      targets.push({ x: x, y: y });
    }
  }
}

function interpolatePoints() {
  let temp = [];
  for (let i = 0; i < targets.length; i++) {
    let p1 = targets[i]; let p2 = targets[(i + 1) % targets.length];
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
    resultText.textContent = "まずは線を描いてから判定してね！";
    return;
  }

  state = 3;
  updateButtonStates();

  let totalScore = 0;
  for (let i = 0; i < allUserPoints.length; i++) {
    let minDist = 9999;
    for (let j = 0; j < targets.length; j++) {
      let d = dist(allUserPoints[i].x, allUserPoints[i].y, targets[j].x, targets[j].y);
      if (d < minDist) minDist = d;
    }
    totalScore += max(0, 40 - minDist); 
  }

  let finalScore = floor((totalScore / (allUserPoints.length * 40)) * 100);
  if (allUserPoints.length < 50) finalScore = floor(finalScore / 2);

  // 85%以上の高得点なら紙吹雪を発生させる
  if (finalScore >= 85) {
    createConfetti();
  }

  let isVanish = (modeSelect.value === "vanish");
  let titleText = getUniqueTitle(finalScore, isVanish);

  // プレイヤー名を取得（未入力なら「ゲスト」）
  let rawName = playerNameInput.value.trim();
  let playerName = rawName === "" ? "ゲスト" : rawName;

  resultText.style.color = "#e74c3c";
  resultText.textContent = `${playerName}さんの一致度：${finalScore}％！`;
  
  titleBadge.textContent = `称号：【${titleText}】`;
  titleBadge.classList.remove('hidden');

  highScores.push({
    name: playerName,
    score: finalScore,
    title: titleText,
    mode: isVanish ? "👻" : "🖊️"
  }); 
  highScores.sort((a, b) => b.score - a.score); 
  highScores = highScores.slice(0, 5); 
  localStorage.setItem('memoryGameScores_v3', JSON.stringify(highScores));
  
  updateRankingDisplay();
}

// 紙吹雪のパーティクルを生成する関数
function createConfetti() {
  confetti = [];
  const colors = ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93'];
  for (let i = 0; i < 60; i++) {
    confetti.push({
      x: 200,
      y: 180,
      vx: random(-6, 6),
      vy: random(-9, -2),
      w: random(6, 12),
      h: random(4, 8),
      angle: random(TWO_PI),
      vAngle: random(-0.2, 0.2),
      color: random(colors)
    });
  }
}

function getUniqueTitle(score, isVanish) {
  if (isVanish && score >= 85) {
    return "暗闇の魔術師";
  } else if (score >= 95) {
    return "人間コピー機";
  } else if (score >= 85) {
    return "超記憶マスター";
  } else if (score >= 70) {
    return "なかなかの画伯";
  } else if (score >= 50) {
    return "うろ覚えアーティスト";
  } else if (score >= 30) {
    return "前衛的な抽象画家";
  } else {
    return "記憶喪失のピカソ";
  }
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
    
    // セキュリティ対策：innerHTMLではなくtextContentを使って安全に文字列を表示
    const leftSpan = document.createElement('span');
    leftSpan.textContent = `${i + 1}位 ${highScores[i].mode} ${highScores[i].name}（${highScores[i].title}）`;
    
    const rightSpan = document.createElement('span');
    rightSpan.textContent = `${highScores[i].score} ％`;
    
    li.appendChild(leftSpan);
    li.appendChild(rightSpan);
    rankingList.appendChild(li); 
  }
}

// ランキング履歴のリセット
function resetRanking() {
  if (confirm("ランキングの履歴をすべて削除しますか？")) {
    highScores = [];
    localStorage.removeItem('memoryGameScores_v3');
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
  resultText.textContent = "「スタート」を押して図形を記憶！";
  resultText.style.color = "#2c3e50";
  updateButtonStates();
}

// ゲームの状態に合わせてボタンの有効・無効を切り替える関数
function updateButtonStates() {
  if (state === 0) { // 待機中
    startBtn.disabled = false;
    clearBtn.disabled = true;
    checkBtn.disabled = true;
    playerNameInput.disabled = false;
    modeSelect.disabled = false;
  } else if (state === 1) { // 記憶フェーズ
    startBtn.disabled = true;
    clearBtn.disabled = true;
    checkBtn.disabled = true;
    playerNameInput.disabled = true;
    modeSelect.disabled = true;
  } else if (state === 2) { // 入力フェーズ
    startBtn.disabled = true;
    clearBtn.disabled = false;
    checkBtn.disabled = false;
    playerNameInput.disabled = true;
    modeSelect.disabled = true;
  } else if (state === 3) { // 結果発表
    startBtn.disabled = false;
    clearBtn.disabled = true;
    checkBtn.disabled = true;
    playerNameInput.disabled = false;
    modeSelect.disabled = false;
  }
}