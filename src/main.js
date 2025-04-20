import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js';
import * as CANNON from 'https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';

const urlParams = new URLSearchParams(window.location.search);
const D8_COUNT = parseInt(urlParams.get('d8')) || 2;
const D6_COUNT = parseInt(urlParams.get('d6')) || 0;
const ADD_COUNT = parseInt(urlParams.get('add')) || 0;

function setupWalls(scene, world) {
    const boundarySize = 30;

    function createWall(pos, rot, size, skipVisual = false) {
        const shape = new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2));
        const body = new CANNON.Body({mass: 0, shape, position: pos});
        body.quaternion.setFromEuler(rot.x, rot.y, rot.z);
        world.addBody(body);

        if (!skipVisual) {
            const geo = new THREE.BoxGeometry(size.x, size.y, size.z);
            const mat = new THREE.MeshStandardMaterial({color: 0x333333});
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.copy(pos);
            mesh.rotation.set(rot.x, rot.y, rot.z);
            scene.add(mesh);
        }
    }

    createWall(new CANNON.Vec3(0, -0.5, 0), new CANNON.Vec3(0, 0, 0), {x: boundarySize, y: 1, z: boundarySize});
    createWall(new CANNON.Vec3(0, 10, 0), new CANNON.Vec3(0, 0, 0), {x: boundarySize, y: 1, z: boundarySize}, true);
    createWall(new CANNON.Vec3(-boundarySize / 2, 5, 0), new CANNON.Vec3(0, 0, 0), {x: 1, y: 10, z: boundarySize});
    createWall(new CANNON.Vec3(boundarySize / 2, 5, 0), new CANNON.Vec3(0, 0, 0), {x: 1, y: 10, z: boundarySize});
    createWall(new CANNON.Vec3(0, 5, -boundarySize / 2), new CANNON.Vec3(0, 0, 0), {x: boundarySize, y: 10, z: 1});
    createWall(new CANNON.Vec3(0, 5, boundarySize / 2), new CANNON.Vec3(0, 0, 0), {x: boundarySize, y: 10, z: 1}, true);
}

// D8 creation
function createNumberedD8Geometry() {
    const verts = [
        new THREE.Vector3(1, 0, 0),   // 0
        new THREE.Vector3(-1, 0, 0),  // 1
        new THREE.Vector3(0, 1, 0),   // 2
        new THREE.Vector3(0, -1, 0),  // 3
        new THREE.Vector3(0, 0, 1),   // 4
        new THREE.Vector3(0, 0, -1),  // 5
    ];

    const faces = [
        [0, 2, 4], // 0
        [2, 1, 4], // 1
        [1, 3, 4], // 2
        [3, 0, 4], // 3
        [2, 0, 5], // 4
        [1, 2, 5], // 5
        [3, 1, 5], // 6
        [0, 3, 5], // 7
    ];

    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const uvs = [];

    const tileWidth = 1 / 8;

    for (let i = 0; i < faces.length; i++) {
        const [aIdx, bIdx, cIdx] = faces[i];
        const a = verts[aIdx];
        const b = verts[bIdx];
        const c = verts[cIdx];

        // Push vertex positions
        positions.push(a.x, a.y, a.z);
        positions.push(b.x, b.y, b.z);
        positions.push(c.x, c.y, c.z);

        // Face center & tangent space to orient texture
        const ab = new THREE.Vector3().subVectors(b, a);
        const ac = new THREE.Vector3().subVectors(c, a);
        const faceCenter = new THREE.Vector3().addVectors(a, b).add(c).divideScalar(3);
        const normal = new THREE.Vector3().crossVectors(ab, ac).normalize();

        // Define a consistent "up" vector on each triangle face
        const faceY = new THREE.Vector3(0, 1, 0);
        if (Math.abs(normal.dot(faceY)) > 0.99) faceY.set(1, 0, 0); // avoid degenerate

        const xAxis = new THREE.Vector3().crossVectors(faceY, normal).normalize();
        const yAxis = new THREE.Vector3().crossVectors(normal, xAxis).normalize();

        // Map each vertex to 2D space in the face's local UV frame
        const toUV = (v) => {
            const p = new THREE.Vector3().subVectors(v, faceCenter);
            return {
                u: p.dot(xAxis),
                v: p.dot(yAxis)
            };
        };

        let uvA = toUV(a);
        let uvB = toUV(b);
        let uvC = toUV(c);

        // Normalize UVs to triangle coordinates (centered around 0,0)
        const maxRange = Math.max(
            Math.abs(uvA.u), Math.abs(uvA.v),
            Math.abs(uvB.u), Math.abs(uvB.v),
            Math.abs(uvC.u), Math.abs(uvC.v)
        ) || 1;

        // Fit into texture tile
        const tileOffsetU = i * tileWidth;

        const packUV = (uv) => [
            tileOffsetU + (uv.u / maxRange / 2 + 0.5) * tileWidth,
            (uv.v / maxRange / 2 + 0.5)
        ];

        const uprightFaces = [0, 1, 4, 5];
        const isUpright = uprightFaces.includes(i);

        if (!isUpright) {
            function rotateUV180(uv) {
                return {u: -uv.u, v: -uv.v};
            }

            uvA = rotateUV180(uvA);
            uvB = rotateUV180(uvB);
            uvC = rotateUV180(uvC);
        }


        uvs.push(...packUV(uvA));
        uvs.push(...packUV(uvB));
        uvs.push(...packUV(uvC));
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.computeVertexNormals();
    return geometry;
}

function createNumberedAtlasTexture() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 1024;
    canvas.height = 128;

    for (let i = 0; i < 8; i++) {
        const x = i * 128;
        ctx.fillStyle = '#00ffcc';
        ctx.fillRect(x, 0, 128, 128);
        ctx.fillStyle = '#000';
        ctx.font = 'bold 64px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText((i + 1).toString(), x + 64, 64);
    }

    return new THREE.CanvasTexture(canvas);
}

