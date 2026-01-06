const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

canvas.width = 960;
canvas.height = 720;

let mode = "front";
let freeze = false;
let frozenImage = null;

const COLOR_OK = "lime";
const COLOR_WARN = "yellow";
const COLOR_BAD = "red";

document.addEventListener("keydown", e => {
  if (e.key === "f") mode = "front";
  if (e.key === "s") mode = "side";
  if (e.key === " ") freeze = !freeze;
});

/* ========== calculate_angle ========== */
function calculateAngle(a, b, c) {
  const ba = { x: a.x - b.x, y: a.y - b.y };
  const bc = { x: c.x - b.x, y: c.y - b.y };
  const dot = ba.x * bc.x + ba.y * bc.y;
  const mag = Math.hypot(ba.x, ba.y) * Math.hypot(bc.x, bc.y);
  return Math.acos(Math.min(Math.max(dot / mag, -1), 1)) * 180 / Math.PI;
}

/* ========== draw_analysis ========== */
function drawAnalysis(points, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  ctx.lineTo(points[1].x, points[1].y);
  ctx.lineTo(points[2].x, points[2].y);
  ctx.stroke();

  ctx.fillStyle = "white";
  points.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
    ctx.fill();
  });
}

/* ========== analyze_front ========== */
function analyzeFront(lm) {
  let y = 30;
  ctx.font = "22px Arial";

  const pt = i => ({ x: lm[i].x * canvas.width, y: lm[i].y * canvas.height });

  // 1. Shoulders
  const lS = pt(11), rS = pt(12);
  const slope = Math.atan2(rS.y - lS.y, rS.x - lS.x) * 180 / Math.PI;
  const diff = Math.abs(slope);
  const shoulderBad = diff > 3;

  ctx.strokeStyle = shoulderBad ? COLOR_BAD : COLOR_OK;
  ctx.beginPath();
  ctx.moveTo(lS.x, lS.y);
  ctx.lineTo(rS.x, rS.y);
  ctx.stroke();

  ctx.fillStyle = shoulderBad ? COLOR_BAD : COLOR_OK;
  ctx.fillText(`Shoulder Tilt: ${diff.toFixed(1)}`, 20, y);
  y += 30;
  ctx.fillText(`Status: ${shoulderBad ? "Uneven Shoulders" : "OK"}`, 20, y);
  y += 50;

  // 2. Legs (X/O)
  const aL = calculateAngle(pt(23), pt(25), pt(27));
  const aR = calculateAngle(pt(24), pt(26), pt(28));
  const avg = (aL + aR) / 2;

  let status = "OK", color = COLOR_OK;
  if (avg < 170) { status = "X-Type Legs"; color = COLOR_BAD; }
  else if (avg > 185) { status = "O-Type Legs"; color = COLOR_WARN; }

  drawAnalysis([pt(23), pt(25), pt(27)], color);
  drawAnalysis([pt(24), pt(26), pt(28)], color);

  ctx.fillStyle = color;
  ctx.fillText(`Avg Leg Angle: ${avg.toFixed(1)}`, 20, y);
  y += 30;
  ctx.fillText(`Status: ${status}`, 20, y);
}

/* ========== analyze_side ========== */
function analyzeSide(lm) {
  const pt = i => ({ x: lm[i].x * canvas.width, y: lm[i].y * canvas.height });

  const ear = pt(7);
  const shoulder = pt(11);
  const vertical = { x: shoulder.x, y: shoulder.y - 150 };

  const neckAngle = calculateAngle(ear, shoulder, vertical);
  let color = COLOR_OK;
  let status = "OK";

  if (neckAngle > 30) { status = "Forward Head"; color = COLOR_BAD; }
  else if (neckAngle > 15) { status = "Slight Forward Head"; color = COLOR_WARN; }

  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(shoulder.x, shoulder.y);
  ctx.lineTo(ear.x, ear.y);
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.font = "22px Arial";
  ctx.fillText(`Neck Angle: ${neckAngle.toFixed(0)}`, 20, 40);
  ctx.fillText(`Status: ${status}`, 20, 70);
}

/* ========== MediaPipe ========== */
const pose = new Pose({
  locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${f}`
});

pose.setOptions({
  modelComplexity: 2,
  smoothLandmarks: true,
  minDetectionConfidence: 0.5
});

pose.onResults(res => {
  if (!res.poseLandmarks) return;

  if (!freeze) frozenImage = res.image;

  ctx.drawImage(frozenImage || res.image, 0, 0, canvas.width, canvas.height);
  if (mode === "front") analyzeFront(res.poseLandmarks);
  else analyzeSide(res.poseLandmarks);
});

new Camera(video, {
  onFrame: async () => await pose.send({ image: video }),
  width: 960,
  height: 720
}).start();
