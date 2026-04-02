// DOM Elements
const fileInput = document.getElementById('imageInput');
const fileNameSpan = document.getElementById('fileNameDisplay');
const statusDiv = document.getElementById('status');
const resultImg = document.getElementById('result');
const imgPlaceholder = document.getElementById('imgPlaceholder');
const generateBtn = document.getElementById('generateBtn');
const downloadBtn = document.getElementById('downloadBtn');
const statusIcon = document.getElementById('statusIcon');
const hintBadge = document.getElementById('hintBadge');
const resultFrame = document.getElementById('resultFrame');

let currentBlob = null;
let currentObjectUrl = null;

// Elegant toast system
function showToast(message, type = 'info') {
  const existing = document.querySelector('.elegant-toast');
  if(existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'elegant-toast';
  let icon = type === 'success' ? 'fa-circle-check' : (type === 'error' ? 'fa-triangle-exclamation' : 'fa-info-circle');
  let iconColor = type === 'success' ? '#b9f6ca' : (type === 'error' ? '#ffb47b' : '#c5b3ff');
  toast.innerHTML = `<i class="fas ${icon}" style="color: ${iconColor}; margin-right: 4px;"></i> ${message}`;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(10px)';
    setTimeout(() => toast.remove(), 350);
  }, 2700);
}

function setStatus(text, isProcessing = false, isError = false) {
  statusDiv.innerText = text;
  if(isProcessing) {
    statusIcon.className = 'fas fa-spinner fa-pulse';
    statusIcon.style.color = '#b794f4';
  } else if(isError) {
    statusIcon.className = 'fas fa-exclamation-circle';
    statusIcon.style.color = '#ff9966';
  } else if(text.toLowerCase().includes('ready') || text.toLowerCase().includes('success') || text.toLowerCase().includes('masterpiece')) {
    statusIcon.className = 'fas fa-check-circle';
    statusIcon.style.color = '#77dd77';
  } else {
    statusIcon.className = 'fas fa-crown';
    statusIcon.style.color = '#cbb9ff';
  }
}

function resetUIForNew() {
  if(currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = null;
  }
  currentBlob = null;
  resultImg.style.display = 'none';
  imgPlaceholder.style.display = 'flex';
  resultImg.src = '';
  downloadBtn.style.display = 'none';
  hintBadge.style.display = 'none';
  resultFrame.classList.remove('glow-pulse');
}

function setLoading(loading) {
  if(loading) {
    generateBtn.disabled = true;
    generateBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> <span>sculpting imagination...</span>';
    if(downloadBtn) downloadBtn.disabled = true;
  } else {
    generateBtn.disabled = false;
    generateBtn.innerHTML = '<i class="fas fa-gem"></i> <span>Generate Figure</span>';
    if(currentBlob && downloadBtn) downloadBtn.disabled = false;
    else if(downloadBtn && !currentBlob) downloadBtn.disabled = false;
  }
}

function enableDownload(blob) {
  currentBlob = blob;
  if(currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
  currentObjectUrl = URL.createObjectURL(blob);
  resultImg.src = currentObjectUrl;
  resultImg.style.display = 'block';
  imgPlaceholder.style.display = 'none';
  downloadBtn.style.display = 'flex';
  hintBadge.style.display = 'flex';
  downloadBtn.disabled = false;
  setStatus('✨ sculpture ready — download or tap image', false);
  showToast('Masterpiece generated successfully', 'success');
  resultFrame.classList.add('glow-pulse');
  setTimeout(() => resultFrame.classList.remove('glow-pulse'), 1800);
}

// ImgBB upload
async function uploadToImgBB(file) {
  const apiKey = "ddae78d603de09d965aebfccc243c5db";
  const formData = new FormData();
  formData.append("image", file);
  const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
    method: "POST",
    body: formData
  });
  const data = await response.json();
  if(!data.success) throw new Error(data.error?.message || "ImgBB upload error");
  return data.data.url;
}

