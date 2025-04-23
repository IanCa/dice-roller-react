import * as THREE from 'three';
import * as CANNON from 'cannon-es';

import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {
    createNumberedD4AtlasTexture,
    createNumberedD4Geometry,
    createPhysicsD4Shape,
    getTopFaceIndexForD4
} from "./d4_code.js";

import {
    createNumberedAtlasTexture,
    createNumberedD8Geometry,
    createPhysicsD8Shape,
    getTopFaceIndex
} from "./d8_code.js";
import {
    createNumberedD6AtlasTexture,
    createNumberedD6Geometry,
    createPhysicsD6Shape,
    getTopFaceIndexForD6
} from "./d6_code.js";
import {
    createNumberedD10AtlasTexture,
    createNumberedD10Geometry,
    createPhysicsD10Shape,
    getTopFaceIndexForD10
} from "./d10_code.js";

import {
    createNumberedD12AtlasTexture,
    createNumberedD12Geometry,
    createPhysicsD12Shape,
    getTopFaceIndexForD12
} from "./d12_code.js";

import {
    createNumberedD20AtlasTexture,
    createNumberedD20Geometry,
    createPhysicsD20Shape,
    getTopFaceIndexForD20
} from "./d20_code.js";
import {
    DIE_COLORS
} from "./config.js"

const urlParams = new URLSearchParams(window.location.search);

const MAX_DICE = 1000
const D4_COUNT = parseInt(urlParams.get('d4')) || 0;
const D6_COUNT = parseInt(urlParams.get('d6')) || 0;
const D8_COUNT = parseInt(urlParams.get('d8')) || 0;
const D10_COUNT = parseInt(urlParams.get('d10')) || 0;
const D12_COUNT = parseInt(urlParams.get('d12')) || 0;
const D20_COUNT = parseInt(urlParams.get('d20')) || 0;
let ADD_COUNT = parseInt(urlParams.get('add')) || 0;
const dice_string = urlParams.get("dice") || ""


let diceTypeCounts = {
    d4: D4_COUNT,
    d6: D6_COUNT,
    d8: D8_COUNT,
    d10: D10_COUNT,
    d12: D12_COUNT,
    d20: D20_COUNT
};

tryLoadDiceParameter();

function tryLoadDiceParameter() {
    if (dice_string != "") {
        let loaded_dice = parseDndDiceNotation(dice_string);
        for (let key in diceTypeCounts) {
            if (key.startsWith("d")) {
                diceTypeCounts[key] = 0;
                ADD_COUNT = 0;
            }
        }

        for (let key in loaded_dice) {
            if (key.startsWith("d")) {
                diceTypeCounts[key] = loaded_dice[key];
            } else {
                ADD_COUNT = loaded_dice[key];
            }
        }
    }
}


if (Object.values(diceTypeCounts).every(count => count === 0)) {
    diceTypeCounts.d8 = 2; // default fallback
}

// const DIE_COLORS = {
//     d6:  '#40E0D0',  // Bright Turquoise ✅
//     d8:  '#E69F00',  // Orange-yellow
//     d10: '#56B4E9',  // Sky Blue
//     d12: '#CC79A7',  // Magenta-pink
//     d20: '#F0E442',  // Soft Yellow,
//     d4:  '#009E73',  // Teal green ✅ NEW
// };

function parseDndDiceNotation(notation) {
    const validDice = new Set(["d4", "d6", "d8", "d10", "d12", "d20"]);
    const result = {};
    const pattern = /([+-]?\d*)d(\d+)|([+-]?\d+)/gi;
    let match;
    while ((match = pattern.exec(notation)) !== null) {
        if (match[1] !== undefined && match[2] !== undefined) {
            // Dice term
            const dieType = `d${match[2]}`;
            if (!validDice.has(dieType)) continue; // skip invalid dice

            const count = parseInt(match[1]) || (match[1] === "-" ? -1 : 1);
            result[dieType] = (result[dieType] || 0) + count;
        } else if (match[3] !== undefined) {
            // Flat modifier
            const value = parseInt(match[3]);
            result["add"] = (result["add"] || 0) + value;
        }
    }

    return result;
}






