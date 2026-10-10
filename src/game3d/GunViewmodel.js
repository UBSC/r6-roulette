import * as THREE from 'three';

export class GunViewmodel {
  constructor(camera, weaponConfig, isKnifeOnly = false) {
    this.camera = camera;
    this.config = weaponConfig;
    this.isKnifeOnly = isKnifeOnly;

    this.root = new THREE.Group();
    this.camera.add(this.root);

    // Positions for Hipfire vs ADS
    this.hipPos = new THREE.Vector3(0.22, -0.24, -0.48);
    this.adsPos = new THREE.Vector3(0.0, -0.165, -0.38); // Centered red dot
    this.currentPos = this.hipPos.clone();
    this.root.position.copy(this.hipPos);

    // Recoil state
    this.recoilZ = 0;
    this.recoilPitch = 0;
    this.walkCycle = 0;
    this.isADS = false;

    // Flashlight & Muzzle light
    this.initLights();
    this.buildMesh();
  }

  initLights() {
    // Muzzle flash point light
    this.muzzleLight = new THREE.PointLight(0xFFE57F, 0, 8);
    this.muzzleLight.position.set(0, 0.05, -0.5);
    this.root.add(this.muzzleLight);

    // Tactical flashlight (provides focused CQB illumination wherever player aims)
    this.flashlight = new THREE.SpotLight(0xF0F9FF, 1.4, 25, Math.PI / 5, 0.4, 1.0);
    this.flashlight.position.set(0.1, 0, -0.3);
    this.flashlight.target.position.set(0, 0, -10);
    this.root.add(this.flashlight);
    this.root.add(this.flashlight.target);
  }

  setFlashlight(isBlindMode, intensity = 5.0) {
    this.flashlight.intensity = isBlindMode ? intensity : 1.4;
  }

  buildMesh() {
    if (this.isKnifeOnly) {
      this.buildKnifeMesh();
    } else if (this.config.type === 'PISTOL') {
      this.buildPistolMesh();
    } else {
      this.buildRifleMesh();
    }
  }

