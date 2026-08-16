const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const browseBtn = document.getElementById('browseBtn');
const workspace = document.getElementById('workspace');

const originalImg = document.getElementById('originalImg');
const compressedImg = document.getElementById('compressedImg');
const originalMeta = document.getElementById('originalMeta');
const compressedMeta = document.getElementById('compressedMeta');

const qualityRange = document.getElementById('qualityRange');
const qualityValue = document.getElementById('qualityValue');
const widthInput = document.getElementById('widthInput');
const heightInput = document.getElementById('heightInput');
const lockAspect = document.getElementById('lockAspect');
const formatSelect = document.getElementById('formatSelect');

const resetBtn = document.getElementById('resetBtn');
const downloadBtn = document.getElementById('downloadBtn');
const savingsText = document.getElementById('savingsText');

let originalFile = null;
let originalWidth = 0;
let originalHeight = 0;
let aspectRatio = 1;
let compressedBlob = null;
let debounceTimer = null;

// --- File intake ---

browseBtn.addEventListener('click', () => fileInput.click());
dropzone.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
  if (e.target.files.length) handleFile(e.target.files[0]);
});

['dragover', 'dragenter'].forEach(evt =>
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  })
);

['dragleave', 'drop'].forEach(evt =>
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
  })
);

dropzone.addEventListener('drop', (e) => {
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) handleFile(file);
});

function handleFile(file) {
  originalFile = file;
  const url = URL.createObjectURL(file);
  originalImg.src = url;

  const img = new Image();
  img.onload = () => {
    originalWidth = img.naturalWidth;
    originalHeight = img.naturalHeight;
    aspectRatio = originalWidth / originalHeight;

    widthInput.value = originalWidth;
    heightInput.value = originalHeight;

    originalMeta.textContent = `${originalWidth}×${originalHeight} — ${formatBytes(file.size)}`;
    workspace.classList.remove('hidden');
    dropzone.classList.add('hidden');

    processImage();
  };
  img.src = url;
}

// --- Controls ---

qualityRange.addEventListener('input', () => {
  qualityValue.textContent = qualityRange.value;
  scheduleProcess();
});

widthInput.addEventListener('input', () => {
  if (lockAspect.checked && widthInput.value) {
    heightInput.value = Math.round(widthInput.value / aspectRatio);
  }
  scheduleProcess();
});

heightInput.addEventListener('input', () => {
  if (lockAspect.checked && heightInput.value) {
    widthInput.value = Math.round(heightInput.value * aspectRatio);
  }
  scheduleProcess();
});

formatSelect.addEventListener('change', scheduleProcess);

resetBtn.addEventListener('click', () => {
  widthInput.value = originalWidth;
  heightInput.value = originalHeight;
  qualityRange.value = 80;
  qualityValue.textContent = 80;
  formatSelect.value = 'image/jpeg';
  processImage();
});

downloadBtn.addEventListener('click', () => {
  if (!compressedBlob) return;
  const ext = formatSelect.value.split('/')[1].replace('jpeg', 'jpg');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(compressedBlob);
  a.download = `pixelsqueeze-${Date.now()}.${ext}`;
  a.click();
});

function scheduleProcess() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(processImage, 150);
}

// --- Core processing ---

function processImage() {
  if (!originalFile) return;

  const targetW = parseInt(widthInput.value) || originalWidth;
  const targetH = parseInt(heightInput.value) || originalHeight;
  const quality = parseInt(qualityRange.value) / 100;
  const mime = formatSelect.value;

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');

  const img = new Image();
  img.onload = () => {
    ctx.drawImage(img, 0, 0, targetW, targetH);
    canvas.toBlob((blob) => {
      if (!blob) return;
      compressedBlob = blob;
      compressedImg.src = URL.createObjectURL(blob);
      compressedMeta.textContent = `${targetW}×${targetH} — ${formatBytes(blob.size)}`;

      const savedPct = Math.round((1 - blob.size / originalFile.size) * 100);
      if (savedPct > 0) {
        savingsText.textContent = `${savedPct}% smaller than the original`;
      } else if (savedPct < 0) {
        savingsText.textContent = `${Math.abs(savedPct)}% larger than the original`;
      } else {
        savingsText.textContent = `Same size as the original`;
      }
    }, mime, mime === 'image/png' ? undefined : quality);
  };
  img.src = originalImg.src;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
