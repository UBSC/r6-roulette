import * as THREE from 'three';
import { TextureFactory } from './Textures.js';

// Multi-Floor Tactical CQB Map (Floor 1 & Floor 2)
// Features:
// - Two full floors (Ground Floor 1F @ Y=0, Upper Floor 2F @ Y=3.6m)
// - Walkable 3D Staircase with steps and railings connecting 1F and 2F
// - Drop-down Hatch (Люк) connecting 2F to 1F
// - Vertical Site Distribution: Bomb Site B on 1F, Bomb Site A on 2F
// - Distinct Atmospheric Lighting per room (Cyber-cyan server room, Amber hazard vault, Halogen office)
// - Realistic PBR Normal-mapped surfaces, baseboards, doors, ducts, and themed props

export class ProceduralMap3D {
  constructor(scene) {
    this.scene = scene;
    this.colliders = [];
    this.barricades = [];
    this.bombSites = [];
    this.lights = [];

    // Building Dimensions
    this.cols = 4;
    this.rows = 3;
    this.cellW = 8.5; // meters per room
    this.cellD = 8.5;
    this.floorH = 3.6; // height per floor (Total height: 7.2m for 2 floors!)
    this.totalW = this.cols * this.cellW; // 34m
    this.totalD = this.rows * this.cellD; // 25.5m
    this.startX = -this.totalW / 2;
    this.startZ = -this.totalD / 2;

    // Staircase parameters (in Col 1, Row 1)
    this.stairRoomC = 1;
    this.stairRoomR = 1;
    this.stairX = this.startX + this.stairRoomC * this.cellW + this.cellW / 2;
    this.stairZStart = this.startZ + this.stairRoomR * this.cellD + 1.2;
    this.stairZEnd = this.startZ + (this.stairRoomR + 1) * this.cellD - 1.2;
    this.stairWidth = 2.4;

    this.initMaterials();
    this.buildMap();
  }

  initMaterials() {
    this.woodFloorMat = TextureFactory.createWoodFloorMaterial();
    this.concreteFloorMat = TextureFactory.createConcreteFloorMaterial();
    this.wallMat = TextureFactory.createWallMaterial('SECTOR // OPERATIONAL CQB');
    this.wallSectorAMat = TextureFactory.createWallMaterial('SITE [A] // 2F EXECUTIVE');
    this.wallSectorBMat = TextureFactory.createWallMaterial('SITE [B] // 1F VAULT');
    this.reinforcedWallMat = TextureFactory.createReinforcedWallMaterial();
    this.ceilingMat = TextureFactory.createCeilingMaterial();
    this.barricadeMat = TextureFactory.createBarricadeMaterial();
    this.serverRackMat = TextureFactory.createServerRackMaterial();

    this.trimMat = new THREE.MeshStandardMaterial({ color: 0x151921, roughness: 0.6, metalness: 0.4 });
    this.doorFrameMat = new THREE.MeshStandardMaterial({ color: 0x1E2430, roughness: 0.5, metalness: 0.6 });
    this.pillarMat = new THREE.MeshStandardMaterial({ color: 0x2A303C, roughness: 0.8, metalness: 0.2 });
    this.metalDuctMat = new THREE.MeshStandardMaterial({ color: 0x8892A0, roughness: 0.35, metalness: 0.85 });
    this.pipeYellowMat = new THREE.MeshStandardMaterial({ color: 0xF59E0B, roughness: 0.4, metalness: 0.6 });
    this.pipeRedMat = new THREE.MeshStandardMaterial({ color: 0xDC2626, roughness: 0.4, metalness: 0.6 });
    this.crateMat = new THREE.MeshStandardMaterial({ color: 0x3E4B3E, roughness: 0.7, metalness: 0.2 });
    this.deskMat = new THREE.MeshStandardMaterial({ color: 0x252C37, roughness: 0.5, metalness: 0.3 });
    this.monitorScreenMat = new THREE.MeshBasicMaterial({ color: 0x00F0FF });
    this.stairStepMat = new THREE.MeshStandardMaterial({ color: 0x1E2530, roughness: 0.4, metalness: 0.8 });
    this.railingMat = new THREE.MeshStandardMaterial({ color: 0xF59E0B, roughness: 0.3, metalness: 0.9 });
  }

