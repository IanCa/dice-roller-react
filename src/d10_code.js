// D10 creation
import * as THREE from "three";
import * as CANNON from 'cannon-es';
import {
    DIE_COLORS
} from "./config.js"

const D10_SCALE = 0.7;

// This entire file is a nightmare that needs improvement
const faceOrder = [1, 7, 3, 5, 9,
                            4, 10, 8, 2, 6];

export function createNumberedD10AtlasTexture() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 128 * 10;
    canvas.height = 128;

    for (let i = 0; i < 10; i++) {
        const x = i * 128;
        const number = i + 1;

        // Background
        ctx.fillStyle = DIE_COLORS['d10'];
        ctx.fillRect(x, 0, 128, 128);

        // Digit
        ctx.fillStyle = '#000';
        ctx.font = 'bold 42px sans-serif'; // Smaller than 48px
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Shift up by ~5% of 128px = ~6.4px
        const yCenter = 64 - 6;

        ctx.fillText(number.toString(), x + 64, yCenter);

        // Underline for 6 and 9
        if (number === 6 || number === 9) {
            const underlineWidth = 40;
            const underlineHeight = 4;

            // Adjust underline to match new text position
            const underlineY = yCenter + 15; // Smaller font = tighter underline offset

            ctx.fillRect(
                x + 64 - underlineWidth / 2,
                underlineY,
                underlineWidth,
                underlineHeight
            );
        }
    }

    return new THREE.CanvasTexture(canvas);
}
export function createNumberedD10Geometry() {
    const geometry = new THREE.BufferGeometry();

    const radius = D10_SCALE;
    const zOffset = radius * 0.10;

    const verts = [];
    const faces = [];

    const angleStep = (2 * Math.PI) / 10;

    // Create 10 alternating-height equator vertices
    for (let i = 0; i < 10; i++) {
        const angle = i * angleStep;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        const z = (i % 2 === 0) ? zOffset : -zOffset;
        verts.push(new THREE.Vector3(x, z, y)); // Y-up
    }

    const topIndex = verts.length;
    verts.push(new THREE.Vector3(0, radius, 0)); // Top pole

    const bottomIndex = verts.length;
    verts.push(new THREE.Vector3(0, -radius, 0)); // Bottom pole

    // Create 20 triangle faces (10 kites = 2 triangles each)
    for (let i = 0; i < 10; i++) {
        const a = i;
        const b = (i + 1) % 10;
        faces.push([topIndex, b, a]);
    }

    for (let i = 0; i < 10; i++) {
        const a = (i + 1) % 10;
        const b = (i + 2) % 10;
        faces.push([bottomIndex, a, b]);
    }

    // === Build geometry
    const positions = [];
    const uvs = [];
    const tileWidth = 1 / 10;

    for (let i = 0; i < 20; i += 2) {
        const triA = faces[i];
        const triB = faces[(i + 1) % 20]; // wraps 19 → 0

        const a1 = verts[triA[1]];
        const b1 = verts[triA[2]];
        const pole = verts[triA[0]];

        const a2 = verts[triB[1]];
        const b2 = verts[triB[2]];

        const kiteVerts = [pole, a1, b1, a2, b2];
        const center = kiteVerts.reduce((acc, v) => acc.add(v.clone()), new THREE.Vector3()).divideScalar(kiteVerts.length);

        const baseVec = new THREE.Vector3().subVectors(b1, a1);
        const sideVec = new THREE.Vector3().subVectors(pole, a1);
        const normal = new THREE.Vector3().crossVectors(baseVec, sideVec).normalize();

        const fallback = Math.abs(normal.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
        const xAxis = new THREE.Vector3().crossVectors(fallback, normal).normalize();
        const yAxis = new THREE.Vector3().crossVectors(normal, xAxis).normalize();

        const project = (v) => {
            const offset = new THREE.Vector3().subVectors(v, center);
            return {
                u: offset.dot(xAxis),
                v: offset.dot(yAxis)
            };
        };

        const uvRaw = kiteVerts.map(project);
        const maxRange = Math.max(...uvRaw.flatMap(uv => [Math.abs(uv.u), Math.abs(uv.v)])) || 1;

        const kiteIndex = faceOrder[i / 2] - 1;
        const shouldFlip = i / 2  >= 5;
        const tileOffset = kiteIndex * tileWidth;

        const mapUV = (uv) => {
            let u = uv.u / maxRange / 2 + 0.5;
            let v = uv.v / maxRange / 2 + 0.5;
            if (shouldFlip) {
                u = 1 - u;
                v = 1 - v;
            }
            return [tileOffset + u * tileWidth, v];
        };

        const [uvPole, uvA1, uvB1, uvA2, uvB2] = uvRaw.map(mapUV);

        // Triangle 1: pole → a1 → b1
        positions.push(pole.x, pole.y, pole.z);
        positions.push(a1.x, a1.y, a1.z);
        positions.push(b1.x, b1.y, b1.z);
        uvs.push(...uvPole, ...uvA1, ...uvB1);

        // Triangle 2: pole → a2 → b2
        positions.push(pole.x, pole.y, pole.z);
        positions.push(a2.x, a2.y, a2.z);
        positions.push(b2.x, b2.y, b2.z);
        uvs.push(...uvPole, ...uvA2, ...uvB2);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.computeVertexNormals();

    return geometry;
}

export function createPhysicsD10Shape() {
    const radius = D10_SCALE;
    const numFaces = 10;
    const zOffset = radius * 0.1;

    const verts = [];
    const faces = [];

    const rotateX90 = (v) => new CANNON.Vec3(v.x, -v.z, v.y);
    const vec3 = (x, y, z) => new CANNON.Vec3(x, y, z);

    // === Step 1: Add top and bottom poles
    const topPoleIndex = verts.length;
    verts.push(rotateX90(vec3(0, 0, radius)));

    const bottomPoleIndex = verts.length;
    verts.push(rotateX90(vec3(0, 0, -radius)));

    // === Step 2: Add 10 equator vertices around a circle, alternating Z
    const equatorIndices = [];
    for (let i = 0; i < numFaces; i++) {
        const angle = (i / numFaces) * Math.PI * 2 + Math.PI * 2 / 10;
        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);
        const z = (i % 2 === 0) ? zOffset : -zOffset;
        const index = verts.length;
        verts.push(rotateX90(vec3(x, y, z)));
        equatorIndices.push(index);
    }

    for (let i = 0; i < numFaces; i++) {
        const a = equatorIndices[i];
        const b = equatorIndices[(i + 1) % numFaces];
        faces.push([topPoleIndex, a, b]);
    }

    // Bottom faces after
    for (let i = 0; i < numFaces; i++) {
        const a = equatorIndices[(i + 1) % numFaces];
        const b = equatorIndices[(i + 2) % numFaces];
        faces.push([bottomPoleIndex, b, a]);
    }

    return new CANNON.ConvexPolyhedron({ vertices: verts, faces: faces });
}


export function getTopFaceIndexForD10(quat, dice_geometry) {
    const up = new THREE.Vector3(0, 1, 0);
    const q = new THREE.Quaternion(quat.x, quat.y, quat.z, quat.w);
    const position = dice_geometry.getAttribute('position');

    const faceNormals = [];

    for (let i = 0; i < position.count; i += 3) {
        const a = new THREE.Vector3().fromBufferAttribute(position, i);
        const b = new THREE.Vector3().fromBufferAttribute(position, i + 1);
        const c = new THREE.Vector3().fromBufferAttribute(position, i + 2);

        const ab = new THREE.Vector3().subVectors(b, a);
        const ac = new THREE.Vector3().subVectors(c, a);
        const normal = new THREE.Vector3().crossVectors(ab, ac).normalize();

        // Transform normal into world space
        const worldNormal = normal.clone().applyQuaternion(q);
        const dot = worldNormal.dot(up);

        faceNormals.push({ triangleIndex: i / 3, dot });
    }

    // Sort faces by upward-facing strength
    faceNormals.sort((a, b) => b.dot - a.dot);

    // Pick the most upward triangle
    const topTri = faceNormals[0].triangleIndex;
    const kiteIndex = faceOrder[Math.floor(topTri / 2)] - 1;

    return kiteIndex;
}