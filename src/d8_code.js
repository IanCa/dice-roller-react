import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import {
    DIE_COLORS
} from "./config.js"

const D8_SCALE = 0.7;

// D8 creation
export function createNumberedD8Geometry() {
    const verts = [
        new THREE.Vector3(1, 0, 0).multiplyScalar(D8_SCALE),
        new THREE.Vector3(-1, 0, 0).multiplyScalar(D8_SCALE),
        new THREE.Vector3(0, 1, 0).multiplyScalar(D8_SCALE),
        new THREE.Vector3(0, -1, 0).multiplyScalar(D8_SCALE),
        new THREE.Vector3(0, 0, 1).multiplyScalar(D8_SCALE),
        new THREE.Vector3(0, 0, -1).multiplyScalar(D8_SCALE),
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

export function createNumberedAtlasTexture() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 1024;
    canvas.height = 128;

    for (let i = 0; i < 8; i++) {
        const x = i * 128;
        ctx.fillStyle = DIE_COLORS['d8'];
        ctx.fillRect(x, 0, 128, 128);
        ctx.fillStyle = '#000';
        ctx.font = 'bold 48px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText((i + 1).toString(), x + 64, 64);
    }

    return new THREE.CanvasTexture(canvas);
}

export function createPhysicsD8Shape() {
    const verts = [
        new CANNON.Vec3(1.0 * D8_SCALE, 0, 0),
        new CANNON.Vec3(-1.0 * D8_SCALE, 0, 0),
        new CANNON.Vec3(0, 1.0 * D8_SCALE, 0),
        new CANNON.Vec3(0, -1.0 * D8_SCALE, 0),
        new CANNON.Vec3(0, 0, 1.0 * D8_SCALE),
        new CANNON.Vec3(0, 0, -1.0 * D8_SCALE),
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

export function getTopFaceIndex(quat, dice_geometry) {
    const up = new THREE.Vector3(0, 1, 0);
    const q = new THREE.Quaternion(quat.x, quat.y, quat.z, quat.w);
    const position = dice_geometry.getAttribute('position');
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