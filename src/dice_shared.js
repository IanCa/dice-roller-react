import {diceTypes} from "./dice_types.js"
import * as CANNON from "cannon-es";
// import {debugMode, diceMaterial, scene, world} from "./globals.js";
import * as THREE from "three";

function createPhysicsDebugMesh(scene, body, color = 0xff0000) {
    const shape = body.shapes[0];
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const edges = new Set();

    shape.faces.forEach(face => {
        for (let i = 0; i < face.length; i++) {
            const a = face[i];
            const b = face[(i + 1) % face.length];
            const key = [Math.min(a, b), Math.max(a, b)].join('-');
            if (!edges.has(key)) {
                edges.add(key);
                const va = shape.vertices[a];
                const vb = shape.vertices[b];
                vertices.push(va.x, va.y, va.z, vb.x, vb.y, vb.z);
            }
        }
    });

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    const material = new THREE.LineBasicMaterial({color});
    const mesh = new THREE.LineSegments(geometry, material);
    scene.add(mesh);
    return mesh;
}

function randomQuaternion() {
    const u1 = Math.random();
    const u2 = Math.random();
    const u3 = Math.random();
    const sqrt1MinusU1 = Math.sqrt(1 - u1);
    const sqrtU1 = Math.sqrt(u1);
    return new CANNON.Quaternion(
        sqrt1MinusU1 * Math.sin(2 * Math.PI * u2),
        sqrt1MinusU1 * Math.cos(2 * Math.PI * u2),
        sqrtU1 * Math.sin(2 * Math.PI * u3),
        sqrtU1 * Math.cos(2 * Math.PI * u3)
    );
}

function setupDiePhysics(body) {
    // Reset orientation
    body.quaternion.copy(randomQuaternion());

    // Spin
    const spinAxis = new CANNON.Vec3(
        (Math.random() - 0.5),
        (Math.random() - 0.5),
        (Math.random() - 0.5)
    ).unit();
    body.angularVelocity = spinAxis.scale((Math.random() * 20) + 5);

    // Motion
    const moveDir = new CANNON.Vec3(
        (Math.random() - 0.5),
        0,
        (Math.random() - 0.5)
    ).unit();
    body.velocity = moveDir.scale((Math.random() * 5) + 2);
    body.velocity.y = 2 + Math.random() * 2;

    body.wakeUp();
}

function setupWalls(scene, world, extraWidth = 0) {
    if (!world.walls) {
        world.walls = {
            bodies: [],
            meshes: []
        }
    }
    for (const body of world.walls.bodies) {
        world.removeBody(body);
    }
    for (const mesh of world.walls.meshes) {
        scene.remove(mesh);
        mesh.geometry.dispose();
        mesh.material.dispose();
    }

    // Reset tracking arrays
    world.walls.bodies = [];
    world.walls.meshes = [];

    const baseSize = 30;
    const boundarySize = baseSize + extraWidth; // Extend size if needed

    function createWall(pos, rot, size, skipVisual = false) {
        const shape = new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2));
        const body = new CANNON.Body({mass: 0, shape, position: pos});
        body.quaternion.setFromEuler(rot.x, rot.y, rot.z);
        world.addBody(body);
        world.walls.bodies.push(body);

        if (!skipVisual) {
            const geo = new THREE.BoxGeometry(size.x, size.y, size.z);
            const mat = new THREE.MeshStandardMaterial({color: 0x333333});
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.copy(pos);
            mesh.rotation.set(rot.x, rot.y, rot.z);
            scene.add(mesh);
            world.walls.meshes.push(mesh);
        }
    }

    createWall(new CANNON.Vec3(0, -0.5, 0), new CANNON.Vec3(0, 0, 0), {x: boundarySize, y: 1, z: boundarySize});
    createWall(new CANNON.Vec3(0, 10, 0), new CANNON.Vec3(0, 0, 0), {x: boundarySize, y: 1, z: boundarySize}, true);
    createWall(new CANNON.Vec3(-boundarySize / 2, 5, 0), new CANNON.Vec3(0, 0, 0), {x: 1, y: 10, z: boundarySize});
    createWall(new CANNON.Vec3(boundarySize / 2, 5, 0), new CANNON.Vec3(0, 0, 0), {x: 1, y: 10, z: boundarySize});
    createWall(new CANNON.Vec3(0, 5, -boundarySize / 2), new CANNON.Vec3(0, 0, 0), {x: boundarySize, y: 10, z: 1});
    createWall(new CANNON.Vec3(0, 5, boundarySize / 2), new CANNON.Vec3(0, 0, 0), {x: boundarySize, y: 10, z: 1}, true);
}