function createPhysicsD8Shape() {
    const verts = [
        new CANNON.Vec3(1.0, 0, 0),
        new CANNON.Vec3(-1.0, 0, 0),
        new CANNON.Vec3(0, 1.0, 0),
        new CANNON.Vec3(0, -1.0, 0),
        new CANNON.Vec3(0, 0, 1.0),
        new CANNON.Vec3(0, 0, -1.0),
    ];

    const faces = [
        [0, 2, 4],
        [2, 1, 4],
        [1, 3, 4],
        [3, 0, 4],
        [2, 0, 5],
        [1, 2, 5],
        [3, 1, 5],
        [0, 3, 5],
    ];

    return new CANNON.ConvexPolyhedron({vertices: verts, faces});
}

function getTopFaceIndex(quat) {
    const up = new THREE.Vector3(0, 1, 0);
    const q = new THREE.Quaternion(quat.x, quat.y, quat.z, quat.w);
    const position = diceTypes['d8'].geometry.getAttribute('position');
    const faceNormals = [];
    for (let i = 0; i < position.count; i += 3) {
        const a = new THREE.Vector3().fromBufferAttribute(position, i);
        const b = new THREE.Vector3().fromBufferAttribute(position, i + 1);
        const c = new THREE.Vector3().fromBufferAttribute(position, i + 2);
        const cb = new THREE.Vector3().subVectors(c, b);
        const ab = new THREE.Vector3().subVectors(a, b);
        const normal = new THREE.Vector3().crossVectors(cb, ab).normalize();
        faceNormals.push(normal);
    }

    let maxDot = -1;
    let best = 0;
    faceNormals.forEach((n, i) => {
        const transformed = n.clone().applyQuaternion(q);
        const dot = transformed.dot(up);
        if (dot > maxDot) {
            maxDot = dot;
            best = i;
        }
    });

    return best;
}