const diceTypes = {
    d4: {
        geometry: null,
        material: null,
        shape: null,
        faceCount: 8,
        getTexture: createNumberedD4AtlasTexture,
        getGeometry: createNumberedD4Geometry,
        getShape: createPhysicsD4Shape,
        getTopFaceIndex: getTopFaceIndexForD4
    },
    d8: {
        geometry: null,
        material: null,
        shape: null,
        faceCount: 8,
        getTexture: createNumberedAtlasTexture,
        getGeometry: createNumberedD8Geometry,
        getShape: createPhysicsD8Shape,
        getTopFaceIndex: getTopFaceIndex
    },
    d6: {
        geometry: null,
        material: null,
        shape: null,
        faceCount: 6,
        getTexture: createNumberedD6AtlasTexture,
        getGeometry: createNumberedD6Geometry,
        getShape: createPhysicsD6Shape,
        getTopFaceIndex:getTopFaceIndexForD6
    },
    d10: {
        geometry: null,
        material: null,
        shape: null,
        faceCount: 10,
        getGeometry: createNumberedD10Geometry,
        getTexture: createNumberedD10AtlasTexture,
        getShape: createPhysicsD10Shape,
        getTopFaceIndex: getTopFaceIndexForD10
    },
    d12: {
        geometry: null,
        material: null,
        shape: null,
        faceCount: 10,
        getGeometry: createNumberedD12Geometry,
        getTexture: createNumberedD12AtlasTexture,
        getShape: createPhysicsD12Shape,
        getTopFaceIndex: getTopFaceIndexForD12
    },
    d20: {
        geometry: null,
        material: null,
        shape: null,
        faceCount: 20,
        getGeometry: createNumberedD20Geometry,
        getTexture: createNumberedD20AtlasTexture,
        getShape: createPhysicsD20Shape,
        getTopFaceIndex: getTopFaceIndexForD20
    }
};

for (const [key, die] of Object.entries(diceTypes)) {
    die.geometry = die.getGeometry();
    die.material = new THREE.MeshStandardMaterial({ map: die.getTexture() });
    die.shape = die.getShape();
}

function createPhysicsDebugMesh(body, color = 0xff0000) {
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

let wallBodies = [];
let wallMeshes = [];

export function setupWalls(scene, world, extraWidth = 0) {
    // Clear previous walls
    for (const body of wallBodies) world.removeBody(body);
    for (const mesh of wallMeshes) {
        scene.remove(mesh);
        mesh.geometry.dispose();
        mesh.material.dispose();
    }
    wallBodies = [];
    wallMeshes = [];

    const baseSize = 30;
    const boundarySize = baseSize + extraWidth; // Extend size if needed

    function createWall(pos, rot, size, skipVisual = false) {
        const shape = new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2));
        const body = new CANNON.Body({ mass: 0, shape, position: pos });
        body.quaternion.setFromEuler(rot.x, rot.y, rot.z);
        world.addBody(body);
        wallBodies.push(body);

        if (!skipVisual) {
            const geo = new THREE.BoxGeometry(size.x, size.y, size.z);
            const mat = new THREE.MeshStandardMaterial({ color: 0x333333 });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.copy(pos);
            mesh.rotation.set(rot.x, rot.y, rot.z);
            scene.add(mesh);
            wallMeshes.push(mesh);
        }
    }

    createWall(new CANNON.Vec3(0, -0.5, 0), new CANNON.Vec3(0, 0, 0), { x: boundarySize, y: 1, z: boundarySize });
    createWall(new CANNON.Vec3(0, 10, 0), new CANNON.Vec3(0, 0, 0), { x: boundarySize, y: 1, z: boundarySize }, true);
    createWall(new CANNON.Vec3(-boundarySize / 2, 5, 0), new CANNON.Vec3(0, 0, 0), { x: 1, y: 10, z: boundarySize });
    createWall(new CANNON.Vec3(boundarySize / 2, 5, 0), new CANNON.Vec3(0, 0, 0), { x: 1, y: 10, z: boundarySize });
    createWall(new CANNON.Vec3(0, 5, -boundarySize / 2), new CANNON.Vec3(0, 0, 0), { x: boundarySize, y: 10, z: 1 });
    createWall(new CANNON.Vec3(0, 5, boundarySize / 2), new CANNON.Vec3(0, 0, 0), { x: boundarySize, y: 10, z: 1 }, true);
}


