async function loadModels() {
  await faceapi.nets.ssdMobilenetv1.load('/models/ssd_mobilenetv1');
}

async function handlePhotoUpload() {
  if (!selectedTemplate) {
    alert("Please select a template before uploading a photo.");
    return;
  }

  const template = await loadImage(selectedTemplate.background);
  const overlay = selectedTemplate.overlay ? await loadImage(selectedTemplate.overlay) : null;
  const slots = selectedTemplate.slots;

  const input = document.getElementById("photoInput");
  const file = input.files[0];
  const img = await faceapi.bufferToImage(file);

  const detections = await faceapi.detectAllFaces(img);

  const canvas = document.getElementById("finalCanvas");
  const ctx = canvas.getContext("2d");

  const positions = [
    { x: 100, y: 320 },
    { x: 244, y: 278 },
    { x: 431, y: 285 },
    { x: 603, y: 295 }
  ];
  
   // Clear previous content
   ctx.clearRect(0, 0, canvas.width, canvas.height);
   document.getElementById('facePreviewContainer').innerHTML = '';
 
   // Draw astronaut template first
   ctx.drawImage(template, 0, 0, canvas.width, canvas.height);
 
   // Draw cropped circular faces
   detections.slice(0, 4).forEach((det, i) => {
    const { x, y, width, height } = det.box;
    const yOffset = y + height * 0.10;
    const adjustedHeight = height * 0.9;
  
    const crop = cropImage(img, x, yOffset, width, adjustedHeight);
  
    // Pull target slot from template
    const slot = slots[i];
    const faceW = slot.width;
    const faceH = faceW * (crop.height / crop.width);
  
    // Center inside the cutout slot
    const offsetY = slot.y + (slot.height - faceH) / 2;
  
    // Draw oval mask
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(
      slot.x + slot.width / 2,
      slot.y + slot.height / 2,
      slot.width / 2,
      slot.height / 2,
      0,
      0,
      Math.PI * 2
    );
    ctx.closePath();
    ctx.clip();
  
    ctx.drawImage(crop, slot.x, offsetY, faceW, faceH);
    ctx.restore();
  
    // Optional: face preview
    const previewCanvas = document.createElement('canvas');
    previewCanvas.width = slot.width;
    previewCanvas.height = slot.height;
    const previewCtx = previewCanvas.getContext('2d');
    previewCtx.drawImage(crop, 0, (slot.height - faceH) / 2, faceW, faceH);
    document.getElementById('facePreviewContainer').appendChild(previewCanvas);
  });

  // Add event title at top
    ctx.font = "bold 28px sans-serif";
    ctx.fillStyle = "#ffdd57";
    ctx.textAlign = "center";
    ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
    ctx.shadowBlur = 4;
    ctx.fillText(document.getElementById("eventTitle").value, canvas.width / 2, 40);

    // Draw custom bottom caption
    const captionText = document.getElementById("bottomText").value;
    ctx.font = "20px sans-serif";
    ctx.fillText(captionText, canvas.width / 2, canvas.height - 40);

 }

function cropImage(sourceImage, x, y, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(sourceImage, x, y, width, height, 0, 0, width, height);
  return canvas;
}

function loadImage(src) {
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => res(img);
    img.src = src;
  });
}

let selectedTemplate = null;
let templateData = [];

async function loadTemplates() {
  const res = await fetch('templates.json');
  templateData = await res.json();
  const container = document.getElementById('templateSelector');

  templateData.forEach((template) => {
    const tile = document.createElement('div');
    tile.style.border = '3px solid transparent';
    tile.style.cursor = 'pointer';

    const img = document.createElement('img');
    img.src = template.thumbnail;
    img.alt = template.label;
    img.style.width = '160px';
    img.style.height = '160px';
    img.style.objectFit = 'cover';
    img.style.borderRadius = '8px';

    const label = document.createElement('div');
    label.innerText = template.label;
    label.style.textAlign = 'center';
    label.style.marginTop = '6px';

    tile.appendChild(img);
    tile.appendChild(label);

    tile.onclick = () => {
      selectedTemplate = template;
    
      // Clear previous render
      clearCanvasAndPreview();
    
      // Clear photo input
      document.getElementById("photoInput").value = "";
    
      // Unhighlight other tiles
      [...container.children].forEach(c => c.style.border = '3px solid transparent');
      tile.style.border = '3px solid orange';
    };

    container.appendChild(tile);
  });
}

function clearCanvasAndPreview() {
  const canvas = document.getElementById("finalCanvas");
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  document.getElementById("facePreviewContainer").innerHTML = '';
}

function refreshTextOnly() {
  const canvas = document.getElementById("finalCanvas");
  const ctx = canvas.getContext("2d");

  // Get current image data
  const img = new Image();
  img.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Draw text again
    ctx.font = "28px sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
    ctx.shadowBlur = 4;

    const title = document.getElementById("eventTitle").value;
    ctx.fillText(title, canvas.width / 2, 40);

    const caption = document.getElementById("bottomText").value;
    ctx.font = "20px sans-serif";
    ctx.fillText(caption, canvas.width / 2, canvas.height - 40);
  };

  // Get current canvas image as source
  img.src = canvas.toDataURL("image/png");
}

document.getElementById("photoInput").addEventListener("change", handlePhotoUpload);
document.getElementById("finalCanvas").scrollIntoView({ behavior: "smooth" });
document.getElementById("eventTitle").addEventListener("input", refreshTextOnly);
document.getElementById("bottomText").addEventListener("input", refreshTextOnly);
loadModels();
loadTemplates();