// D6 creation
function createNumberedD6Geometry() {
    const tileSize = 1 / 6;
    const geometry = new THREE.BufferGeometry();

    const positions = [];
    const uvs = [];

    const faces = [
        // Front (+Z)
        { normal: [0, 0, 1], u: [0, 1], v: [1, 1, 0, 0], tile: 0 },
        // Back (-Z)
        { normal: [0, 0, -1], u: [1, 0], v: [1, 1, 0, 0], tile: 1 },
        // Right (+X)
        { normal: [1, 0, 0], u: [0, 1], v: [1, 1, 0, 0], tile: 2 },
        // Left (-X)
        { normal: [-1, 0, 0], u: [1, 0], v: [1, 1, 0, 0], tile: 3 },
        // Top (+Y)
        { normal: [0, 1, 0], u: [0, 1], v: [0, 0, 1, 1], tile: 4 },
        // Bottom (-Y)
        { normal: [0, -1, 0], u: [0, 1], v: [1, 1, 0, 0], tile: 5 },
    ];

    const verts = [
        [-0.5, -0.5,  0.5],
        [ 0.5, -0.5,  0.5],
        [ 0.5,  0.5,  0.5],
        [-0.5,  0.5,  0.5],

        [-0.5, -0.5, -0.5],
        [ 0.5, -0.5, -0.5],
        [ 0.5,  0.5, -0.5],
        [-0.5,  0.5, -0.5],
    ];

    const faceIndices = [
        [0, 1, 2, 3], // front
        [5, 4, 7, 6], // back
        [1, 5, 6, 2], // right
        [4, 0, 3, 7], // left
        [3, 2, 6, 7], // top
        [4, 5, 1, 0], // bottom
    ];

    for (let i = 0; i < 6; i++) {
        const tile = i;
        const [a, b, c, d] = faceIndices[i];
        const vertsA = verts[a];
        const vertsB = verts[b];
        const vertsC = verts[c];
        const vertsD = verts[d];

        const tileOffset = tile * tileSize;

        // Add 2 triangles per face
        positions.push(...vertsA, ...vertsB, ...vertsC);
        positions.push(...vertsA, ...vertsC, ...vertsD);

        uvs.push(
            tileOffset + tileSize, 1,
            tileOffset, 1,
            tileOffset, 0,

            tileOffset + tileSize, 1,
            tileOffset, 0,
            tileOffset + tileSize, 0
        );
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.computeVertexNormals();
    return geometry;
}

function createNumberedD6AtlasTexture() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 128 * 6;
    canvas.height = 128;

    for (let i = 0; i < 6; i++) {
        const x = i * 128;
        ctx.fillStyle = '#ffffcc';
        ctx.fillRect(x, 0, 128, 128);
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 64px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText((i + 1).toString(), x + 64, 64);
    }

    return new THREE.CanvasTexture(canvas);
}

function createPhysicsD6Shape(size = 0.5) {
    const s = size;
    const verts = [
        new CANNON.Vec3(-s, -s, -s),
        new CANNON.Vec3(-s, -s,  s),
        new CANNON.Vec3(-s,  s, -s),
        new CANNON.Vec3(-s,  s,  s),
        new CANNON.Vec3( s, -s, -s),
        new CANNON.Vec3( s, -s,  s),
        new CANNON.Vec3( s,  s, -s),
        new CANNON.Vec3( s,  s,  s),
    ];

    const faces = [
        [0, 1, 3, 2], // -X
        [4, 6, 7, 5], // +X
        [0, 4, 5, 1], // -Y
        [2, 3, 7, 6], // +Y
        [0, 2, 6, 4], // -Z
        [1, 5, 7, 3]  // +Z
    ];

    return new CANNON.ConvexPolyhedron({vertices: verts, faces});
}

function getTopFaceIndexForD6(quat) {
    const up = new THREE.Vector3(0, 1, 0);
    const q = new THREE.Quaternion(quat.x, quat.y, quat.z, quat.w);

    const faceNormals = [
        new THREE.Vector3(0, 0, 1),   // 0: front (+Z)
        new THREE.Vector3(0, 0, -1),  // 1: back  (-Z)
        new THREE.Vector3(1, 0, 0),   // 2: right (+X)
        new THREE.Vector3(-1, 0, 0),  // 3: left  (-X)
        new THREE.Vector3(0, 1, 0),   // 4: top   (+Y)
        new THREE.Vector3(0, -1, 0),  // 5: bottom(-Y)
    ];

    let maxDot = -Infinity;
    let bestFace = 0;

    for (let i = 0; i < faceNormals.length; i++) {
        const worldNormal = faceNormals[i].clone().applyQuaternion(q);
        const dot = worldNormal.dot(up);
        if (dot > maxDot) {
            maxDot = dot;
            bestFace = i;
        }
    }

    return bestFace; // 0–5 index
}