function spawnDie(x, y, z, type) {
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

    const debugMesh = createPhysicsDebugMesh(body);
    debugMesh.scale.set(1.1, 1.1, 1.1);
    debugMesh.visible = debugMode;

    dice.push({type, mesh, body, debugMesh, geometry: def.geometry});

    diceResults.push(null);
}

function spawnDieSet(typeOrArray, count, zoneCenter, totalDice) {
    const baseSpacing = 1.5;
    const spacing = baseSpacing * (1 + Math.log2(totalDice + 1) * 0.2);
    const dicePerRow = Math.ceil(Math.sqrt(count));

    const getType = typeof typeOrArray === 'string'
        ? () => typeOrArray
        : (i) => typeOrArray[i];

    for (let i = 0; i < count; i++) {
        const row = Math.floor(i / dicePerRow);
        const col = i % dicePerRow;

        const localX = (col - (dicePerRow - 1) / 2) * spacing;
        const localZ = (row - (dicePerRow - 1) / 2) * spacing;

        const xPos = zoneCenter + localX + (Math.random() - 0.5) * 0.4;
        const yPos = 6 + Math.random() * 2;
        const zPos = localZ + (Math.random() - 0.5) * 0.4;

        spawnDie(xPos, yPos, zPos, getType(i));
    }
}

function createDiceSet(diceTypeCounts) {
    const totalDice = Object.values(diceTypeCounts).reduce((sum, n) => sum + n, 0);

    const spawnScale = totalDice <= 40 ? 1 : Math.log2(totalDice / 20 + 1) + 1.5;
    const spawnRange = 12 * spawnScale;
    let wallExtra = Math.max(0, Math.floor((spawnScale - 1) * 20));
    if (totalDice > 1000) {
        wallExtra = 1000;
    }

    setupWalls(scene, world, wallExtra);
    dice.length = 0;
    diceResults = [];

    if (totalDice > 40) {
        // Flatten all dice into a single array with type info
        const allDice = [];
        for (const [type, count] of Object.entries(diceTypeCounts)) {
            for (let i = 0; i < count; i++) {
                allDice.push(type);
            }
        }

        // Sort by die type size (assumes type is like "d4", "d6", etc.)
        allDice.sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1)));
        spawnDieSet(allDice, allDice.length, 0, totalDice);
    } else {
        // Normal behavior: spawn dice by type in separate zones
        const activeTypes = Object.keys(diceTypeCounts).filter(type => diceTypeCounts[type] > 0);
        const typeSpacing = spawnRange / activeTypes.length;

        const typeZones = {};
        activeTypes.forEach((type, i) => {
            const zoneCenter = -spawnRange / 2 + typeSpacing * (i + 0.5);
            typeZones[type] = zoneCenter;
        });

        for (const type of activeTypes) {
            const count = diceTypeCounts[type];
            const zoneCenter = typeZones[type];
            spawnDieSet(type, count, zoneCenter, totalDice);
        }
    }
}

function respawnDie(die) {
    die.body.position.set(
        (Math.random() - 0.5) * 5,
        6 + Math.random() * 3,
        (Math.random() - 0.5) * 5
    );
    setupDiePhysics(die.body);
}