  buildMap() {
    const minX = this.startX;
    const maxX = this.startX + this.totalW;
    const minZ = this.startZ;
    const maxZ = this.startZ + this.totalD;

    // 1. FLOOR 1 (Ground Floor Y=0)
    const floor1Mesh = new THREE.Mesh(new THREE.PlaneGeometry(this.totalW + 2, this.totalD + 2), this.woodFloorMat);
    floor1Mesh.rotation.x = -Math.PI / 2;
    floor1Mesh.receiveShadow = true;
    this.scene.add(floor1Mesh);

    // Concrete pad on 1F East Vault (Bomb B)
    const vaultPad = new THREE.Mesh(new THREE.PlaneGeometry(this.cellW * 1.5, this.cellD), this.concreteFloorMat);
    vaultPad.rotation.x = -Math.PI / 2;
    vaultPad.position.set(minX + 3 * this.cellW + this.cellW / 2, 0.005, minZ + 2 * this.cellD + this.cellD / 2);
    vaultPad.receiveShadow = true;
    this.scene.add(vaultPad);

    // 2. FLOOR 2 SLAB (Y = 3.6m) with cut-outs for Stairwell and Drop Hatch
    this.buildFloor2Slab(minX, minZ);

    // 3. ROOF / TOP CEILING (Y = 7.2m)
    const roofMesh = new THREE.Mesh(new THREE.PlaneGeometry(this.totalW + 2, this.totalD + 2), this.ceilingMat);
    roofMesh.rotation.x = Math.PI / 2;
    roofMesh.position.y = this.floorH * 2;
    this.scene.add(roofMesh);

    // 4. OUTER PERIMETER WALLS (Spanning both floors: height = 7.2m!)
    const totalH = this.floorH * 2;
    this.addArchitecturalWall(minX, totalH / 2, (minZ + maxZ) / 2, 0.45, totalH, this.totalD, this.wallMat); // West
    this.addArchitecturalWall(maxX, totalH / 2, (minZ + maxZ) / 2, 0.45, totalH, this.reinforcedWallMat); // East
    this.addArchitecturalWall((minX + maxX) / 2, totalH / 2, minZ, this.totalW, totalH, 0.45, this.wallMat); // North
    this.addArchitecturalWall((minX + maxX) / 2, totalH / 2, maxZ, this.totalW, totalH, 0.45, this.wallMat); // South

    // 5. INTERIOR WALLS FOR FLOOR 1 (Y: 0 -> 3.6m)
    this.buildInteriorWalls(0, false);

    // 6. INTERIOR WALLS FOR FLOOR 2 (Y: 3.6 -> 7.2m)
    this.buildInteriorWalls(this.floorH, true);

    // 7. BUILD 3D WALKABLE STAIRCASE (1F -> 2F in Col 1, Row 1)
    this.buildStaircase();

    // 8. BOMB SITES:
    // Bomb B on Floor 1 (Ground Vault: Col 3, Row 2)
    const bombBPos = new THREE.Vector3(minX + 3 * this.cellW + this.cellW / 2, 0, minZ + 2 * this.cellD + this.cellD / 2);
    this.createBombSite('B', bombBPos.x, 0, bombBPos.z, 0xFF3D00, '1F VAULT // BOMB B');

    // Bomb A on Floor 2 (Upper Executive Office: Col 3, Row 0)
    const bombAPos = new THREE.Vector3(minX + 3 * this.cellW + this.cellW / 2, this.floorH, minZ + 0 * this.cellD + this.cellD / 2);
    this.createBombSite('A', bombAPos.x, this.floorH, bombAPos.z, 0x00E5FF, '2F EXECUTIVE // BOMB A');

    // 9. THEMED PROPS & COVER ACROSS BOTH FLOORS
    this.populateMultiFloorProps(minX, minZ);

    // 10. INDUSTRIAL & MOOD LIGHTING
    this.initMultiFloorLighting(minX, minZ);
  }