function spawnDie(x, y, z, type, scene, world, diceMaterial, debugMode) {
    const def = diceTypes[type];

    const mesh = new THREE.Mesh(def.geometry, def.material);
    scene.add(mesh);

    const body = new CANNON.Body({
        mass: 1,
        shape: def.shape,
        material: diceMaterial,
        allowSleep: false,
        position: new CANNON.Vec3(x, y, z)
    });

    body.angularDamping = 0.3;
    body.linearDamping = 0.3;
    setupDiePhysics(body);
    world.addBody(body);

    const debugMesh = createPhysicsDebugMesh(scene, body);
    debugMesh.scale.set(1.1, 1.1, 1.1);
    debugMesh.visible = debugMode;

    return {type,
        physics: {mesh, body, debugMesh, geometry: def.geometry},
        result: null}
}

function spawnDieSet(typeOrArray, count, zoneCenter, totalDice, scene, world, diceMaterial, debugMode=false) {
    const baseSpacing = 1.5;
    const spacing = baseSpacing * (1 + Math.log2(totalDice + 1) * 0.2);
    const dicePerRow = Math.ceil(Math.sqrt(count));

    const getType = typeof typeOrArray === 'string'
        ? () => typeOrArray
        : (i) => typeOrArray[i];

    const newDice = [];
    for (let i = 0; i < count; i++) {
        const row = Math.floor(i / dicePerRow);
        const col = i % dicePerRow;

        const localX = (col - (dicePerRow - 1) / 2) * spacing;
        const localZ = (row - (dicePerRow - 1) / 2) * spacing;

        const xPos = zoneCenter + localX + (Math.random() - 0.5) * 0.4;
        const yPos = 6 + Math.random() * 2;
        const zPos = localZ + (Math.random() - 0.5) * 0.4;

        newDice.push(spawnDie(xPos, yPos, zPos, getType(i), scene, world, diceMaterial, debugMode));
    }
    return newDice
}

export function createDiceSet(dice_counts, scene, world, diceMaterial, debugMode) {
    actuallyResetDice(scene, world);
    const dice_only = Object.fromEntries(
        Object.entries(dice_counts).filter(([key]) => key.startsWith('d'))
    );
    const totalDice = Object.values(dice_only).reduce((sum, n) => sum + n, 0);

    const spawnScale = totalDice <= 40 ? 1 : Math.log2(totalDice / 20 + 1) + 1.5;
    const spawnRange = 12 * spawnScale;
    let wallExtra = Math.max(0, Math.floor((spawnScale - 1) * 20));
    if (totalDice > 1000) {
        wallExtra = 1000;
    }

    setupWalls(scene, world, wallExtra);
    const all_new_dice = []
    if (totalDice > 40) {
        // Flatten all dice into a single array with type info
        const allDice = [];
        for (const [type, count] of Object.entries(dice_only)) {
            for (let i = 0; i < count; i++) {
                allDice.push(type);
            }
        }

        // Sort by die type size (assumes type is like "d4", "d6", etc.)
        allDice.sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1)));
        const newDice = spawnDieSet(allDice, allDice.length, 0, totalDice, scene, world, diceMaterial, debugMode);
        all_new_dice.push(...newDice);
    } else {
        // Normal behavior: spawn dice by type in separate zones
        const activeTypes = Object.keys(dice_only).filter(type => dice_counts[type] > 0);
        const typeSpacing = spawnRange / activeTypes.length;

        const typeZones = {};
        activeTypes.forEach((type, i) => {
            const zoneCenter = -spawnRange / 2 + typeSpacing * (i + 0.5);
            typeZones[type] = zoneCenter;
        });

        for (const type of activeTypes) {
            const count = dice_counts[type];
            const zoneCenter = typeZones[type];
            const newDice = spawnDieSet(type, count, zoneCenter, totalDice, scene, world, diceMaterial, debugMode);
            all_new_dice.push(...newDice);
        }
    }

    world.dice = all_new_dice;
}

function respawnDie(die) {
    die.physics.body.position.set(
        (Math.random() - 0.5) * 5,
        6 + Math.random() * 3,
        (Math.random() - 0.5) * 5
    );
    setupDiePhysics(die.physics.body);
}

export function detectDiceState(world) {
    let allStopped = true;

    let dice_results = Array(world.dice.length).fill(null);

    world.dice.forEach((d, i) => {
        if (d.physics.body.position.y < -10) {
            respawnDie(d);
            allStopped = false;
            return;
        }

        const velocity = d.physics.body.velocity.length();
        const angular = d.physics.body.angularVelocity.length();
        if (velocity > 0.05 || angular > 0.05) {
            dice_results[i] = d.result
        } else if (d.result === null) {
            dice_results[i] = [diceTypes[d.type].getTopFaceIndex(d.physics.body.quaternion, diceTypes[d.type].geometry) + 1, d.type, d.physics.body.position.x, d.physics.body.position.y, d.physics.body.position.z]
            d.result = dice_results[i]
        } else {
            dice_results[i] = d.result
        }
    });

    return {allStopped, dice_results};
}

export function actuallyResetDice(scene, world) {
    // Remove dice meshes and bodies
    world.dice.forEach(({physics}) => {
        scene.remove(physics.mesh);
        scene.remove(physics.debugMesh);
        world.removeBody(physics.body);
    });
}