function detectDiceState() {
    let allStopped = true;

    dice.forEach((d, i) => {
        if (d.body.position.y < -10) {
            respawnDie(d);
            diceResults[i] = null;
            allStopped = false;
            return;
        }

        const velocity = d.body.velocity.length();
        const angular = d.body.angularVelocity.length();
        if (velocity > 0.05 || angular > 0.05) {
            allStopped = false;
        } else if (diceResults[i] === null) {
            diceResults[i] = diceTypes[d.type].getTopFaceIndex(d.body.quaternion, diceTypes[d.type].geometry) + 1;
        }
    });

    return allStopped;
}

function checkDiceStopped() {
    const allStopped = detectDiceState();

    if (allStopped && diceResults.every(x => x !== null)) {
        renderResults();
    }
}

function renderTotalResult(labelBar, total) {
    if (ADD_COUNT) {
        const bonusLabel = document.createElement('div');
        bonusLabel.className = 'die-label';
        bonusLabel.textContent = `+${ADD_COUNT}`;
        labelBar.appendChild(bonusLabel);
    }

    const totalLabel = document.createElement('div');
    totalLabel.className = 'die-label';
    totalLabel.textContent = `= ${total}`;
    labelBar.appendChild(totalLabel);

    document.getElementById('result').innerText = '';
}

function renderDieLabel(labelBar, die, isD20 = false) {
    const label = document.createElement('div');
    label.className = 'die-label';
    label.textContent = die.result;

    const color = DIE_COLORS[die.type] || '#ffffff';
    label.style.backgroundColor = color;
    label.style.color = '#000';

    if (isD20) {
        label.style.border = '2px dashed #888';
    } else {
        label.style.border = '2px solid white';
    }

    labelBar.appendChild(label);
    die.label = label;
}

function renderResults() {
    const labelBar = document.getElementById('labelBar');
    const svg = document.getElementById('lineOverlay');

    labelBar.innerHTML = '';
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    if (diceResults.length > 20) {
        const total = diceResults.reduce((sum, val) => sum + val, 0) + ADD_COUNT;

        const buckets = {};
        dice.forEach((d, i) => {
            const value = diceResults[i];
            const key = `${value}`;
            if (!buckets[key]) buckets[key] = { count: 0, color: DIE_COLORS[d.type] || '#fff' };
            buckets[key].count++;
        });

        Object.keys(buckets).sort((a, b) => parseInt(a) - parseInt(b)).forEach(key => {
            const { count, color } = buckets[key];
            const label = document.createElement('div');
            label.className = 'die-label';
            label.textContent = `${count}×${key}`;
            label.style.backgroundColor = color;
            label.style.border = '2px solid white';
            label.style.color = '#000';
            labelBar.appendChild(label);
        });

        renderTotalResult(labelBar, total);

        return;
    }

    let total = 0;
    let d20Results = [];
    let dieData = [];

    dice.forEach((d, i) => {
        const result = diceResults[i];
        const dieInfo = {
            result: result,
            screen: worldToScreenPos(d.mesh.position.clone(), camera),
            mesh: d.mesh,
            type: d.type
        };

        dieData.push(dieInfo);

        if (diceTypes[d.type].faceCount === 20) {
            d20Results.push(dieInfo);
        } else {
            total += result;
        }
    });

    total += ADD_COUNT;

    const grouped = {};
    dieData.forEach(d => {
        if (!grouped[d.result]) grouped[d.result] = [];
        grouped[d.result].push(d);
    });

    Object.values(grouped).forEach(group => {
        group.sort((a, b) => a.screen.x - b.screen.x);
    });

    const sortedData = Object.keys(grouped)
        .map(Number)
        .sort((a, b) => a - b)
        .flatMap(key => grouped[key]);

    sortedData.forEach(die => {
        if (diceTypes[die.type].faceCount !== 20) {
            renderDieLabel(labelBar, die, false);
        }
    });

    renderTotalResult(labelBar, total)

    d20Results.forEach(die => {
        renderDieLabel(labelBar, die, true);
    });

    const labelBarRect = labelBar.getBoundingClientRect();
    sortedData.forEach(die => {
        const labelRect = die.label.getBoundingClientRect();
        const labelX = labelRect.left + labelRect.width / 2;
        const labelY = labelBarRect.bottom;

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', labelX);
        line.setAttribute('y1', labelY);
        line.setAttribute('x2', die.screen.x);
        line.setAttribute('y2', die.screen.y);
        const color = DIE_COLORS[die.type] || '#ffffff';

        line.setAttribute('stroke', color);
        line.setAttribute('stroke-width', '1.5');
        svg.appendChild(line);
    });
}