  // Floor 2 Slab with Stairwell Cut-out & Hatch
  buildFloor2Slab(minX, minZ) {
    // Generate floor 2 slabs for all rooms, leaving stairwell opening in room (1, 1) and hatch in (2, 0)
    for (let c = 0; c < this.cols; c++) {
      for (let r = 0; r < this.rows; r++) {
        const rcx = minX + c * this.cellW + this.cellW / 2;
        const rcz = minZ + r * this.cellD + this.cellD / 2;

        if (c === this.stairRoomC && r === this.stairRoomR) {
          // Stairwell room: split into side borders around opening
          const borderW = (this.cellW - this.stairWidth - 0.4) / 2;
          const leftSlab = new THREE.Mesh(new THREE.BoxGeometry(borderW, 0.25, this.cellD), this.woodFloorMat);
          leftSlab.position.set(rcx - this.cellW / 2 + borderW / 2, this.floorH, rcz);
          this.scene.add(leftSlab);

          const rightSlab = new THREE.Mesh(new THREE.BoxGeometry(borderW, 0.25, this.cellD), this.woodFloorMat);
          rightSlab.position.set(rcx + this.cellW / 2 - borderW / 2, this.floorH, rcz);
          this.scene.add(rightSlab);

          // Add stairwell floor railing
          const railA = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.0, this.cellD - 1.0), this.railingMat);
          railA.position.set(rcx - this.stairWidth / 2 - 0.1, this.floorH + 0.5, rcz);
          this.scene.add(railA);

          const railB = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.0, this.cellD - 1.0), this.railingMat);
          railB.position.set(rcx + this.stairWidth / 2 + 0.1, this.floorH + 0.5, rcz);
          this.scene.add(railB);
          continue;
        }

        // Standard 2F room slab
        const slab = new THREE.Mesh(new THREE.BoxGeometry(this.cellW, 0.25, this.cellD), this.woodFloorMat);
        slab.position.set(rcx, this.floorH, rcz);
        slab.receiveShadow = true;
        this.scene.add(slab);
      }
    }
  }

  // Build Walkable 3D Staircase
  buildStaircase() {
    const numSteps = 16;
    const totalRise = this.floorH;
    const stepRise = totalRise / numSteps;
    const totalRun = this.stairZEnd - this.stairZStart;
    const stepRun = totalRun / numSteps;

    this.stairGroup = new THREE.Group();

    for (let i = 0; i < numSteps; i++) {
      const stepY = i * stepRise + stepRise / 2;
      const stepZ = this.stairZStart + i * stepRun + stepRun / 2;

      const step = new THREE.Mesh(
        new THREE.BoxGeometry(this.stairWidth, stepRise, stepRun + 0.04),
        this.stairStepMat
      );
      step.position.set(this.stairX, stepY, stepZ);
      step.receiveShadow = true;
      step.castShadow = true;
      this.scene.add(step);
    }

    // Yellow tactical stair handrails
    const railGeom = new THREE.BoxGeometry(0.06, 0.06, totalRun + 0.6);
    const railL = new THREE.Mesh(railGeom, this.railingMat);
    railL.position.set(this.stairX - this.stairWidth / 2 + 0.05, totalRise / 2 + 0.9, (this.stairZStart + this.stairZEnd) / 2);
    railL.rotation.x = Math.atan2(totalRise, totalRun);
    this.scene.add(railL);

    const railR = new THREE.Mesh(railGeom, this.railingMat);
    railR.position.set(this.stairX + this.stairWidth / 2 - 0.05, totalRise / 2 + 0.9, (this.stairZStart + this.stairZEnd) / 2);
    railR.rotation.x = Math.atan2(totalRise, totalRun);
    this.scene.add(railR);
  }

  // Interior Walls for a specific floor level
  buildInteriorWalls(baseY, isUpperFloor) {
    const minX = this.startX;
    const minZ = this.startZ;
    const wallH = this.floorH;
    const wallCenterY = baseY + wallH / 2;

    // Vertical interior walls
    for (let c = 0; c < this.cols - 1; c++) {
      const wallX = minX + (c + 1) * this.cellW;
      for (let r = 0; r < this.rows; r++) {
        const roomCenterZ = minZ + r * this.cellD + this.cellD / 2;
        // Keep doorways open
        const hasDoor = Math.random() < 0.65 || (c === 0 && r === 1 && !isUpperFloor);
        const chosenMat = (c === 2 && r === 0 && isUpperFloor) ? this.wallSectorAMat :
                          (c === 2 && r === 2 && !isUpperFloor) ? this.wallSectorBMat :
                          (Math.random() < 0.3 ? this.reinforcedWallMat : this.wallMat);

        if (hasDoor) {
          const doorW = 2.4;
          const doorH = 2.7;
          const halfSeg = (this.cellD - doorW) / 2;

          this.addArchitecturalWall(wallX, wallCenterY, roomCenterZ - this.cellD / 2 + halfSeg / 2, 0.35, wallH, halfSeg, chosenMat);
          this.addArchitecturalWall(wallX, wallCenterY, roomCenterZ + this.cellD / 2 - halfSeg / 2, 0.35, wallH, halfSeg, chosenMat);

          // Top Header Lintel
          this.addWallBlock(wallX, baseY + doorH + (wallH - doorH) / 2, roomCenterZ, 0.35, wallH - doorH, doorW, chosenMat);
          this.createDoorFrame(wallX, baseY, roomCenterZ, doorW, doorH, false);

          // Barricades on some doorways
          if (Math.random() < 0.45 && !(c === 0 && r === 1 && !isUpperFloor)) {
            this.createLayeredBarricade(wallX, baseY, roomCenterZ, doorW, doorH, false);
          }
        } else {
          this.addArchitecturalWall(wallX, wallCenterY, roomCenterZ, 0.35, wallH, this.cellD, chosenMat);
        }
      }
    }

    // Horizontal interior walls
    for (let r = 0; r < this.rows - 1; r++) {
      const wallZ = minZ + (r + 1) * this.cellD;
      for (let c = 0; c < this.cols; c++) {
        const roomCenterX = minX + c * this.cellW + this.cellW / 2;
        const hasDoor = Math.random() < 0.6;
        const chosenMat = Math.random() < 0.35 ? this.reinforcedWallMat : this.wallMat;

        if (hasDoor) {
          const doorW = 2.4;
          const doorH = 2.7;
          const halfSeg = (this.cellW - doorW) / 2;

          this.addArchitecturalWall(roomCenterX - this.cellW / 2 + halfSeg / 2, wallCenterY, wallZ, halfSeg, wallH, 0.35, chosenMat);
          this.addArchitecturalWall(roomCenterX + this.cellW / 2 - halfSeg / 2, wallCenterY, wallZ, halfSeg, wallH, 0.35, chosenMat);

          this.addWallBlock(roomCenterX, baseY + doorH + (wallH - doorH) / 2, wallZ, doorW, wallH - doorH, 0.35, chosenMat);
          this.createDoorFrame(roomCenterX, baseY, wallZ, doorW, doorH, true);

          if (Math.random() < 0.45) {
            this.createLayeredBarricade(roomCenterX, baseY, wallZ, doorW, doorH, true);
          }
        } else {
          this.addArchitecturalWall(roomCenterX, wallCenterY, wallZ, this.cellW, wallH, 0.35, chosenMat);
        }
      }
    }
  }

  createDoorFrame(x, baseY, z, width, height, isHorizontal) {
    const frameThick = 0.08;
    const frameDepth = 0.42;

    if (isHorizontal) {
      const leftPost = new THREE.Mesh(new THREE.BoxGeometry(frameThick, height, frameDepth), this.doorFrameMat);
      leftPost.position.set(x - width / 2, baseY + height / 2, z);
      this.scene.add(leftPost);

      const rightPost = new THREE.Mesh(new THREE.BoxGeometry(frameThick, height, frameDepth), this.doorFrameMat);
      rightPost.position.set(x + width / 2, baseY + height / 2, z);
      this.scene.add(rightPost);

      const lintel = new THREE.Mesh(new THREE.BoxGeometry(width + frameThick * 2, frameThick, frameDepth), this.doorFrameMat);
      lintel.position.set(x, baseY + height, z);
      this.scene.add(lintel);
    } else {
      const postA = new THREE.Mesh(new THREE.BoxGeometry(frameDepth, height, frameThick), this.doorFrameMat);
      postA.position.set(x, baseY + height / 2, z - width / 2);
      this.scene.add(postA);

      const postB = new THREE.Mesh(new THREE.BoxGeometry(frameDepth, height, frameThick), this.doorFrameMat);
      postB.position.set(x, baseY + height / 2, z + width / 2);
      this.scene.add(postB);

      const lintel = new THREE.Mesh(new THREE.BoxGeometry(frameDepth, frameThick, width + frameThick * 2), this.doorFrameMat);
      lintel.position.set(x, baseY + height, z);
      this.scene.add(lintel);
    }
  }

  createLayeredBarricade(x, baseY, z, width, height, isHorizontal) {
    const group = new THREE.Group();
    const plankCount = 6;
    const plankH = (height - 0.2) / plankCount;
    const plankDepth = 0.09;

    for (let i = 0; i < plankCount; i++) {
      const py = 0.15 + i * plankH + plankH / 2;
      const w = isHorizontal ? width - 0.1 : plankDepth;
      const d = isHorizontal ? plankDepth : width - 0.1;

      const plank = new THREE.Mesh(
        new THREE.BoxGeometry(w, plankH - 0.02, d),
        this.barricadeMat
      );
      plank.position.set(0, py, 0);
      group.add(plank);
    }

    group.position.set(x, baseY, z);
    this.scene.add(group);

    const colliderBox = new THREE.Box3().setFromObject(group);
    this.colliders.push(colliderBox);

    this.barricades.push({
      id: 'bar_' + Math.random(),
      mesh: group,
      box: colliderBox,
      hp: 100,
      destroyed: false
    });
  }

  // Themed Props across both floors
  populateMultiFloorProps(minX, minZ) {
    // 1F Props:
    // Server Room (Col 2, Row 1, 1F)
    const srv1X = minX + 2 * this.cellW + this.cellW / 2;
    const srv1Z = minZ + 1 * this.cellD + this.cellD / 2;
    this.createServerRackCluster(srv1X, 0, srv1Z);

    // Vault Cargo Crates (Col 3, Row 2, 1F near Bomb B)
    const vltX = minX + 3 * this.cellW + this.cellW / 2;
    const vltZ = minZ + 2 * this.cellD + this.cellD / 2;
    this.createFortifiedPallets(vltX - 1.8, 0, vltZ + 1.6);
    this.createFortifiedPallets(vltX + 1.8, 0, vltZ - 1.6);

    // 2F Props:
    // Executive Armory & Desks (Col 3, Row 0, 2F near Bomb A)
    const armX = minX + 3 * this.cellW + this.cellW / 2;
    const armZ = minZ + 0 * this.cellD + this.cellD / 2;
    this.createOfficeDesk(armX - 1.8, this.floorH, armZ + 1.5, Math.PI / 2);
    this.createFortifiedPallets(armX + 1.8, this.floorH, armZ - 1.5);

    // 2F Server Cluster (Col 0, Row 2, 2F)
    const srv2X = minX + 0 * this.cellW + this.cellW / 2;
    const srv2Z = minZ + 2 * this.cellD + this.cellD / 2;
    this.createServerRackCluster(srv2X, this.floorH, srv2Z);
  }

  createServerRackCluster(cx, baseY, cz) {
    for (let i = -1; i <= 1; i++) {
      const rack = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.4, 0.9), this.serverRackMat);
      rack.position.set(cx + i * 1.3, baseY + 1.2, cz);
      rack.castShadow = true;
      this.scene.add(rack);
      this.colliders.push(new THREE.Box3().setFromObject(rack));
    }
  }

  createFortifiedPallets(x, baseY, z) {
    const pallet = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.2, 1.4), this.woodFloorMat);
    pallet.position.set(x, baseY + 0.1, z);
    this.scene.add(pallet);

    const crateA = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 0.6), this.crateMat);
    crateA.position.set(x, baseY + 0.6, z - 0.3);
    crateA.castShadow = true;
    this.scene.add(crateA);

    const crateB = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.7, 0.5), this.crateMat);
    crateB.position.set(x + 0.1, baseY + 0.55, z + 0.35);
    crateB.castShadow = true;
    this.scene.add(crateB);

    this.colliders.push(new THREE.Box3().setFromObject(crateA));
    this.colliders.push(new THREE.Box3().setFromObject(crateB));
  }

  createOfficeDesk(x, baseY, z, rotY = 0) {
    const deskGroup = new THREE.Group();
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 0.9), this.deskMat);
    top.position.y = 0.78;
    deskGroup.add(top);

    const legGeom = new THREE.BoxGeometry(0.08, 0.74, 0.8);
    const legL = new THREE.Mesh(legGeom, this.trimMat);
    legL.position.set(-0.8, 0.37, 0);
    deskGroup.add(legL);

    const legR = new THREE.Mesh(legGeom, this.trimMat);
    legR.position.set(0.8, 0.37, 0);
    deskGroup.add(legR);

    const monScreen = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.38, 0.04), this.monitorScreenMat);
    monScreen.position.set(0, 1.08, 0);
    deskGroup.add(monScreen);

    deskGroup.position.set(x, baseY, z);
    deskGroup.rotation.y = rotY;
    this.scene.add(deskGroup);

    this.colliders.push(new THREE.Box3().setFromObject(top));
  }

  addArchitecturalWall(x, y, z, w, h, d, mat) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    wall.position.set(x, y, z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    this.scene.add(wall);
    this.colliders.push(new THREE.Box3().setFromObject(wall));
  }

  addWallBlock(x, y, z, w, h, d, mat) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    wall.position.set(x, y, z);
    wall.castShadow = true;
    this.scene.add(wall);
    this.colliders.push(new THREE.Box3().setFromObject(wall));
  }

  createBombSite(letter, x, y, z, lightColor = 0xFF1744, label = '') {
    const bombGroup = new THREE.Group();

    const caseMat = new THREE.MeshStandardMaterial({ color: 0x1B232E, roughness: 0.35, metalness: 0.75 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.65, 0.95), caseMat);
    body.position.y = 0.325;
    bombGroup.add(body);

    const hazardTex = TextureFactory.createHazardTexture();
    const lidMat = new THREE.MeshStandardMaterial({ map: hazardTex, roughness: 0.4 });
    const lid = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.12, 0.9), lidMat);
    lid.position.y = 0.7;
    bombGroup.add(lid);

    const screenMat = new THREE.MeshBasicMaterial({ color: lightColor });
    const screen = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.18, 0.03), screenMat);
    screen.position.set(0, 0.78, 0.22);
    bombGroup.add(screen);

    const bombLight = new THREE.PointLight(lightColor, 2.8, 8);
    bombLight.position.set(0, 0.9, 0.22);
    bombGroup.add(bombLight);

    const tapeMat = new THREE.MeshStandardMaterial({ map: hazardTex, roughness: 0.6 });
    const tape = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), tapeMat);
    tape.rotation.x = -Math.PI / 2;
    tape.position.set(0, 0.008, 0);
    bombGroup.add(tape);

    bombGroup.position.set(x, y, z);
    this.scene.add(bombGroup);

    const siteObj = {
      id: letter,
      label,
      x, y, z,
      floor: y > 1 ? 2 : 1,
      radius: 3.2,
      defused: false,
      group: bombGroup,
      light: bombLight
    };

    this.bombSites.push(siteObj);
    this.colliders.push(new THREE.Box3().setFromObject(body));
  }

  // Dynamic Lighting across both floors (Varied atmospheric room lighting)
  initMultiFloorLighting(minX, minZ) {
    // 1. Hemisphere bounce light: soft daylight from above, soft grey floor bounce
    this.hemiLight = new THREE.HemisphereLight(0xF8FAFC, 0x64748B, 0.75);
    this.scene.add(this.hemiLight);

    // 2. Global ambient light for baseline CQB readability
    this.ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.55);
    this.scene.add(this.ambientLight);

    // Floor 1 Lights (Y = 3.2m)
    for (let c = 0; c < this.cols; c++) {
      for (let r = 0; r < this.rows; r++) {
        const lx = minX + c * this.cellW + this.cellW / 2;
        const lz = minZ + r * this.cellD + this.cellD / 2;

        let col = 0xFFFBEB; // Warm daylight office
        let intensity = 3.6;

        // Server Room (c=2, r=1): Cyber-cyan neon (bright & vibrant)
        if (c === 2 && r === 1) {
          col = 0x00F0FF;
          intensity = 4.8;
        }
        // Bomb B Vault (c=3, r=2): Amber emergency hazard beacon (dimmer/moody)
        else if (c === 3 && r === 2) {
          col = 0xFF5722;
          intensity = 2.4;
        }
        // Stairwell (c=1, r=1): Warm gold spotlight
        else if (c === this.stairRoomC && r === this.stairRoomR) {
          col = 0xFBBF24;
          intensity = 4.2;
        }
        // Dark maintenance storage (c=0, r=2): Dim auxiliary light
        else if (c === 0 && r === 2) {
          col = 0x94A3B8;
          intensity = 1.9;
        }
        // Main Reception Hall (c=1, r=0): Bright inviting warm light
        else if (c === 1 && r === 0) {
          col = 0xFFF7ED;
          intensity = 4.4;
        }

        const pl1 = new THREE.PointLight(col, intensity, 22);
        pl1.position.set(lx, 3.2, lz);
        pl1.decay = 1.0;
        pl1.baseIntensity = intensity;
        this.scene.add(pl1);
        this.lights.push(pl1);

        // Floor 2 Lights (Y = 6.8m)
        let col2 = 0xF8FAFC;
        let int2 = 3.8;

        // Bomb A Executive Office (c=3, r=0): Sky-blue halogen executive lighting (bright!)
        if (c === 3 && r === 0) {
          col2 = 0x38BDF8;
          int2 = 5.2;
        }
        // Armory cache (c=0, r=0): Clean crisp fluorescent white (bright!)
        else if (c === 0 && r === 0) {
          col2 = 0xF1F5F9;
          int2 = 4.6;
        }
        // Drop Hatch Corridor (c=2, r=0): Atmospheric industrial dim steel blue
        else if (c === 2 && r === 0) {
          col2 = 0x64748B;
          int2 = 2.2;
        }
        // Upper back corridor (c=1, r=2): Soft dimmer transition
        else if (c === 1 && r === 2) {
          col2 = 0xA0AEC0;
          int2 = 2.4;
        }

        const pl2 = new THREE.PointLight(col2, int2, 22);
        pl2.position.set(lx, this.floorH + 3.2, lz);
        pl2.decay = 1.0;
        pl2.baseIntensity = int2;
        this.scene.add(pl2);
        this.lights.push(pl2);
      }
    }
  }

  // Calculate current floor level / stair climb height for player
  getFloorHeight(pos) {
    // Check if player is inside the staircase bounding box
    const inStairX = Math.abs(pos.x - this.stairX) < (this.stairWidth / 2 + 0.3);
    const inStairZ = pos.z >= (this.stairZStart - 0.4) && pos.z <= (this.stairZEnd + 0.4);

    if (inStairX && inStairZ) {
      // Linear slope climbing up along Z
      const t = THREE.MathUtils.clamp((pos.z - this.stairZStart) / (this.stairZEnd - this.stairZStart), 0.0, 1.0);
      return t * this.floorH;
    }

    // If player is on upper level (Y near 3.6m or above) and past the stairs
    if (pos.y > (this.floorH - 0.8)) {
      // Check if dropped down the hatch in Room (2, 0)
      const hatchX = this.startX + 2 * this.cellW + this.cellW / 2;
      const hatchZ = this.startZ + 0 * this.cellD + this.cellD / 2;
      const distToHatch = Math.hypot(pos.x - hatchX, pos.z - hatchZ);
      if (distToHatch < 1.0) {
        return 0; // Drop through hatch to 1F!
      }
      return this.floorH;
    }

    return 0;
  }

  setBlindMode(isBlind) {
    if (isBlind) {
      if (this.ambientLight) this.ambientLight.intensity = 0.02;
      if (this.hemiLight) this.hemiLight.intensity = 0.02;
      this.lights.forEach(l => l.intensity = 0);
    } else {
      if (this.ambientLight) this.ambientLight.intensity = 0.55;
      if (this.hemiLight) this.hemiLight.intensity = 0.75;
      this.lights.forEach(l => {
        l.intensity = l.baseIntensity || 3.5;
      });
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

  checkCollision(pos, radius = 0.35) {
    for (const c of this.colliders) {
      if (
        pos.x + radius > c.min.x &&
        pos.x - radius < c.max.x &&
        pos.z + radius > c.min.z &&
        pos.z - radius < c.max.z
      ) {
        // Vertical check relative to current player height
        if (pos.y > c.min.y - 0.3 && pos.y < c.max.y + 0.3) {
          return true;
        }
      }
    }
    return false;
  }

  getPlayerSpawn() {
    return new THREE.Vector3(
      this.startX + this.cellW / 2,
      1.65,
      this.startZ + 1 * this.cellD + this.cellD / 2
    );
  }

  getEnemySpawns() {
    return [
      // 1F Vault Bomb B
      new THREE.Vector3(this.startX + 3 * this.cellW + this.cellW / 2, 0, this.startZ + 2 * this.cellD + this.cellD / 2),
      // 1F Server Room
      new THREE.Vector3(this.startX + 2 * this.cellW + this.cellW / 2, 0, this.startZ + 1 * this.cellD + this.cellD / 2),
      // 2F Executive Bomb A
      new THREE.Vector3(this.startX + 3 * this.cellW + this.cellW / 2, this.floorH, this.startZ + 0 * this.cellD + this.cellD / 2),
      // 2F Stairwell Landing
      new THREE.Vector3(this.startX + 1 * this.cellW + this.cellW / 2, this.floorH, this.startZ + 2 * this.cellD + this.cellD / 2),
      // 2F West Armory
      new THREE.Vector3(this.startX + 0 * this.cellW + this.cellW / 2, this.floorH, this.startZ + 0 * this.cellD + this.cellD / 2)
    ];
  }
}
