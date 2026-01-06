const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

canvas.width = 640;
canvas.height = 480;

let mode = "front";

document.addEventListener("keydown", e => {
  if (e.key === "f") mode = "front";
  if (e.key === "s") mode = "side";
});

function calculateAngle(a, b, c) {
  const ba = { x: a.x - b.x, y: a.y - b.y };
  const bc = { x: c.x - b.x, y: c.y - b.y };
  const dot = ba.x * bc.x + ba.y * bc.y;
  const mag = Math.hypot(ba.x, ba.y) * Math.hypot(bc.x, bc.y);
  return Math.acos(Math.min(Math.max(dot / mag, -1), 1)) * 180 / Math.PI;
}

const pose = new Pose({
  locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
});

pose.setOptions({
  modelComplexity: 2,
  smoothLandmarks: true,
  minDetectionConfidence: 0.5
});

pose.onResults(results => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

  if (!results.poseLandmarks) return;
  const lm = results.poseLandmarks;

  const pt = i => ({
    x: lm[i].x * canvas.width,
    y: lm[i].y * canvas.height
  });

  ctx.fillStyle = "white";
  ctx.font = "18px Arial";

  if (mode === "front") {
    const lS = pt(11), rS = pt(12);
    const slope = Math.atan2(rS.y - lS.y, rS.x - lS.x) * 180 / Math.PI;
    const diff = Math.abs(slope);

    ctx.strokeStyle = diff > 3 ? "red" : "green";
    ctx.beginPath();
    ctx.moveTo(lS.x, lS.y);
    ctx.lineTo(rS.x, rS.y);
    ctx.stroke();

    ctx.fillText(`Shoulder Tilt: ${diff.toFixed(1)}`, 20, 30);
  }

  if (mode === "side") {
    const ear = pt(7);
    const shoulder = pt(11);
    const vertical = { x: shoulder.x, y: shoulder.y - 100 };

    const angle = calculateAngle(ear, shoulder, vertical);
    ctx.strokeStyle = angle > 30 ? "red" : "green";

    ctx.beginPath();
    ctx.moveTo(shoulder.x, shoulder.y);
    ctx.lineTo(ear.x, ear.y);
    ctx.stroke();

    ctx.fillText(`Neck Angle: ${angle.toFixed(0)}`, 20, 30);
  }
});

const camera = new Camera(video, {
  onFrame: async () => await pose.send({ image: video }),
  width: 640,
  height: 480
});
camera.start();