function resetDice() {
    // Remove dice meshes and bodies
    dice.forEach(({ mesh, body, debugMesh }) => {
        scene.remove(mesh);
        scene.remove(debugMesh);
        world.removeBody(body);
    });

    // Clear label bar
    const labelBar = document.getElementById('labelBar');
    if (labelBar) labelBar.innerHTML = '';

    // Clear SVG lines
    const svg = document.getElementById('lineOverlay');
    if (svg) while (svg.firstChild) svg.removeChild(svg.firstChild);

    // Reset and recreate dice
    createDiceSet(diceTypeCounts);
    document.getElementById('result').innerText = 'Rolling...';
}

function worldToScreenPos(pos, camera) {
    const vector = pos.clone().project(camera);
    return {
        x: (vector.x + 1) * window.innerWidth / 2,
        y: (-vector.y + 1) * window.innerHeight / 2
    };
}

const updateUI = () => {
    document.getElementById('d20Count').textContent = diceTypeCounts.d20;
    document.getElementById('d12Count').textContent = diceTypeCounts.d12;
    document.getElementById('d10Count').textContent = diceTypeCounts.d10;
    document.getElementById('d8Count').textContent = diceTypeCounts.d8;
    document.getElementById('d6Count').textContent = diceTypeCounts.d6;
    document.getElementById('d4Count').textContent = diceTypeCounts.d4;
    // Optionally, re-roll or re-initialize dice
};

export const changeCount = (type, delta) => {
    if (!diceTypeCounts.hasOwnProperty(type)) return;

    // Apply the change
    diceTypeCounts[type] = Math.max(0, Math.min(MAX_DICE, diceTypeCounts[type] + delta));

    // Calculate new total
    const total = Object.values(diceTypeCounts).reduce((sum, n) => sum + n, 0);

    // If we're over the limit, trim the excess
    const excess = total - MAX_DICE;
    if (excess > 0) {
        let maxType = null;
        let maxCount = -Infinity;

        for (const t in diceTypeCounts) {
            if (t === type) continue; // skip the just-modified type
            if (diceTypeCounts[t] > maxCount) {
                maxCount = diceTypeCounts[t];
                maxType = t;
            }
        }

        if (maxType) {
            diceTypeCounts[maxType] = Math.max(0, diceTypeCounts[maxType] - excess);
        }
    }

    updateUI();
};

window.changeCount = changeCount;

// Initial UI state
updateUI();

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 15, 20);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5, 10, 7.5);
scene.add(light);

const world = new CANNON.World({gravity: new CANNON.Vec3(0, -9.82, 0)});
world.broadphase = new CANNON.NaiveBroadphase();

const diceMaterial = new CANNON.Material('dice');
world.defaultContactMaterial = new CANNON.ContactMaterial(diceMaterial, diceMaterial, {
    friction: 0.4,
    restitution: 0.6
});

setupWalls(scene, world);

const dice = [];
let diceResults = [];
let debugMode = false;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.screenSpacePanning = false;
controls.minDistance = 5;
controls.maxDistance = 50;
controls.target.set(0, 0, 0);
controls.update();

