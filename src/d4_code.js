import * as THREE from "three";
import * as CANNON from 'cannon-es';
import {
    DIE_DRAW_COLORS
} from "./config.js"
const D4_SCALE = 0.5; // or try 0.25 if still too big

export function createPhysicsD4Shape() {
    const verts = [
        new CANNON.Vec3(1 * D4_SCALE, 1 * D4_SCALE, 1 * D4_SCALE),
        new CANNON.Vec3(-1 * D4_SCALE, -1 * D4_SCALE, 1 * D4_SCALE),
        new CANNON.Vec3(-1 * D4_SCALE, 1 * D4_SCALE, -1 * D4_SCALE),
        new CANNON.Vec3(1 * D4_SCALE, -1 * D4_SCALE, -1 * D4_SCALE),
    ];

    const faces = [
        [2, 1, 0], // Face 0
        [1, 3, 0], // Face 1
        [3, 2, 0], // Face 2
        [1, 2, 3], // Base
    ];

    return new CANNON.ConvexPolyhedron({vertices: verts, faces});
}
export function createNumberedD4Geometry() {
    const verts = [
        new THREE.Vector3(1, 1, 1).multiplyScalar(D4_SCALE),     // 0
        new THREE.Vector3(-1, -1, 1).multiplyScalar(D4_SCALE),   // 1
        new THREE.Vector3(-1, 1, -1).multiplyScalar(D4_SCALE),   // 2
        new THREE.Vector3(1, -1, -1).multiplyScalar(D4_SCALE),   // 3
    ];


    const faces = [
        [2, 1, 0], // Face 0
        [1, 3, 0], // Face 1
        [3, 2, 0], // Face 2
        [1, 2, 3], // Base
    ];

    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const uvs = [];

    const tileWidth = 1 / 4;

    for (let i = 0; i < faces.length; i++) {
        const [aIdx, bIdx, cIdx] = faces[i];
        const a = verts[aIdx];
        const b = verts[bIdx];
        const c = verts[cIdx];

        // Push vertex positions
        positions.push(a.x, a.y, a.z);
        positions.push(b.x, b.y, b.z);
        positions.push(c.x, c.y, c.z);

        // UV Mapping: map each triangle to its tile in the texture
        const tileOffsetU = i * tileWidth;

        // Fixed triangle UVs oriented so the "top" is always the top of the texture tile
        // (Assume point-down orientation for consistent text)
        const triUVs = [
            [tileOffsetU + tileWidth / 2, 1],            // top (will be at face center top)
            [tileOffsetU, 0],                            // bottom-left
            [tileOffsetU + tileWidth, 0]                 // bottom-right
        ];

        for (const [u, v] of triUVs) {
            uvs.push(u, v);
        }
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.computeVertexNormals();

    return geometry;
}
export function createNumberedD4AtlasTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;

    const ctx = canvas.getContext('2d');
    const tileCount = 4;
    const tileWidth = canvas.width / tileCount;
    const tileHeight = canvas.height;

    const faceVertexIndices = [
        [2, 1, 0], // Face 0
        [1, 3, 0], // Face 1
        [3, 2, 0], // Face 2
        [1, 2, 3], // Face 3
    ];

    const vertexToNumber = [1, 2, 3, 4];

    const cornerCoords = [
        { x: 0.5, y: 0.30 },  // Top
        { x: 0.18, y: 0.88 }, // Bottom left
        { x: 0.82, y: 0.88 }, // Bottom right
    ];

    // ctx.fillStyle = '#ffffff';
    ctx.fillStyle = DIE_DRAW_COLORS['d4'];
    ctx.font = 'bold 56px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < tileCount; i++) {
        const xOffset = i * tileWidth;

        // Fill face background
        ctx.fillRect(xOffset, 0, tileWidth, tileHeight);

        const face = faceVertexIndices[i];
        const centerX = xOffset + tileWidth / 2;
        const centerY = tileHeight / 2;

        for (let j = 0; j < 3; j++) {
            const number = vertexToNumber[face[j]];
            const { x, y } = cornerCoords[j];

            const baseX = xOffset + x * tileWidth;
            const baseY = y * tileHeight;
            const dx = centerX - baseX;
            const dy = centerY - baseY;
            const px = baseX + dx * 0.15;
            const py = baseY + dy * 0.15;
            const angle = Math.atan2(dy, dx) + Math.PI + (Math.PI / 2); // 180 + 90 degrees

            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(angle);
            ctx.fillStyle = '#000';
            ctx.fillText(number.toString(), 0, 0);
            ctx.restore();
        }
    }

    return new THREE.CanvasTexture(canvas);
}

export function getTopFaceIndexForD4(quat, dice_geometry) {
    const up = new THREE.Vector3(0, -1, 0);
    const q = new THREE.Quaternion(quat.x, quat.y, quat.z, quat.w);
    const position = dice_geometry.getAttribute('position');

    const faceNormals = [];
    const faceCenters = [];

    // Loop through each triangle face
    for (let i = 0; i < position.count; i += 3) {
        const a = new THREE.Vector3().fromBufferAttribute(position, i);
        const b = new THREE.Vector3().fromBufferAttribute(position, i + 1);
        const c = new THREE.Vector3().fromBufferAttribute(position, i + 2);

        const ab = new THREE.Vector3().subVectors(b, a);
        const ac = new THREE.Vector3().subVectors(c, a);
        const normal = new THREE.Vector3().crossVectors(ab, ac).normalize();
        faceNormals.push(normal);

        const center = new THREE.Vector3().addVectors(a, b).add(c).divideScalar(3);
        faceCenters.push(center);
    }

    let maxDot = -Infinity;
    let best = 0;

    for (let i = 0; i < faceNormals.length; i++) {
        const transformedNormal = faceNormals[i].clone().applyQuaternion(q);
        const dot = transformedNormal.dot(up);
        if (dot > maxDot) {
            maxDot = dot;
            best = i;
        }
    }

    const mapping = [3, 2, 1, 0]
    return mapping[best];
}