function createNumberedD10Geometry() {
    const geometry = new THREE.BufferGeometry();

    const verts = [];
    const faces = [];

    const top = new THREE.Vector3(0, 1, 0);
    const bottom = new THREE.Vector3(0, -1, 0);
    const radius = 1;
    const angleStep = Math.PI * 2 / 10;

    for (let i = 0; i < 10; i++) {
        const angle = i * angleStep;
        verts.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
    }

    for (let i = 0; i < 10; i++) {
        const next = (i + 1) % 10;
        if (i % 2 === 0) {
            faces.push([10, i, next]); // top point
        } else {
            faces.push([11, next, i]); // bottom point
        }
    }

    verts.push(top);    // index 10
    verts.push(bottom); // index 11

    const positions = [];
    const uvs = [];
    const tileWidth = 1 / 10;

    for (let i = 0; i < faces.length; i++) {
        const [aIdx, bIdx, cIdx] = faces[i];
        const a = verts[aIdx];
        const b = verts[bIdx];
        const c = verts[cIdx];

        positions.push(a.x, a.y, a.z);
        positions.push(b.x, b.y, b.z);
        positions.push(c.x, c.y, c.z);

        // Same texture mapping trick as D8
        const faceCenter = new THREE.Vector3().addVectors(a, b).add(c).divideScalar(3);
        const ab = new THREE.Vector3().subVectors(b, a);
        const ac = new THREE.Vector3().subVectors(c, a);
        const normal = new THREE.Vector3().crossVectors(ab, ac).normalize();

        const faceY = new THREE.Vector3(0, 1, 0);
        if (Math.abs(normal.dot(faceY)) > 0.99) faceY.set(1, 0, 0);

        const xAxis = new THREE.Vector3().crossVectors(faceY, normal).normalize();
        const yAxis = new THREE.Vector3().crossVectors(normal, xAxis).normalize();

        const toUV = (v) => {
            const p = new THREE.Vector3().subVectors(v, faceCenter);
            return {
                u: p.dot(xAxis),
                v: p.dot(yAxis)
            };
        };

        let uvA = toUV(a), uvB = toUV(b), uvC = toUV(c);

        const maxRange = Math.max(
            Math.abs(uvA.u), Math.abs(uvA.v),
            Math.abs(uvB.u), Math.abs(uvB.v),
            Math.abs(uvC.u), Math.abs(uvC.v)
        ) || 1;

        const tileOffsetU = i * tileWidth;

        const packUV = (uv) => [
            tileOffsetU + (uv.u / maxRange / 2 + 0.5) * tileWidth,
            (uv.v / maxRange / 2 + 0.5)
        ];

        uvs.push(...packUV(uvA), ...packUV(uvB), ...packUV(uvC));
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.computeVertexNormals();

    return geometry;
}

function createNumberedD10AtlasTexture() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 128 * 10;
    canvas.height = 128;

    for (let i = 0; i < 10; i++) {
        const x = i * 128;
        ctx.fillStyle = '#ffe0cc';
        ctx.fillRect(x, 0, 128, 128);
        ctx.fillStyle = '#000';
        ctx.font = 'bold 64px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText((i + 1).toString(), x + 64, 64);
    }

    return new THREE.CanvasTexture(canvas);
}

function createPhysicsD10Shape() {
    const verts = [];
    const faces = [];

    const R = 1.0;       // Radius of base ring
    const H = 0.4;       // Half height between alternating rim vertices
    const T = 1.1;       // Distance to top/bottom tip from center

    // 10 rim vertices, alternating in height (+H / -H)
    for (let i = 0; i < 10; i++) {
        const angle = (i / 10) * Math.PI * 2;
        const y = (i % 2 === 0) ? -H : H;
        const x = Math.cos(angle) * R;
        const z = Math.sin(angle) * R;
        verts.push(new CANNON.Vec3(x, y, z));
    }

    // Add tips
    const topIndex = verts.length;
    const bottomIndex = verts.length + 1;
    verts.push(new CANNON.Vec3(0, T, 0));    // Top tip
    verts.push(new CANNON.Vec3(0, -T, 0));   // Bottom tip

    // Connect each pair to top or bottom
    for (let i = 0; i < 10; i++) {
        const next = (i + 1) % 10;
        if (i % 2 === 0) {
            // Face to bottom tip
            faces.push([i, next, bottomIndex]); // CCW order from outside
        } else {
            // Face to top tip
            faces.push([topIndex, next, i]); // CCW order from outside
        }
    }

    const poly = new CANNON.ConvexPolyhedron({ vertices: verts, faces });

    // Debug: verify construction
    console.log("D10: verts=", verts.length, "faces=", faces.length);
    return poly;
}



// I think this works for any shape?
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

