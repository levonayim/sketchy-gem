// DOM Elements
const upload = document.getElementById('upload');
const thresholdInput = document.getElementById('threshold');
const blurInput = document.getElementById('blurAmount');
const thicknessInput = document.getElementById('thickness');

const origCanvas = document.getElementById('originalCanvas');
const outCanvas = document.getElementById('outlineCanvas');
const origCtx = origCanvas.getContext('2d', { willReadFrequently: true });
const outCtx = outCanvas.getContext('2d');

let currentImage = null;

// 1. Handle Image Upload
upload.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const img = new Image();
  img.onload = () => {
    currentImage = img;
    origCanvas.width = outCanvas.width = img.width;
    origCanvas.height = outCanvas.height = img.height;
    
    processPipeline();
  };
  img.src = URL.createObjectURL(file);
});

// Update sketch when sliders change
[thresholdInput, blurInput, thicknessInput].forEach(el => {
  el.addEventListener('input', () => {
    if (currentImage) generateKidSketch();
  });
});

// 2. Draw image to original canvas
function processPipeline() {
  if (!currentImage) return;

  const width = origCanvas.width;
  const height = origCanvas.height;

  origCtx.filter = 'none';
  origCtx.drawImage(currentImage, 0, 0, width, height);

  generateKidSketch();
}

function generateKidSketch() {
  const width = origCanvas.width;
  const height = origCanvas.height;
  const blurVal = blurInput.value;
  const threshold = parseInt(thresholdInput.value, 10);
  const thickness = parseInt(thicknessInput.value, 10);

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext('2d');

  tempCtx.filter = `blur(${blurVal}px)`;
  tempCtx.drawImage(origCanvas, 0, 0, width, height);

  const srcData = tempCtx.getImageData(0, 0, width, height);
  const pixels = srcData.data;

  outCtx.fillStyle = 'white';
  outCtx.fillRect(0, 0, width, height);
  outCtx.fillStyle = '#1a1a1a';

  // 1. Grayscale Conversion
  const gray = new Uint8ClampedArray(width * height);
  let minVal = 255;
  let maxVal = 0;

  for (let i = 0; i < pixels.length; i += 4) {
    const brightness = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
    gray[i / 4] = brightness;
    if (brightness < minVal) minVal = brightness;
    if (brightness > maxVal) maxVal = brightness;
  }

  // 2. Auto-Contrast Stretch (Stretches low-contrast boundaries to full black/white range)
  const range = maxVal - minVal || 1;
  for (let i = 0; i < gray.length; i++) {
    gray[i] = ((gray[i] - minVal) / range) * 255;
  }

  // 3. Sobel Edge Detection
  for (let y = 1; y < height - 1; y += 2) {
    for (let x = 1; x < width - 1; x += 2) {
      const i = y * width + x;

      const gx =
        -gray[i - width - 1] + gray[i - width + 1] +
        -2 * gray[i - 1]     + 2 * gray[i + 1] +
        -gray[i + width - 1] + gray[i + width + 1];

      const gy =
        -gray[i - width - 1] - 2 * gray[i - width] - gray[i - width + 1] +
         gray[i + width - 1] + 2 * gray[i + width] + gray[i + width + 1];

      const magnitude = Math.sqrt(gx * gx + gy * gy);

      if (magnitude > threshold) {
        const jitterX = (Math.random() - 0.5) * 1.5;
        const jitterY = (Math.random() - 0.5) * 1.5;
        
        outCtx.beginPath();
        outCtx.arc(x + jitterX, y + jitterY, thickness, 0, Math.PI * 2);
        outCtx.fill();
      }
    }
  }
}