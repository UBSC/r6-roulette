import * as THREE from 'three';

// Advanced Tactical CQB Post-Processing Pipeline
// Features:
// - Dynamic Vignette & Chromatic Aberration
// - Camera Sensor Noise & Film Grain
// - Flashbang Retinal Burn-in & Decaying Whiteout
// - Hit Damage Shockwave & Low-HP Heartbeat Pulse
// - Glaz Thermal FLIR False-Color Vision Mode
// - Night Vision Goggles (NVG) Green Phosphor Mode
// - Explosion / Flashbang Radial Refractive Shockwave Ring

export class TacticalPostProcess {
  constructor(renderer, width, height) {
    this.renderer = renderer;
    this.width = width;
    this.height = height;

    this.damageIntensity = 0;
    this.flashIntensity = 0;
    this.isThermal = false;
    this.isLowHp = false;
    this.isNVG = false;

    // Shockwave ripple state
    this.shockwaveTime = -1.0;
    this.shockwaveCenter = new THREE.Vector2(0.5, 0.5);

    const pixelRatio = renderer.getPixelRatio();
    this.renderTarget = new THREE.WebGLRenderTarget(width * pixelRatio, height * pixelRatio, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType || THREE.UnsignedByteType
    });

    this.postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.postScene = new THREE.Scene();

    this.initMaterial();