const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    world.step(1 / 60, delta, 3);

    dice.forEach(d => {
        d.mesh.position.copy(d.body.position);
        d.mesh.quaternion.copy(d.body.quaternion);
        d.debugMesh.position.copy(d.body.position);
        d.debugMesh.quaternion.copy(d.body.quaternion);
    });
    checkDiceStopped();
    controls.update(); // for damping
    renderer.render(scene, camera);
}
updateUI()
createDiceSet(diceTypeCounts);
animate();

// Add gui(most of it anyway)
document.getElementById('resetButton').addEventListener('click', resetDice);
window.addEventListener('keydown', e => {
    if (e.key.toLowerCase() === 'r') resetDice();
    if (e.key.toLowerCase() === 'd') {
        debugMode = !debugMode;
        dice.forEach(d => d.debugMesh.visible = debugMode);
    }
});

document.addEventListener('click', function (event) {
    const d10Details = document.getElementById('d10-details');

    // If the click is *outside* the <details> element and it's open, close it
    if (
        d10Details.open &&
        !d10Details.contains(event.target)
    ) {
        d10Details.removeAttribute('open');
    }
});


const presets = [
    { label: '1d20', d8: 0, d6: 0, d10: 0, d12: 0, d20: 1, d4: 0 },
    { label: '2d20', d8: 0, d6: 0, d10: 0, d12: 0, d20: 2, d4: 0 },
    { label: 'Fireball', d8: 0, d6: 8, d10: 0, d12: 0, d20: 0, d4: 0 },
    { label: '+Smite 1', d8: 2, d6: 0, d10: 0, d12: 0, d20: 0, d4: 0, additive: true },
    { label: '+Smite 2', d8: 3, d6: 0, d10: 0, d12: 0, d20: 0, d4: 0, additive: true },
    { label: '+Smite 3', d8: 4, d6: 0, d10: 0, d12: 0, d20: 0, d4: 0, additive: true },
    { label: '+Smite 4', d8: 5, d6: 0, d10: 0, d12: 0, d20: 0, d4: 0, additive: true },
    { label: 'Max Demo', d8: 10, d6: 10, d10: 0, d12: 0, d20: 0, d4: 0 },
    { label: '1000', d8: 0, d6: 1000, d10: 0, d12: 0, d20: 0, d4: 0 },
];

// Update function to optionally add to existing counts
function setDiceCounts(d20, d12, d10, d8, d6, d4, additive = false) {
    if (additive) {
        tryLoadDiceParameter();
        diceTypeCounts.d4 += d4;
        diceTypeCounts.d6 += d6;
        diceTypeCounts.d8 += d8;
        diceTypeCounts.d10 += d10;
        diceTypeCounts.d12 += d12;
        diceTypeCounts.d20 += d20;
    } else {
        diceTypeCounts.d4 = d4;
        diceTypeCounts.d6 = d6;
        diceTypeCounts.d8 = d8;
        diceTypeCounts.d10 = d10;
        diceTypeCounts.d12 = d12;
        diceTypeCounts.d20 = d20;
        ADD_COUNT = 0;
    }

    updateUI();
}

// Generate buttons in #presets
const presetContainer = document.getElementById('presets');

presets.forEach(preset => {
    const btn = document.createElement('button');
    btn.className = 'preset-button';
    btn.textContent = preset.label;
    btn.addEventListener('click', () => {
        setDiceCounts(preset.d20, preset.d12, preset.d10, preset.d8, preset.d6, preset.d4, preset.additive ?? false);
    });
    presetContainer.appendChild(btn);
});


const tag = document.createElement('div');
tag.textContent = `🕒 ${__BUILD_TIME__}`;
tag.style.cssText = `
  position: fixed;
  bottom: 10px;
  right: 12px;
  font-size: 14px;
  font-family: monospace;
  color: rgba(255,255,255,0.7);
  background: rgba(0,0,0,0.4);
  padding: 4px 8px;
  border-radius: 6px;
  z-index: 9999;
  pointer-events: none;
`;
document.body.appendChild(tag);