const diceTypes = {
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
        getTopFaceIndex: getTopFaceIndex // reuses triangle-based generic one
    }
};

diceTypes.d8.geometry = diceTypes.d8.getGeometry();
diceTypes.d8.material = new THREE.MeshStandardMaterial({map: diceTypes.d8.getTexture()});
diceTypes.d8.shape = diceTypes.d8.getShape();
diceTypes.d6.geometry = diceTypes.d6.getGeometry();
diceTypes.d6.material = new THREE.MeshStandardMaterial({map: diceTypes.d6.getTexture()});
diceTypes.d6.shape = diceTypes.d6.getShape();
diceTypes.d10.geometry = diceTypes.d10.getGeometry();
diceTypes.d10.material = new THREE.MeshStandardMaterial({ map: diceTypes.d10.getTexture() });
diceTypes.d10.shape = diceTypes.d10.getShape();

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

function createDiceSet(d6_count, d8_count) {
    dice.length = 0;
    diceResults = [];

    const total = d6_count + d8_count;
    const spawnRange = 12;
    const spacing = spawnRange / (total + 1);

    let dieIndex = 0;

    // Helper function to add a die of a given type
    function spawnDie(type) {
        const def = diceTypes[type];
        const xPos = -spawnRange / 2 + spacing * (dieIndex + 1);

        const mesh = new THREE.Mesh(def.geometry, def.material);
        scene.add(mesh);

        const body = new CANNON.Body({
            mass: 1,
            shape: def.shape,
            material: diceMaterial,
            allowSleep: false,
            position: new CANNON.Vec3(
                xPos,
                6 + Math.random() * 2,
                (Math.random() - 0.5) * spawnRange
            )
        });

        body.angularDamping = 0.3;
        body.linearDamping = 0.3;
        setupDiePhysics(body);
        world.addBody(body);

        const debugMesh = createPhysicsDebugMesh(body);
        debugMesh.scale.set(1.1, 1.1, 1.1);
        debugMesh.visible = debugMode;

        dice.push({
            type,
            mesh,
            body,
            debugMesh,
            geometry: def.geometry,
            faceToValue: def.faceToValue,
            facesPerNumber: def.facesPerNumber
        });

        diceResults.push(null);
        dieIndex++;
    }

    // Add D6 dice
    for (let i = 0; i < d6_count; i++) spawnDie('d6');

    // Add D8 dice
    for (let i = 0; i < d8_count; i++) spawnDie('d8');
}

function respawnDie(die) {
    die.body.position.set(
        (Math.random() - 0.5) * 5,
        6 + Math.random() * 3,
        (Math.random() - 0.5) * 5
    );
    setupDiePhysics(die.body);
}


function checkDiceStopped() {
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
        if (velocity > 0.1 || angular > 0.1) {
            allStopped = false;
        } else if (diceResults[i] === null) {
            diceResults[i] = diceTypes[d.type].getTopFaceIndex(d.body.quaternion) + 1;
        }
    });

    if (allStopped && diceResults.every(x => x !== null)) {
        const labelBar = document.getElementById('labelBar');
        const svg = document.getElementById('lineOverlay');

        labelBar.innerHTML = '';
        while (svg.firstChild) svg.removeChild(svg.firstChild);

        const total = diceResults.reduce((sum, val) => sum + val, 0) + ADD_COUNT;

        // Pair each die with result and screen position
        const dieData = dice.map((d, i) => ({
            result: diceResults[i],
            screen: worldToScreenPos(d.mesh.position.clone(), camera),
            mesh: d.mesh
        }));

        // Group dice by result value
        const grouped = {};
        dieData.forEach(d => {
            if (!grouped[d.result]) grouped[d.result] = [];
            grouped[d.result].push(d);
        });

        // Sort each group by screen x-position (left to right)
        Object.values(grouped).forEach(group => {
            group.sort((a, b) => a.screen.x - b.screen.x);
        });

        // Flatten sorted groups back to list, ordered by result value
        const sortedData = Object.keys(grouped)
            .map(Number)
            .sort((a, b) => a - b)
            .flatMap(key => grouped[key]);

        // Display labels in final sorted order
        sortedData.forEach(die => {
            const label = document.createElement('div');
            label.className = 'die-label';
            label.textContent = die.result;
            labelBar.appendChild(label);
            die.label = label; // keep for line drawing
        });

        // ➕ Optional bonus
        if (ADD_COUNT) {
            const bonusLabel = document.createElement('div');
            bonusLabel.className = 'die-label';
            bonusLabel.textContent = `+${ADD_COUNT}`;
            labelBar.appendChild(bonusLabel);
        }

        // 🧮 Total
        const totalLabel = document.createElement('div');
        totalLabel.className = 'die-label';
        totalLabel.textContent = `= ${total}`;
        labelBar.appendChild(totalLabel);

        document.getElementById('result').innerText = ' ';

        // 📏 Draw lines from labels to dice (skip bonus + total)
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
            line.setAttribute('stroke', 'white');
            line.setAttribute('stroke-width', '1.5');
            svg.appendChild(line);
        });
    }
}


