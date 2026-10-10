import * as THREE from 'three';

// Advanced Procedural PBR Texture Generator with Tangent-Space Normal Maps & Roughness Maps
// Generates realistic tactical CQB surfaces (Zero external downloads, instant 60 FPS performance)

function createNormalMapFromHeight(heightCanvas, intensity = 2.4) {
  const w = heightCanvas.width;
  const h = heightCanvas.height;
  const ctx = heightCanvas.getContext('2d');
  const imgData = ctx.getImageData(0, 0, w, h);
  const src = imgData.data;

  const normalCanvas = document.createElement('canvas');
  normalCanvas.width = w;
  normalCanvas.height = h;
  const nCtx = normalCanvas.getContext('2d');
  const normalImg = nCtx.createImageData(w, h);
  const dst = normalImg.data;

  const getHeight = (x, y) => {
    const px = (x + w) % w;
    const py = (y + h) % h;
    return src[(py * w + px) * 4] / 255.0;
  };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // 3x3 Sobel filter for tangent normal
      const tl = getHeight(x - 1, y - 1);
      const t  = getHeight(x,     y - 1);
      const tr = getHeight(x + 1, y - 1);
      const l  = getHeight(x - 1, y);
      const r  = getHeight(x + 1, y);
      const bl = getHeight(x - 1, y + 1);
      const b  = getHeight(x,     y + 1);
      const br = getHeight(x + 1, y + 1);

      const dx = ((tr + 2.0 * r + br) - (tl + 2.0 * l + bl)) * intensity;
      const dy = ((bl + 2.0 * b + br) - (tl + 2.0 * t + tr)) * intensity;
      const dz = 1.0;

      const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const nx = -dx / len;
      const ny = -dy / len;
      const nz = dz / len;

      const idx = (y * w + x) * 4;
      dst[idx]     = Math.floor((nx * 0.5 + 0.5) * 255);
      dst[idx + 1] = Math.floor((ny * 0.5 + 0.5) * 255);
      dst[idx + 2] = Math.floor((nz * 0.5 + 0.5) * 255);
      dst[idx + 3] = 255;
    }
  }

  nCtx.putImageData(normalImg, 0, 0);
  const tex = new THREE.CanvasTexture(normalCanvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export class TextureFactory {
  // 1. High-Detail Wood Parquet with Normal Map & Roughness
  static createWoodFloorMaterial() {
    const size = 512;
    const diffuseCanvas = document.createElement('canvas');
    diffuseCanvas.width = size;
    diffuseCanvas.height = size;
    const dCtx = diffuseCanvas.getContext('2d');

    const heightCanvas = document.createElement('canvas');
    heightCanvas.width = size;
    heightCanvas.height = size;
    const hCtx = heightCanvas.getContext('2d');

    const roughCanvas = document.createElement('canvas');
    roughCanvas.width = size;
    roughCanvas.height = size;
    const rCtx = roughCanvas.getContext('2d');

    // Base background (Warm honey oak parquet)
    dCtx.fillStyle = '#6E4226';
    dCtx.fillRect(0, 0, size, size);

    hCtx.fillStyle = '#808080';
    hCtx.fillRect(0, 0, size, size);

    rCtx.fillStyle = '#C0C0C0';
    rCtx.fillRect(0, 0, size, size);

    const plankHeight = 64;
    const plankWidth = 256;

    for (let y = 0; y < size; y += plankHeight) {
      const offsetX = (y / plankHeight) % 2 === 0 ? 0 : 128;
      for (let x = -128; x < size + 128; x += plankWidth) {
        const px = x + offsetX;
        const colorVar = Math.floor(Math.random() * 26 - 13);
        const r = 138 + colorVar;
        const g = 96 + colorVar;
        const b = 62 + colorVar;

        // Plank fill with beveled margin
        dCtx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        dCtx.fillRect(px + 2, y + 2, plankWidth - 4, plankHeight - 4);

        // Plank height in bump map
        hCtx.fillStyle = '#C8C8C8';
        hCtx.fillRect(px + 2, y + 2, plankWidth - 4, plankHeight - 4);

        // Deep recessed grooves between planks
        hCtx.fillStyle = '#101010';
        hCtx.fillRect(px, y, plankWidth, 3);
        hCtx.fillRect(px, y, 3, plankHeight);

        // Dark seam in diffuse
        dCtx.fillStyle = 'rgba(15, 8, 4, 0.75)';
        dCtx.fillRect(px, y, plankWidth, 3);
        dCtx.fillRect(px, y, 3, plankHeight);

        // Wood grain lines
        dCtx.strokeStyle = 'rgba(30, 16, 8, 0.22)';
        dCtx.lineWidth = 1.2;
        hCtx.strokeStyle = '#909090';
        hCtx.lineWidth = 1.0;

        for (let i = 0; i < 5; i++) {
          const gy = y + 8 + i * 11 + Math.random() * 4;
          dCtx.beginPath();
          dCtx.moveTo(px + 4, gy);
          dCtx.bezierCurveTo(
            px + 70, gy + Math.random() * 3 - 1.5,
            px + 180, gy + Math.random() * 3 - 1.5,
            px + plankWidth - 4, gy
          );
          dCtx.stroke();

          hCtx.beginPath();
          hCtx.moveTo(px + 4, gy);
          hCtx.lineTo(px + plankWidth - 4, gy);
          hCtx.stroke();
        }

        // Varied roughness
        rCtx.fillStyle = Math.random() > 0.5 ? '#888888' : '#AAAAAA';
        rCtx.fillRect(px + 2, y + 2, plankWidth - 4, plankHeight - 4);
      }
    }

    const diffuseTex = new THREE.CanvasTexture(diffuseCanvas);
    diffuseTex.wrapS = THREE.RepeatWrapping;
    diffuseTex.wrapT = THREE.RepeatWrapping;
    diffuseTex.repeat.set(6, 6);

    const normalTex = createNormalMapFromHeight(heightCanvas, 3.2);
    normalTex.repeat.set(6, 6);

    const roughTex = new THREE.CanvasTexture(roughCanvas);
    roughTex.wrapS = THREE.RepeatWrapping;
    roughTex.wrapT = THREE.RepeatWrapping;
    roughTex.repeat.set(6, 6);

    return new THREE.MeshStandardMaterial({
      map: diffuseTex,
      normalMap: normalTex,
      roughnessMap: roughTex,
      roughness: 0.55,
      metalness: 0.08
    });
  }

  // 2. Concrete Tiles with Normal Map (For Bomb Rooms & Hallways)
  static createConcreteFloorMaterial() {
    const size = 512;
    const diffuseCanvas = document.createElement('canvas');
    diffuseCanvas.width = size;
    diffuseCanvas.height = size;
    const dCtx = diffuseCanvas.getContext('2d');

    const heightCanvas = document.createElement('canvas');
    heightCanvas.width = size;
    heightCanvas.height = size;
    const hCtx = heightCanvas.getContext('2d');

    dCtx.fillStyle = '#64748B';
    dCtx.fillRect(0, 0, size, size);

    hCtx.fillStyle = '#808080';
    hCtx.fillRect(0, 0, size, size);

    // Concrete grit & grain
    for (let i = 0; i < 6000; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const alpha = Math.random() * 0.12;
      dCtx.fillStyle = Math.random() > 0.5 ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`;
      dCtx.fillRect(x, y, 2, 2);

      const hVal = Math.random() > 0.5 ? 160 : 100;
      hCtx.fillStyle = `rgb(${hVal},${hVal},${hVal})`;
      hCtx.fillRect(x, y, 1, 1);
    }

    // Grid expansion joints
    const tileSize = 128;
    for (let i = 0; i < size; i += tileSize) {
      dCtx.fillStyle = 'rgba(20, 25, 35, 0.6)';
      dCtx.fillRect(i, 0, 4, size);
      dCtx.fillRect(0, i, size, 4);

      hCtx.fillStyle = '#101010';
      hCtx.fillRect(i, 0, 4, size);
      hCtx.fillRect(0, i, size, 4);
    }

    const diffuseTex = new THREE.CanvasTexture(diffuseCanvas);
    diffuseTex.wrapS = THREE.RepeatWrapping;
    diffuseTex.wrapT = THREE.RepeatWrapping;
    diffuseTex.repeat.set(5, 5);

    const normalTex = createNormalMapFromHeight(heightCanvas, 2.8);
    normalTex.repeat.set(5, 5);

    return new THREE.MeshStandardMaterial({
      map: diffuseTex,
      normalMap: normalTex,
      roughness: 0.82,
      metalness: 0.15
    });
  }

  // 3. Tactical CQB Wall (Plaster with Stencils, Baseboard & Normal Map)
  static createWallMaterial(stencil = 'TACTICAL CQB // SECTOR') {
    const size = 512;
    const diffuseCanvas = document.createElement('canvas');
    diffuseCanvas.width = size;
    diffuseCanvas.height = size;
    const dCtx = diffuseCanvas.getContext('2d');

    const heightCanvas = document.createElement('canvas');
    heightCanvas.width = size;
    heightCanvas.height = size;
    const hCtx = heightCanvas.getContext('2d');

    // Base paint: Clean modern tactical concrete / slate plaster
    dCtx.fillStyle = '#697A91';
    dCtx.fillRect(0, 0, size, size);

    hCtx.fillStyle = '#808080';
    hCtx.fillRect(0, 0, size, size);

    // Wall plaster micro-texture
    for (let i = 0; i < 4000; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const alpha = Math.random() * 0.06;
      dCtx.fillStyle = Math.random() > 0.5 ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`;
      dCtx.fillRect(x, y, 2, 2);

      const hVal = Math.random() > 0.5 ? 145 : 115;
      hCtx.fillStyle = `rgb(${hVal},${hVal},${hVal})`;
      hCtx.fillRect(x, y, 1, 1);
    }

    // Vertical drywall seams
    for (let x = 0; x < size; x += 256) {
      dCtx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      dCtx.fillRect(x, 0, 3, size);

      hCtx.fillStyle = '#404040';
      hCtx.fillRect(x, 0, 3, size);
    }

    // Horizontal tactical accent stripe
    dCtx.fillStyle = 'rgba(255, 87, 34, 0.85)';
    dCtx.fillRect(0, 280, size, 8);
    dCtx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    dCtx.fillRect(0, 292, size, 2);

    // Tactical stencil lettering
    dCtx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    dCtx.font = 'bold 22px sans-serif';
    dCtx.fillText(stencil, 30, 260);

    // Bottom baseboard trim in texture
    dCtx.fillStyle = '#11141A';
    dCtx.fillRect(0, 472, size, 40);
    dCtx.fillStyle = '#FF5722';
    dCtx.fillRect(0, 470, size, 2);

    hCtx.fillStyle = '#E0E0E0'; // Baseboard stands out
    hCtx.fillRect(0, 472, size, 40);
    hCtx.fillStyle = '#202020'; // Groove
    hCtx.fillRect(0, 470, size, 2);

    const diffuseTex = new THREE.CanvasTexture(diffuseCanvas);
    diffuseTex.wrapS = THREE.RepeatWrapping;
    diffuseTex.wrapT = THREE.RepeatWrapping;

    const normalTex = createNormalMapFromHeight(heightCanvas, 2.2);

    return new THREE.MeshStandardMaterial({
      map: diffuseTex,
      normalMap: normalTex,
      roughness: 0.75,
      metalness: 0.12
    });
  }

  // 4. Reinforced Metal Wall (Siege Hard Wall with Steel Plates & Rivets)
  static createReinforcedWallMaterial() {
    const size = 512;
    const diffuseCanvas = document.createElement('canvas');
    diffuseCanvas.width = size;
    diffuseCanvas.height = size;
    const dCtx = diffuseCanvas.getContext('2d');

    const heightCanvas = document.createElement('canvas');
    heightCanvas.width = size;
    heightCanvas.height = size;
    const hCtx = heightCanvas.getContext('2d');

    // Gunmetal steel plate
    dCtx.fillStyle = '#2A313A';
    dCtx.fillRect(0, 0, size, size);

    hCtx.fillStyle = '#707070';
    hCtx.fillRect(0, 0, size, size);

    // Metal panel borders with bevel
    dCtx.strokeStyle = '#4A5565';
    dCtx.lineWidth = 6;
    dCtx.strokeRect(10, 10, size - 20, size - 20);

    hCtx.strokeStyle = '#D0D0D0';
    hCtx.lineWidth = 6;
    hCtx.strokeRect(10, 10, size - 20, size - 20);

    // Embossed X reinforcement braces
    dCtx.strokeStyle = 'rgba(20, 24, 30, 0.85)';
    dCtx.lineWidth = 18;
    dCtx.beginPath();
    dCtx.moveTo(20, 20);
    dCtx.lineTo(size - 20, size - 20);
    dCtx.moveTo(size - 20, 20);
    dCtx.lineTo(20, size - 20);
    dCtx.stroke();

    hCtx.strokeStyle = '#C0C0C0';
    hCtx.lineWidth = 18;
    hCtx.beginPath();
    hCtx.moveTo(20, 20);
    hCtx.lineTo(size - 20, size - 20);
    hCtx.moveTo(size - 20, 20);
    hCtx.lineTo(20, size - 20);
    hCtx.stroke();

    // Steel anchor bolts (Rivets) in corners & sides
    const boltPoints = [
      [30, 30], [size - 30, 30], [30, size - 30], [size - 30, size - 30],
      [size / 2, 30], [size / 2, size - 30], [30, size / 2], [size - 30, size / 2]
    ];

    boltPoints.forEach(([bx, by]) => {
      // Bolt in diffuse
      dCtx.fillStyle = '#65748B';
      dCtx.beginPath();
      dCtx.arc(bx, by, 10, 0, Math.PI * 2);
      dCtx.fill();
      dCtx.fillStyle = '#1E293B';
      dCtx.beginPath();
      dCtx.arc(bx, by, 5, 0, Math.PI * 2);
      dCtx.fill();

      // Bolt in height map (Raised bump)
      hCtx.fillStyle = '#FFFFFF';
      hCtx.beginPath();
      hCtx.arc(bx, by, 10, 0, Math.PI * 2);
      hCtx.fill();
    });

    // Warning hazard stripes at top
    dCtx.fillStyle = '#EAB308';
    dCtx.fillRect(20, 20, size - 40, 24);
    dCtx.fillStyle = '#0F172A';
    for (let i = 20; i < size - 40; i += 28) {
      dCtx.beginPath();
      dCtx.moveTo(i, 20);
      dCtx.lineTo(i + 14, 20);
      dCtx.lineTo(i + 24, 44);
      dCtx.lineTo(i + 10, 44);
      dCtx.closePath();
      dCtx.fill();
    }

    const diffuseTex = new THREE.CanvasTexture(diffuseCanvas);
    diffuseTex.wrapS = THREE.RepeatWrapping;
    diffuseTex.wrapT = THREE.RepeatWrapping;

    const normalTex = createNormalMapFromHeight(heightCanvas, 3.8);

    return new THREE.MeshStandardMaterial({
      map: diffuseTex,
      normalMap: normalTex,
      roughness: 0.38,
      metalness: 0.85
    });
  }

  // 5. Wooden Barricade Planks with Normal Relief & Bolt Heads
  static createBarricadeMaterial() {
    const size = 512;
    const diffuseCanvas = document.createElement('canvas');
    diffuseCanvas.width = size;
    diffuseCanvas.height = size;
    const dCtx = diffuseCanvas.getContext('2d');

    const heightCanvas = document.createElement('canvas');
    heightCanvas.width = size;
    heightCanvas.height = size;
    const hCtx = heightCanvas.getContext('2d');

    dCtx.fillStyle = '#8B4513';
    dCtx.fillRect(0, 0, size, size);

    hCtx.fillStyle = '#606060';
    hCtx.fillRect(0, 0, size, size);

    // Individual horizontal wooden planks
    const plankH = 50;
    for (let y = 0; y < size; y += plankH) {
      const shade = Math.floor(Math.random() * 24 - 12);
      dCtx.fillStyle = `rgb(${160 + shade}, ${82 + shade}, ${28 + shade})`;
      dCtx.fillRect(0, y + 2, size, plankH - 4);

      hCtx.fillStyle = '#B0B0B0';
      hCtx.fillRect(0, y + 2, size, plankH - 4);

      // Deep groove between planks
      hCtx.fillStyle = '#101010';
      hCtx.fillRect(0, y, size, 3);
      dCtx.fillStyle = '#1A0D04';
      dCtx.fillRect(0, y, size, 3);

      // Bolts on sides
      dCtx.fillStyle = '#333';
      dCtx.beginPath();
      dCtx.arc(24, y + plankH / 2, 7, 0, Math.PI * 2);
      dCtx.arc(size - 24, y + plankH / 2, 7, 0, Math.PI * 2);
      dCtx.fill();

      hCtx.fillStyle = '#FFF';
      hCtx.beginPath();
      hCtx.arc(24, y + plankH / 2, 7, 0, Math.PI * 2);
      hCtx.arc(size - 24, y + plankH / 2, 7, 0, Math.PI * 2);
      hCtx.fill();
    }

    // Giant yellow tactical cross X across barricade (Rainbow Six Siege signature!)
    dCtx.strokeStyle = '#F59E0B';
    dCtx.lineWidth = 32;
    dCtx.beginPath();
    dCtx.moveTo(40, 40);
    dCtx.lineTo(size - 40, size - 40);
    dCtx.moveTo(size - 40, 40);
    dCtx.lineTo(40, size - 40);
    dCtx.stroke();

    hCtx.strokeStyle = '#E0E0E0';
    hCtx.lineWidth = 32;
    hCtx.beginPath();
    hCtx.moveTo(40, 40);
    hCtx.lineTo(size - 40, size - 40);
    hCtx.moveTo(size - 40, 40);
    hCtx.lineTo(40, size - 40);
    hCtx.stroke();

    const diffuseTex = new THREE.CanvasTexture(diffuseCanvas);
    const normalTex = createNormalMapFromHeight(heightCanvas, 3.5);

    return new THREE.MeshStandardMaterial({
      map: diffuseTex,
      normalMap: normalTex,
      roughness: 0.72,
      metalness: 0.1
    });
  }

  // 6. Office Acoustic Drop Ceiling Grid with Normal Map
  static createCeilingMaterial() {
    const size = 512;
    const diffuseCanvas = document.createElement('canvas');
    diffuseCanvas.width = size;
    diffuseCanvas.height = size;
    const dCtx = diffuseCanvas.getContext('2d');

    const heightCanvas = document.createElement('canvas');
    heightCanvas.width = size;
    heightCanvas.height = size;
    const hCtx = heightCanvas.getContext('2d');

    // Base acoustic tile (Clean light grey acoustic drop ceiling)
    dCtx.fillStyle = '#C8D2DE';
    dCtx.fillRect(0, 0, size, size);

    hCtx.fillStyle = '#808080';
    hCtx.fillRect(0, 0, size, size);

    // Acoustical perforations
    for (let i = 0; i < 3000; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      dCtx.fillStyle = 'rgba(80, 95, 115, 0.22)';
      dCtx.fillRect(x, y, 2, 2);

      hCtx.fillStyle = '#303030';
      hCtx.fillRect(x, y, 2, 2);
    }

    // Metal T-bar grid lines
    const gridSpacing = 128;
    for (let i = 0; i < size; i += gridSpacing) {
      dCtx.fillStyle = '#7E8B9B';
      dCtx.fillRect(i - 2, 0, 4, size);
      dCtx.fillRect(0, i - 2, size, 4);

      hCtx.fillStyle = '#B0B0B0';
      hCtx.fillRect(i - 2, 0, 4, size);
      hCtx.fillRect(0, i - 2, size, 4);
    }

    const diffuseTex = new THREE.CanvasTexture(diffuseCanvas);
    diffuseTex.wrapS = THREE.RepeatWrapping;
    diffuseTex.wrapT = THREE.RepeatWrapping;
    diffuseTex.repeat.set(6, 6);

    const normalTex = createNormalMapFromHeight(heightCanvas, 2.0);
    normalTex.repeat.set(6, 6);

    return new THREE.MeshStandardMaterial({
      map: diffuseTex,
      normalMap: normalTex,
      roughness: 0.9,
      metalness: 0.2
    });
  }

  // 7. Server Rack with Emissive Blinking LED Panels
  static createServerRackMaterial() {
    const size = 512;
    const diffuseCanvas = document.createElement('canvas');
    diffuseCanvas.width = size;
    diffuseCanvas.height = size;
    const dCtx = diffuseCanvas.getContext('2d');

    const emissiveCanvas = document.createElement('canvas');
    emissiveCanvas.width = size;
    emissiveCanvas.height = size;
    const eCtx = emissiveCanvas.getContext('2d');

    // Dark server frame
    dCtx.fillStyle = '#13171F';
    dCtx.fillRect(0, 0, size, size);
    eCtx.fillStyle = '#000';
    eCtx.fillRect(0, 0, size, size);

    // Server units (1U / 2U slots)
    for (let y = 10; y < size - 10; y += 38) {
      dCtx.fillStyle = '#1E2430';
      dCtx.fillRect(10, y, size - 20, 32);

      // Grill vents
      dCtx.fillStyle = '#0A0D12';
      for (let x = 30; x < size - 140; x += 12) {
        dCtx.fillRect(x, y + 6, 6, 20);
      }

      // Blinking LEDs
      const ledColors = ['#00FF66', '#00F0FF', '#FFB800', '#FF3B30'];
      for (let l = 0; l < 4; l++) {
        const lx = size - 110 + l * 22;
        const color = ledColors[l % ledColors.length];

        dCtx.fillStyle = color;
        dCtx.fillRect(lx, y + 12, 10, 8);

        eCtx.fillStyle = color;
        eCtx.fillRect(lx, y + 12, 10, 8);
      }
    }

    const diffuseTex = new THREE.CanvasTexture(diffuseCanvas);
    const emissiveTex = new THREE.CanvasTexture(emissiveCanvas);

    return new THREE.MeshStandardMaterial({
      map: diffuseTex,
      emissiveMap: emissiveTex,
      emissive: 0xFFFFFF,
      emissiveIntensity: 0.9,
      roughness: 0.4,
      metalness: 0.75
    });
  }

  // 8. Hazard Stripes Texture
  static createHazardTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(0, 0, 256, 256);

    ctx.fillStyle = '#111827';
    for (let i = -256; i < 512; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 20, 0);
      ctx.lineTo(i + 20 + 256, 256);
      ctx.lineTo(i + 256, 256);
      ctx.closePath();
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }
}