    const quadGeom = new THREE.PlaneGeometry(2, 2);
    this.quadMesh = new THREE.Mesh(quadGeom, this.postMaterial);
    this.postScene.add(this.quadMesh);
  }

  initMaterial() {
    this.postMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(this.width, this.height) },
        uVignette: { value: 0.30 },
        uChromatic: { value: 0.0035 },
        uNoise: { value: 0.045 },
        uDamage: { value: 0.0 },
        uFlash: { value: 0.0 },
        uThermal: { value: 0.0 },
        uLowHp: { value: 0.0 },
        uNVG: { value: 0.0 },
        uShockwaveProgress: { value: -1.0 },
        uShockwaveCenter: { value: new THREE.Vector2(0.5, 0.5) }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float uTime;
        uniform vec2 uResolution;
        uniform float uVignette;
        uniform float uChromatic;
        uniform float uNoise;
        uniform float uDamage;
        uniform float uFlash;
        uniform float uThermal;
        uniform float uLowHp;
        uniform float uNVG;
        uniform float uShockwaveProgress;
        uniform vec2 uShockwaveCenter;
        varying vec2 vUv;

        float rand(vec2 co) {
          return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
        }

        vec3 thermalPalette(float lum) {
          if (lum < 0.2) {
            return mix(vec3(0.02, 0.04, 0.25), vec3(0.2, 0.05, 0.5), lum / 0.2);
          } else if (lum < 0.5) {
            return mix(vec3(0.2, 0.05, 0.5), vec3(0.9, 0.25, 0.1), (lum - 0.2) / 0.3);
          } else if (lum < 0.8) {
            return mix(vec3(0.9, 0.25, 0.1), vec3(1.0, 0.85, 0.1), (lum - 0.5) / 0.3);
          } else {
            return mix(vec3(1.0, 0.85, 0.1), vec3(1.0, 1.0, 1.0), (lum - 0.8) / 0.2);
          }
        }

        void main() {
          vec2 uv = vUv;

          // 0. Radial Explosive / Flashbang Shockwave Distortion Ripple
          if (uShockwaveProgress >= 0.0 && uShockwaveProgress <= 1.0) {
            vec2 diff = uv - uShockwaveCenter;
            float aspect = uResolution.x / uResolution.y;
            diff.x *= aspect;
            float distToCenter = length(diff);

            float waveRadius = uShockwaveProgress * 1.4;
            float waveThickness = 0.12;
            float waveEdge = abs(distToCenter - waveRadius);

            if (waveEdge < waveThickness) {
              float factor = (1.0 - waveEdge / waveThickness) * (1.0 - uShockwaveProgress) * 0.045;
              vec2 normDiff = normalize(diff);
              normDiff.x /= aspect;
              uv -= normDiff * factor;
            }
          }

          vec2 center = uv - 0.5;
          float dist = length(center);

          // 1. Chromatic Aberration
          float chromAmount = uChromatic + uDamage * 0.015 + uFlash * 0.035;
          vec2 offset = center * chromAmount * dist;

          float r = texture2D(tDiffuse, uv - offset).r;
          float g = texture2D(tDiffuse, uv).g;
          float b = texture2D(tDiffuse, uv + offset).b;
          vec3 color = vec3(r, g, b);

          // 2. Tactical Edge Vignette & Exposure Lift
          float vig = smoothstep(1.05, 0.42, dist * (uVignette + 0.15 + uNVG * 0.2));
          color *= vig;

          // Lift overall luminance cleanly so shadows don't crush to pitch black
          color = pow(color, vec3(0.92)) * 1.15;

          // 3. Film Grain
          float noiseMultiplier = mix(uNoise, 0.14, uNVG);
          float noise = (rand(uv + fract(uTime * 17.1)) - 0.5) * noiseMultiplier;
          color += noise;

          // 4. Hit Damage Shock
          if (uDamage > 0.01) {
            vec3 bloodRed = vec3(0.85, 0.05, 0.05);
            float damageVig = smoothstep(0.2, 0.8, dist);
            color = mix(color, bloodRed, damageVig * uDamage * 0.7);
            color = mix(color, vec3(color.r * 1.3, color.g * 0.6, color.b * 0.6), uDamage * 0.35);
          }

          // 5. Low HP Critical Heartbeat Pulse
          if (uLowHp > 0.01) {
            float pulse = 0.5 + 0.5 * sin(uTime * 5.0);
            float gray = dot(color, vec3(0.299, 0.587, 0.114));
            color = mix(color, vec3(gray * 1.1, gray * 0.75, gray * 0.75), uLowHp * 0.6);
            color += vec3(0.15, 0.0, 0.0) * pulse * uLowHp;
          }

          // 6. Flashbang Retinal Burn-in Whiteout
          if (uFlash > 0.01) {
            vec3 flashWhite = vec3(1.0, 0.98, 0.92);
            color = mix(color, flashWhite, uFlash);
            color += vec3(uFlash * 0.85);
          }

          // 7. Night Vision Goggles (NVG) Green Phosphor Mode
          if (uNVG > 0.01) {
            float lum = dot(color, vec3(0.299, 0.587, 0.114));
            // High analog gain
            lum = pow(lum * 1.4 + 0.08, 0.85);
            vec3 nvgGreen = vec3(0.08, 0.96, 0.24) * lum;
            // CRT scanlines
            float scanline = sin(uv.y * uResolution.y * 2.0) * 0.05;
            nvgGreen -= scanline;
            color = mix(color, nvgGreen, uNVG);
          }

          // 8. Glaz Thermal FLIR Vision
          if (uThermal > 0.01) {
            float lum = dot(color, vec3(0.299, 0.587, 0.114));
            vec3 thermalCol = thermalPalette(lum);
            float scanline = sin(uv.y * uResolution.y * 1.5) * 0.08;
            thermalCol -= scanline;
            color = mix(color, thermalCol, uThermal);
          }

          gl_FragColor = vec4(color, 1.0);
        }
      `,
      depthTest: false,
      depthWrite: false
    });
  }

  resize(w, height) {
    this.width = w;
    this.height = height;
    const pr = this.renderer.getPixelRatio();
    this.renderTarget.setSize(w * pr, height * pr);
    this.postMaterial.uniforms.uResolution.value.set(w, height);
  }

  triggerDamageFlash(amount = 1.0) {
    this.damageIntensity = Math.min(1.0, this.damageIntensity + amount);
  }

  triggerFlashbang(duration = 2.5) {
    this.flashIntensity = 1.0;
    this.triggerShockwave(new THREE.Vector2(0.5, 0.5));
  }

  triggerShockwave(screenPos = new THREE.Vector2(0.5, 0.5)) {
    this.shockwaveCenter.copy(screenPos);
    this.shockwaveTime = 0.0;
    this.postMaterial.uniforms.uShockwaveCenter.value.copy(screenPos);
  }

  setThermal(active) {
    this.isThermal = active;
  }

  setLowHp(isLow) {
    this.isLowHp = isLow;
  }

  toggleNVG() {
    this.isNVG = !this.isNVG;
    return this.isNVG;
  }

  setNVG(active) {
    this.isNVG = active;
  }

  update(dt) {
    if (this.damageIntensity > 0) {
      this.damageIntensity = Math.max(0, this.damageIntensity - dt * 2.8);
    }
    if (this.flashIntensity > 0) {
      this.flashIntensity = Math.max(0, this.flashIntensity - dt * 0.7);
    }

    // Shockwave progress
    if (this.shockwaveTime >= 0.0) {
      this.shockwaveTime += dt * 1.8;
      if (this.shockwaveTime > 1.0) {
        this.shockwaveTime = -1.0;
      }
    }
    this.postMaterial.uniforms.uShockwaveProgress.value = this.shockwaveTime;

    const time = performance.now() / 1000;
    this.postMaterial.uniforms.uTime.value = time;
    this.postMaterial.uniforms.uDamage.value = this.damageIntensity;
    this.postMaterial.uniforms.uFlash.value = this.flashIntensity;

    this.postMaterial.uniforms.uThermal.value = THREE.MathUtils.lerp(
      this.postMaterial.uniforms.uThermal.value,
      this.isThermal ? 1.0 : 0.0,
      0.15
    );
    this.postMaterial.uniforms.uLowHp.value = THREE.MathUtils.lerp(
      this.postMaterial.uniforms.uLowHp.value,
      this.isLowHp ? 1.0 : 0.0,
      0.1
    );
    this.postMaterial.uniforms.uNVG.value = THREE.MathUtils.lerp(
      this.postMaterial.uniforms.uNVG.value,
      this.isNVG ? 1.0 : 0.0,
      0.18
    );
  }

  render(scene, camera, dt) {
    this.update(dt);

    this.renderer.setRenderTarget(this.renderTarget);
    this.renderer.render(scene, camera);

    this.renderer.setRenderTarget(null);
    this.postMaterial.uniforms.tDiffuse.value = this.renderTarget.texture;
    this.renderer.render(this.postScene, this.postCamera);
  }

  dispose() {
    this.renderTarget.dispose();
    this.postMaterial.dispose();
  }
}