// Gorgeous labels with lines all matching numbers and no crossing(mostly)
// function checkDiceStopped() {
//     let allStopped = true;
//
//     dice.forEach((d, i) => {
//         if (d.body.position.y < -10) {
//             respawnDie(d);
//             diceResults[i] = null;
//             allStopped = false;
//             return;
//         }
//
//         const velocity = d.body.velocity.length();
//         const angular = d.body.angularVelocity.length();
//         if (velocity > 0.1 || angular > 0.1) {
//             allStopped = false;
//         } else if (diceResults[i] === null) {
//             diceResults[i] = diceTypes[d.type].getTopFaceIndex(d.body.quaternion) + 1;
//         }
//     });
//
//     if (allStopped && diceResults.every(x => x !== null)) {
//         const labelBar = document.getElementById('labelBar');
//         const svg = document.getElementById('lineOverlay');
//
//         labelBar.innerHTML = '';
//         while (svg.firstChild) svg.removeChild(svg.firstChild);
//
//         // Gather dice with result and screen position
//         const dieData = dice.map((d, i) => {
//             return {
//                 mesh: d.mesh,
//                 result: diceResults[i],
//                 screen: worldToScreenPos(d.mesh.position.clone(), camera)
//             };
//         });
//
//         // Sort by screen X position for consistent label alignment
//         dieData.sort((a, b) => a.screen.x - b.screen.x);
//
//         const total = dieData.reduce((sum, d) => sum + d.result, 0) + ADD_COUNT;
//         const positions = [];
//
//         dieData.forEach((die) => {
//             const label = document.createElement('div');
//             label.className = 'die-label';
//             label.textContent = die.result;
//             labelBar.appendChild(label);
//
//             positions.push({ screen: die.screen, label });
//         });
//
//         if (ADD_COUNT) {
//             const bonusLabel = document.createElement('div');
//             bonusLabel.className = 'die-label';
//             bonusLabel.textContent = `+${ADD_COUNT}`;
//             labelBar.appendChild(bonusLabel);
//         }
//
//         const totalLabel = document.createElement('div');
//         totalLabel.className = 'die-label';
//         totalLabel.textContent = `= ${total}`;
//         labelBar.appendChild(totalLabel);
//
//         document.getElementById('result').innerText = ' ';
//
//         const labelBarRect = labelBar.getBoundingClientRect();
//         positions.forEach(({ screen, label }) => {
//             const labelRect = label.getBoundingClientRect();
//             const labelX = labelRect.left + labelRect.width / 2;
//             const labelY = labelBarRect.bottom;
//
//             const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
//             line.setAttribute('x1', labelX);
//             line.setAttribute('y1', labelY);
//             line.setAttribute('x2', screen.x);
//             line.setAttribute('y2', screen.y);
//             line.setAttribute('stroke', 'white');
//             line.setAttribute('stroke-width', '1.5');
//             svg.appendChild(line);
//         });
//     }
// }


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
    createDiceSet(D6_COUNT, D8_COUNT);
    document.getElementById('result').innerText = 'Rolling...';
}

function worldToScreenPos(pos, camera) {
    const vector = pos.clone().project(camera);
    return {
        x: (vector.x + 1) * window.innerWidth / 2,
        y: (-vector.y + 1) * window.innerHeight / 2
    };
}

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

createDiceSet(D6_COUNT, D8_COUNT);
animate();

window.addEventListener('keydown', e => {
    if (e.key.toLowerCase() === 'r') resetDice();
    if (e.key.toLowerCase() === 'd') {
        debugMode = !debugMode;
        dice.forEach(d => d.debugMesh.visible = debugMode);
    }
});
