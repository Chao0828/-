let state = 0; // 0:待機, 1:記憶(お手本表示), 2:入力(なぞる), 3:結果表示
let currentShape = 0; 
let targets = []; // お手本の輪郭座標
let userStrokes = []; // ユーザーがなぞった線の塊（配列の配列）

const startBtn = document.getElementById('start-btn');
const checkBtn = document.getElementById('check-btn');
const retryBtn = document.getElementById('retry-btn');
const resultText = document.getElementById('result-text');

function setup() {
  let canvas = createCanvas(400, 400);
  canvas.parent("p5-wrapper"); 
  startBtn.addEventListener('click', startGame);
  checkBtn.addEventListener('click', checkResult);
  retryBtn.addEventListener('click', retryGame);
}

function draw() {
  background(250); 

  if (state === 1 || state === 3) {
    // 改善点1：塗りつぶしなし
    noFill(); 
    if (state === 3) {
      stroke(100, 180, 220, 100); 
    } else {
      stroke(100, 180, 220);
    }
    strokeWeight(6); 

    // 計算した座標を使って、図形を枠線だけで綺麗に描画
    if (targets.length > 0) {
      beginShape();
      for (let i = 0; i < targets.length; i++) {
        vertex(targets[i].x, targets[i].y);
      }
      endShape(CLOSE);
    }
  }

  if (state === 2 || state === 3) {
    noFill();
    stroke(255, 100, 120); 
    strokeWeight(8);
    // 改善点2：複数描かれた線をすべて画面に表示する
    for (let i = 0; i < userStrokes.length; i++) {
      beginShape();
      for (let j = 0; j < userStrokes[i].length; j++) {
        vertex(userStrokes[i][j].x, userStrokes[i][j].y);
      }
      endShape();
    }
  }
}

// 改善点2：マウスが押された瞬間に「新しい線の塊」を用意する
function mousePressed() {
  if (state === 2 && mouseX > 0 && mouseX < width && mouseY > 0 && mouseY < height) {
    userStrokes.push([]); // 配列の中にさらに配列を追加
  }
}

// ドラッグ中は、最新の線の塊に座標を追加し続ける
function mouseDragged() {
  if (state === 2 && mouseX > 0 && mouseX < width && mouseY > 0 && mouseY < height) {
    if (userStrokes.length > 0) {
      userStrokes[userStrokes.length - 1].push({ x: mouseX, y: mouseY });
    }
  }
}

function startGame() {
  state = 1;
  userStrokes = [];
  targets = [];
  resultText.textContent = "図形の形を記憶して！";
  resultText.style.color = "#2c3e50";

  // 改善点4：出題する図形を5種類に増やす (0~4)
  currentShape = floor(random(5));
  generateShapeTargets(currentShape);

  // 2秒後に入力フェーズへ
  setTimeout(function() {
    if (state === 1) {
      state = 2;
      resultText.textContent = "記憶を頼りに輪郭をなぞって！";
    }
  }, 2000);
}

// 形の座標データを作り出す関数
function generateShapeTargets(shape) {
  if (shape === 0) { // 【円】
    for (let angle = 0; angle < TWO_PI; angle += 0.1) {
      targets.push({ x: 200 + cos(angle) * 110, y: 200 + sin(angle) * 110 });
    }
  } else if (shape === 1) { // 【四角】
    targets.push({ x: 100, y: 100 });
    targets.push({ x: 300, y: 100 });
    targets.push({ x: 300, y: 300 });
    targets.push({ x: 100, y: 300 });
    interpolatePoints(); // カクカクの図形は間の点を補間（後述の関数）
    
  } else if (shape === 2) { // 【猫（修正版）】
    // 改善点3：画像に合わせたシルエットに変更
    targets.push({ x: 120, y: 80 });  // 左耳の先
    targets.push({ x: 160, y: 130 }); // 頭の左
    targets.push({ x: 240, y: 130 }); // 頭の右
    targets.push({ x: 280, y: 80 });  // 右耳の先
    targets.push({ x: 310, y: 180 }); // 右のほっぺ上
    // 右ほっぺ～顎～左ほっぺは曲線の計算で繋ぐ
    for (let angle = 0; angle <= PI; angle += 0.1) {
      targets.push({ x: 200 + cos(angle) * 115, y: 180 + sin(angle) * 120 });
    }
    targets.push({ x: 90, y: 180 });  // 左のほっぺ上
    interpolatePoints();
    
  } else if (shape === 3) { // 【星】
    let outer = 130;
    let inner = 55;
    for (let i = 0; i < 10; i++) {
      let angle = i * TWO_PI / 10 - HALF_PI;
      let r = (i % 2 === 0) ? outer : inner;
      targets.push({ x: 200 + cos(angle) * r, y: 200 + sin(angle) * r });
    }
    interpolatePoints();
    
  } else if (shape === 4) { // 【ハート】
    for (let angle = 0; angle < TWO_PI; angle += 0.05) {
      let x = 200 + 8 * (16 * pow(sin(angle), 3));
      let y = 170 - 8 * (13 * cos(angle) - 5 * cos(2*angle) - 2 * cos(3*angle) - cos(4*angle));
      targets.push({ x: x, y: y });
    }
  }
}

// 判定精度を上げるため、頂点と頂点の間に細かく見えない点を打つ関数
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
  if (state !== 2 || userStrokes.length === 0) return;
  state = 3;

  // バラバラに描かれた複数の線を、判定のために一旦1つのリストにまとめる
  let allUserPoints = [];
  for (let i = 0; i < userStrokes.length; i++) {
    allUserPoints = allUserPoints.concat(userStrokes[i]);
  }
  if (allUserPoints.length === 0) return;

  let totalScore = 0;
  for (let i = 0; i < allUserPoints.length; i++) {
    let minDist = 9999;
    for (let j = 0; j < targets.length; j++) {
      let d = dist(allUserPoints[i].x, allUserPoints[i].y, targets[j].x, targets[j].y);
      if (d < minDist) {
        minDist = d;
      }
    }
    let score = max(0, 40 - minDist); 
    totalScore += score;
  }

  let maxPossibleScore = allUserPoints.length * 40;
  let finalScore = floor((totalScore / maxPossibleScore) * 100);

  if (allUserPoints.length < 50) {
    finalScore = floor(finalScore / 2);
  }

  resultText.style.color = "#e74c3c";
  if (finalScore >= 80) {
    resultText.textContent = "天才！一致度：" + finalScore + "％！";
  } else {
    resultText.textContent = "一致度：" + finalScore + "％！もうちょい！";
  }
}

function retryGame() {
  state = 0;
  targets = [];
  userStrokes = [];
  resultText.textContent = "「スタート」を押して図形を記憶！";
  resultText.style.color = "#2c3e50";
}