// Polling for generated image
async function pollForImage(apiUrl, maxAttempts = 28, intervalMs = 2100) {
  for(let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(apiUrl, { cache: "no-store", headers: { "Cache-Control": "no-cache" } });
      const contentType = res.headers.get("content-type");
      if(contentType && contentType.includes("image")) {
        const blob = await res.blob();
        if(blob && blob.size > 800) return blob;
      }
      setStatus(`🎨 refining details · step ${attempt}/${maxAttempts}`, true);
    } catch(e) {
      console.warn(e);
      setStatus(`🌀 AI sculpting (retry ${attempt})`, true);
    }
    await new Promise(r => setTimeout(r, intervalMs));
  }
  throw new Error("Generation timeout — please try with a different reference");
}

// Main generative process
async function toFigure() {
  const file = fileInput.files[0];
  if(!file) {
    setStatus("❌ no reference image selected", false, true);
    showToast("Please select an image first", "error");
    return;
  }
  if(!file.type.startsWith('image/')) {
    setStatus("⚠️ unsupported file format", false, true);
    showToast("Only JPG, PNG, WEBP allowed", "error");
    return;
  }

  resetUIForNew();
  setLoading(true);
  setStatus("📡 uploading to neural studio...", true);
  
  try {
    const uploadedUrl = await uploadToImgBB(file);
    setStatus("🧠 AI weaves hyper-detailed figure...", true);
    
    const prompt = "Create a hyper-realistic 1/7 scale smart sculpture scattered on a premium computer desk, transparent round acrylic base (no text), ZBrush modeling on a curved monitor, Bandai-style collector box beside monitor with flat 2D illusion, cinematic volumetric lighting, ultra-detailed texture, premium figurine atmosphere, 8k quality, elegant mood, subtle rim light.";
    
    const apiEndpoint = `https://api-faa.my.id/faa/nano-banana?url=${encodeURIComponent(uploadedUrl)}&prompt=${encodeURIComponent(prompt)}`;
    
    const imageBlob = await pollForImage(apiEndpoint, 30, 2000);
    enableDownload(imageBlob);
    
  } catch(err) {
    console.error(err);
    let friendlyMsg = err.message.includes("Timeout") ? "⏳ AI generation took a moment too long. Please retry with a clearer reference." : "Generation stalled — network or service issue.";
    setStatus(`❌ ${friendlyMsg.substring(0, 85)}`, false, true);
    showToast(friendlyMsg, "error");
    resetUIForNew();
  } finally {
    setLoading(false);
    if(!currentBlob) downloadBtn.style.display = 'none';
    else downloadBtn.style.display = 'flex';
  }
}

// Download handler
function downloadFigure() {
  if(currentBlob) {
    const link = document.createElement('a');
    const url = URL.createObjectURL(currentBlob);
    link.href = url;
    link.download = `tofigure_ai_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("⬇️ archive saved — thank you", "success");
  } 
  else if(resultImg.src && resultImg.style.display === 'block' && resultImg.src.startsWith('blob:')) {
    fetch(resultImg.src)
      .then(res => res.blob())
      .then(blob => {
        const lnk = document.createElement('a');
        lnk.href = URL.createObjectURL(blob);
        lnk.download = `figure_art_${Date.now()}.png`;
        lnk.click();
        URL.revokeObjectURL(lnk.href);
        showToast("image downloaded", "success");
      })
      .catch(() => showToast("please regenerate to download", "error"));
  } else {
    showToast("No artwork yet — generate a figure first", "error");
  }
}

// File input preview
fileInput.addEventListener('change', () => {
  if(fileInput.files.length) {
    const name = fileInput.files[0].name;
    fileNameSpan.textContent = `📁 ${name.length > 38 ? name.slice(0,35)+'…' : name}`;
    fileNameSpan.style.display = 'inline-block';
    setStatus("✓ reference loaded — press generate", false);
  } else {
    fileNameSpan.style.display = 'none';
  }
  resetUIForNew();
});

// Image click download
resultImg.addEventListener('click', () => {
  if(currentBlob || (resultImg.src && resultImg.style.display === 'block')) downloadFigure();
});

// Attach event listeners
generateBtn.onclick = toFigure;
downloadBtn.onclick = downloadFigure;

// Initial status
setStatus("⚜️ atelier ready — upload visual reference", false);
