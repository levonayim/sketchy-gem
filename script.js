import { ImageSegmenter, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest";

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
let imageSegmenter = null;

// 1. Initialize MediaPipe Vision Segmenter
async function initializeSegmenter() {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
  );
  
  imageSegmenter = await ImageSegmenter.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: "https://storage.googleapis.com/mediapipe-models/image_segmenter/deeplab_v3/float32/1/deeplab_v3.tflite",
      delegate: "GPU"
    },
    runningMode: "IMAGE",
    outputCategoryMask: true
  });
}

// Start loading the AI model immediately
initializeSegmenter();

// 2. Handle Image Upload
upload.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const img = new Image();
  img.onload = () => {
    currentImage = img;
    origCanvas.width = outCanvas.width = img.width;
    origCanvas.height = outCanvas.height = img.height;
    
    // Process image through AI pipeline
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

function processPipeline() {
  if (!currentImage) return;

  const width = origCanvas.width;
  const height = origCanvas.height;

  // Draw the original image straight to canvas
  origCtx.filter = 'none';
  origCtx.drawImage(currentImage, 0, 0, width, height);

  // Generate sketch directly
  generateKidSketch();
}

// 4. Generate Crayon/Marker Drawing Effect
function generateKidSketch() {
  const width = origCanvas.width;
  const height = origCanvas.height;
  const blurVal = blurInput.value;
  const threshold = parseInt(thresholdInput.value, 10);
  const thickness = parseInt(thicknessInput.value, 10);

  // Apply CSS Blur to mask detail lines
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext('2d');

  tempCtx.filter = `blur(${blurVal}px)`;
  tempCtx.drawImage(origCanvas, 0, 0, width, height);

  const srcData = tempCtx.getImageData(0, 0, width, height);
  const pixels = srcData.data;

  // Clear output canvas with paper background
  outCtx.fillStyle = 'white';
  outCtx.fillRect(0, 0, width, height);
  outCtx.fillStyle = '#1a1a1a'; // Charcoal dark line color

  // Convert image data to Grayscale array
  const gray = new Uint8ClampedArray(width * height);
  for (let i = 0; i < pixels.length; i += 4) {
    gray[i / 4] = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
  }

  // Sobel Edge Detection Loop
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
        // Add random jitter coordinates to give hand-drawn feel
        const jitterX = (Math.random() - 0.5) * 1.5;
        const jitterY = (Math.random() - 0.5) * 1.5;
        
        outCtx.beginPath();
        outCtx.arc(x + jitterX, y + jitterY, thickness, 0, Math.PI * 2);
        outCtx.fill();
      }
    }
  }
}