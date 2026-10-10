import * as THREE from 'three';
import { TextureFactory } from './Textures.js';

export class Map3D {
  constructor(scene) {
    this.scene = scene;
    this.colliders = []; // Array of THREE.Box3
    this.barricades = [];
    this.bombSites = [];
    this.lights = [];

    this.buildMap();
  }

  buildMap() {
    const floorTex = TextureFactory.createWoodFloor();
    const wallTex = TextureFactory.createWallTexture();
    const barTex = TextureFactory.createBarricadeTexture();
    const hazardTex = TextureFactory.createHazardTexture();

    const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.6, metalness: 0.1 });
    const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.8, metalness: 0.1 });
    const ceilingMat = new THREE.MeshStandardMaterial({ color: 0x1E222A, roughness: 0.9 });

    // 1. Floor & Ceiling (36m x 30m)
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(36, 30), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(36, 30), ceilingMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 3.6;
    this.scene.add(ceiling);

    // 2. Outer Perimeter Boundaries (x: -17 to +17, z: -14 to +14)
    this.addWall(-17, 1.8, 0, 0.4, 3.6, 28, wallMat);  // West wall
    this.addWall(17, 1.8, 0, 0.4, 3.6, 28, wallMat);   // East wall
    this.addWall(0, 1.8, -14, 34, 3.6, 0.4, wallMat);  // North wall
    this.addWall(0, 1.8, 14, 34, 3.6, 0.4, wallMat);   // South wall

    // 3. Interior Layout
    // PLAYER SPAWNS IN WEST ROOM: x = -13, z = 0 (Completely safe & empty!)
    // West Room partition at x = -7, with a doorway at z = 0
    this.addWall(-7, 1.8, -8, 0.4, 3.6, 12, wallMat);  // North partition
    this.addWall(-7, 1.8, 8, 0.4, 3.6, 12, wallMat);   // South partition
    // Doorway at x = -7, z = 0 with wooden barricade!
    this.createBarricade(-7, 1.4, 0, 0.3, 2.8, 2.0, barTex, 'Выход со спавна (Door to Corridor)');

    // Central Corridor divides North and South wings
    // Corridor runs from x = -7 to x = 8, z: -2 to +2
    this.addWall(0, 1.8, -3.5, 14, 3.6, 0.4, wallMat); // North corridor wall
    this.addWall(0, 1.8, 3.5, 14, 3.6, 0.4, wallMat);  // South corridor wall

    // Doorway into North Room (Bomb A) at x = 0, z = -3.5
    // Doorway into South Room (Bomb B) at x = 0, z = 3.5
    this.createBarricade(0, 1.4, -3.5, 2.0, 2.8, 0.3, barTex, 'Вход на Плент A (Bomb A Entrance)');
    this.createBarricade(0, 1.4, 3.5, 2.0, 2.8, 0.3, barTex, 'Вход на Плент B (Bomb B Entrance)');

    // East Partition at x = 8 with doorways
    this.addWall(8, 1.8, -8.5, 0.4, 3.6, 11, wallMat);
    this.addWall(8, 1.8, 8.5, 0.4, 3.6, 11, wallMat);
    this.createBarricade(8, 1.4, 0, 0.3, 2.8, 2.0, barTex, 'Дверь в Оружейную (Armory)');

    // 4. Bomb Sites A & B (East wings, far from player spawn!)
    this.createBombSite('A', 13, 0, -8, hazardTex); // Bomb A in northeast
    this.createBombSite('B', 13, 0, 8, hazardTex);  // Bomb B in southeast

    // 5. Tactical Cover Props (Safe distances from spawn!)
    this.createPropBox(-3, 0.6, -8, 2, 1.2, 1.2, 0x37474F); // Crates in North room
    this.createPropBox(-3, 0.6, 8, 2, 1.2, 1.2, 0x455A64);  // Crates in South room
    this.createPropBox(13, 0.7, -3, 1.6, 1.4, 1.6, 0x263238);
    this.createPropBox(13, 0.7, 3, 1.6, 1.4, 1.6, 0x263238);

    // 6. Lighting
    this.initLighting();
  }

  addWall(x, y, z, w, h, d, mat) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    wall.position.set(x, y, z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    this.scene.add(wall);

    const box = new THREE.Box3().setFromObject(wall);
    this.colliders.push(box);
  }

  createBarricade(x, y, z, w, h, d, tex, name) {
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    this.scene.add(mesh);

    const box = new THREE.Box3().setFromObject(mesh);
    const barricadeObj = {
      id: 'bar_' + Math.random(),
      name,
      mesh,
      box,
      hp: 100,
      destroyed: false
    };

    this.barricades.push(barricadeObj);
    this.colliders.push(box);
  }

  createBombSite(letter, x, y, z, hazardTex) {
    const bombGroup = new THREE.Group();

    // Base suitcase
    const caseMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3, metalness: 0.8 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 0.9), caseMat);
    body.position.y = 0.3;
    bombGroup.add(body);

    // Hazard lid
    const lidMat = new THREE.MeshStandardMaterial({ map: hazardTex });
    const lid = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.1, 0.85), lidMat);
    lid.position.y = 0.65;
    bombGroup.add(lid);

    // Digital timer
    const screenMat = new THREE.MeshBasicMaterial({ color: 0xFF1744 });
    const screen = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, 0.02), screenMat);
    screen.position.set(0, 0.72, 0.2);
    bombGroup.add(screen);

    // Red LED
    const redLight = new THREE.PointLight(0xFF1744, 2, 4);
    redLight.position.set(0, 0.8, 0.2);
    bombGroup.add(redLight);

    bombGroup.position.set(x, y, z);
    this.scene.add(bombGroup);

    const siteObj = {
      id: letter,
      x, y, z,
      radius: 2.8,
      defused: false,
      group: bombGroup,
      light: redLight
    };

    this.bombSites.push(siteObj);
    this.colliders.push(new THREE.Box3().setFromObject(body));
  }

  createPropBox(x, y, z, w, h, d, color) {
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.3 });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    this.colliders.push(new THREE.Box3().setFromObject(mesh));
  }

  initLighting() {
    this.ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.6);
    this.scene.add(this.ambientLight);

    // Overhead ceiling lamps in each zone
    const lightPositions = [
      [-12, 3.2, 0],   // Spawn Room
      [0, 3.2, 0],     // Corridor
      [0, 3.2, -8],    // North Room
      [0, 3.2, 8],     // South Room
      [12, 3.2, -8],   // Bomb A
      [12, 3.2, 8]     // Bomb B
    ];

    lightPositions.forEach(([lx, ly, lz]) => {
      const pl = new THREE.PointLight(0xFFF8E1, 1.4, 18);
      pl.position.set(lx, ly, lz);
      this.scene.add(pl);
      this.lights.push(pl);
    });
  }

  setBlindMode(isBlind) {
    if (isBlind) {
      this.ambientLight.intensity = 0.02;
      this.lights.forEach(l => l.intensity = 0);
    } else {
      this.ambientLight.intensity = 0.6;
      this.lights.forEach(l => l.intensity = 1.4);
    }
  }

  damageBarricade(barricade, amount) {
    if (barricade.destroyed) return false;
    barricade.hp -= amount;
    if (barricade.hp <= 0) {
      barricade.destroyed = true;
      this.scene.remove(barricade.mesh);
      const idx = this.colliders.indexOf(barricade.box);
      if (idx !== -1) this.colliders.splice(idx, 1);
      return true;
    }
    return false;
  }

  // Precise 2D collision check with player radius
  checkCollision(pos, radius = 0.35) {
    for (const c of this.colliders) {
      if (
        pos.x + radius > c.min.x &&
        pos.x - radius < c.max.x &&
        pos.z + radius > c.min.z &&
        pos.z - radius < c.max.z
      ) {
        // Only collide if height overlaps human standing/crouching range
        if (c.max.y > 0.4 && c.min.y < 2.0) {
          return true;
        }
      }
    }
    return false;
  }
}
