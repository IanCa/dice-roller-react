import * as THREE from "three";
import * as CANNON from 'cannon-es';
import {
    DIE_COLORS
} from "./config.js"

export function createNumberedD6AtlasTexture() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 128 * 6;
    canvas.height = 128;

    for (let i = 0; i < 6; i++) {
        const x = i * 128;
        ctx.fillStyle = DIE_COLORS['d6'];
        ctx.fillRect(x, 0, 128, 128);
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 64px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText((i + 1).toString(), x + 64, 64);
    }

    return new THREE.CanvasTexture(canvas);
} // D6 creation
export function createNumberedD6Geometry() {
    const tileSize = 1 / 6;
    const geometry = new THREE.BufferGeometry();

    const positions = [];
    const uvs = [];

    const faces = [
        // Front (+Z)
        {normal: [0, 0, 1], u: [0, 1], v: [1, 1, 0, 0], tile: 0},
        // Back (-Z)
        {normal: [0, 0, -1], u: [1, 0], v: [1, 1, 0, 0], tile: 1},
        // Right (+X)
        {normal: [1, 0, 0], u: [0, 1], v: [1, 1, 0, 0], tile: 2},
        // Left (-X)
        {normal: [-1, 0, 0], u: [1, 0], v: [1, 1, 0, 0], tile: 3},
        // Top (+Y)
        {normal: [0, 1, 0], u: [0, 1], v: [0, 0, 1, 1], tile: 4},
        // Bottom (-Y)
        {normal: [0, -1, 0], u: [0, 1], v: [1, 1, 0, 0], tile: 5},
    ];

    const verts = [
        [-0.5, -0.5, 0.5],
        [0.5, -0.5, 0.5],
        [0.5, 0.5, 0.5],
        [-0.5, 0.5, 0.5],

        [-0.5, -0.5, -0.5],
        [0.5, -0.5, -0.5],
        [0.5, 0.5, -0.5],
        [-0.5, 0.5, -0.5],
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

export function createPhysicsD6Shape(size = 0.5) {
    const s = size;
    const verts = [
        new CANNON.Vec3(-s, -s, -s),
        new CANNON.Vec3(-s, -s, s),
        new CANNON.Vec3(-s, s, -s),
        new CANNON.Vec3(-s, s, s),
        new CANNON.Vec3(s, -s, -s),
        new CANNON.Vec3(s, -s, s),
        new CANNON.Vec3(s, s, -s),
        new CANNON.Vec3(s, s, s),
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

export function getTopFaceIndexForD6(quat) {
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