  // Assault Rifle / SMG Mesh
  buildRifleMesh() {
    const gunGroup = new THREE.Group();
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x1A1E24, roughness: 0.35, metalness: 0.8 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x2A313D, roughness: 0.25, metalness: 0.9 });
    const tanMat = new THREE.MeshStandardMaterial({ color: 0x8C7853, roughness: 0.6, metalness: 0.2 });

    // Receiver (main body)
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.35), darkMat);
    gunGroup.add(receiver);

    // Handguard / Barrel
    const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.06, 0.26), tanMat);
    handguard.position.set(0, 0.01, -0.28);
    gunGroup.add(handguard);

    // Barrel tip
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.12, 12), metalMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.01, -0.44);
    gunGroup.add(barrel);

    // Muzzle flash mesh
    this.flashMesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.04),
      new THREE.MeshBasicMaterial({ color: 0xFFFF8D, visible: false })
    );
    this.flashMesh.position.set(0, 0.01, -0.52);
    gunGroup.add(this.flashMesh);

    // Curved magazine
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.18, 0.07), darkMat);
    mag.position.set(0, -0.11, -0.06);
    mag.rotation.x = -0.2;
    gunGroup.add(mag);

    // Grip
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.05), tanMat);
    grip.position.set(0, -0.09, 0.11);
    grip.rotation.x = 0.35;
    gunGroup.add(grip);

    // Holographic Sight Mount
    const sightBase = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.03, 0.1), metalMat);
    sightBase.position.set(0, 0.055, -0.06);
    gunGroup.add(sightBase);

    // Sight Glass Frame (Hood)
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.052, 0.012), darkMat);
    frame.position.set(0, 0.082, -0.09);
    gunGroup.add(frame);

    // Optic Glass Tinted Lens
    const lensMat = new THREE.MeshStandardMaterial({
      color: 0x80D8FF,
      transparent: true,
      opacity: 0.35,
      roughness: 0.1,
      metalness: 0.9
    });
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.042, 0.042), lensMat);
    glass.position.set(0, 0.082, -0.091);
    gunGroup.add(glass);

    // Custom Holographic Reticle Shader (EOTech circle-dot reticle with glowing bloom)
    const holoShaderMat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(0xFF1744) },
        uGlow: { value: 2.2 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uGlow;
        varying vec2 vUv;
        void main() {
          vec2 p = vUv - vec2(0.5);
          float d = length(p);

          // Center dot
          float dotShape = smoothstep(0.045, 0.015, d);

          // Outer holo ring
          float ring = smoothstep(0.025, 0.005, abs(d - 0.26));

          // Crosshair ticks
          float crossH = step(abs(p.y), 0.015) * step(abs(p.x), 0.36) * step(0.16, abs(p.x));
          float crossV = step(abs(p.x), 0.015) * step(abs(p.y), 0.36) * step(0.16, abs(p.y));

          float alpha = clamp(dotShape * 1.8 + ring * 1.2 + crossH + crossV, 0.0, 1.0);
          if (alpha < 0.05) discard;

          gl_FragColor = vec4(uColor * uGlow, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });

    const reticleQuad = new THREE.Mesh(new THREE.PlaneGeometry(0.038, 0.038), holoShaderMat);
    reticleQuad.position.set(0, 0.082, -0.092);
    gunGroup.add(reticleQuad);

    this.root.add(gunGroup);
    this.gunGroup = gunGroup;
  }

  // Tactical Pistol Mesh
  buildPistolMesh() {
    const gunGroup = new THREE.Group();
    const slideMat = new THREE.MeshStandardMaterial({ color: 0x111620, roughness: 0.2, metalness: 0.9 });
    const gripMat = new THREE.MeshStandardMaterial({ color: 0x1E2530, roughness: 0.7, metalness: 0.1 });

    // Slide
    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.05, 0.22), slideMat);
    slide.position.set(0, 0.02, -0.1);
    gunGroup.add(slide);

    // Suppressor
    const silencer = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.2, 16), slideMat);
    silencer.rotation.x = Math.PI / 2;
    silencer.position.set(0, 0.02, -0.28);
    gunGroup.add(silencer);

    // Grip
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.12, 0.06), gripMat);
    grip.position.set(0, -0.06, -0.02);
    grip.rotation.x = 0.25;
    gunGroup.add(grip);

    // Green Tritium Night Sights
    const greenDotMat = new THREE.MeshBasicMaterial({ color: 0x00E676 });
    const frontSight = new THREE.Mesh(new THREE.SphereGeometry(0.0025, 8, 8), greenDotMat);
    frontSight.position.set(0, 0.05, -0.2);
    gunGroup.add(frontSight);

    // Muzzle flash mesh
    this.flashMesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.025),
      new THREE.MeshBasicMaterial({ color: 0xFFFF8D, visible: false })
    );
    this.flashMesh.position.set(0, 0.02, -0.39);
    gunGroup.add(this.flashMesh);

    this.root.add(gunGroup);
    this.gunGroup = gunGroup;
  }

  // Combat Knife Mesh
  buildKnifeMesh() {
    const knifeGroup = new THREE.Group();
    const bladeMat = new THREE.MeshStandardMaterial({ color: 0x90A4AE, roughness: 0.15, metalness: 0.95 });
    const handleMat = new THREE.MeshStandardMaterial({ color: 0x263238, roughness: 0.8 });

    // Handle
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.14, 8), handleMat);
    handle.rotation.x = Math.PI / 2;
    knifeGroup.add(handle);

    // Blade
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.035, 0.18), bladeMat);
    blade.position.set(0, 0.01, -0.16);
    knifeGroup.add(blade);

    knifeGroup.rotation.y = -0.4;
    knifeGroup.rotation.z = 0.3;
    this.root.add(knifeGroup);
    this.gunGroup = knifeGroup;
  }

  fireKick() {
    this.recoilZ = 0.08;
    this.recoilPitch = 0.07;

    // Flash light & mesh
    if (this.muzzleLight && this.flashMesh) {
      this.muzzleLight.intensity = 5.0;
      this.flashMesh.visible = true;
      setTimeout(() => {
        this.muzzleLight.intensity = 0;
        this.flashMesh.visible = false;
      }, 40);
    }
  }

  slashKnife() {
    this.gunGroup.rotation.y = 0.8;
    this.gunGroup.position.x = -0.15;
    setTimeout(() => {
      this.gunGroup.rotation.y = -0.4;
      this.gunGroup.position.x = 0;
    }, 180);
  }

  update(dt, isMoving, isADS) {
    this.isADS = isADS;

    // Smooth ADS interpolation
    const target = isADS ? this.adsPos : this.hipPos;
    this.currentPos.lerp(target, 0.18);

    // Walking sway / bobbing
    let swayX = 0;
    let swayY = 0;
    if (isMoving && !isADS) {
      this.walkCycle += dt * 8;
      swayX = Math.sin(this.walkCycle) * 0.015;
      swayY = Math.abs(Math.cos(this.walkCycle)) * 0.012;
    } else {
      // Idle breath
      this.walkCycle += dt * 2;
      swayY = Math.sin(this.walkCycle) * 0.002;
    }

    // Recover recoil smoothly
    this.recoilZ = THREE.MathUtils.lerp(this.recoilZ, 0, 0.2);
    this.recoilPitch = THREE.MathUtils.lerp(this.recoilPitch, 0, 0.2);

    this.root.position.x = this.currentPos.x + swayX;
    this.root.position.y = this.currentPos.y - swayY;
    this.root.position.z = this.currentPos.z + this.recoilZ;

    this.root.rotation.x = this.recoilPitch;
  }
}
