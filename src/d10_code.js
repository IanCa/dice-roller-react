// D10 creation
import * as THREE from "three";
import * as CANNON from 'cannon-es';
import {
    DIE_DRAW_COLORS
} from "./config.js"

const D10_SCALE = 0.7;

export function createNumberedD10AtlasTexture() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 128 * 10;
    canvas.height = 128;

    for (let i = 0; i < 10; i++) {
        const x = i * 128;
        const number = i + 1;

        // Background
        ctx.fillStyle = DIE_DRAW_COLORS['d10'];
        ctx.fillRect(x, 0, 128, 128);

        // Digit
        ctx.fillStyle = '#000';
        ctx.font = 'bold 48px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(number.toString(), x + 64, 64);

        // Underline for 6 and 9
        if (number === 6 || number === 9) {
            const underlineWidth = 40;
            const underlineHeight = 4;

            // Draw underline just below the text, centered
            const underlineY = 64 + 36; // Slightly below the text (was 64 + 32)

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

    const verts = [];
    const faces = [];

    const top = new THREE.Vector3(0, 1 * D10_SCALE, 0);
    const bottom = new THREE.Vector3(0, -1 * D10_SCALE, 0);
    const radius = D10_SCALE;
    const angleStep = Math.PI * 2 / 5;

    // Create 5 equator vertices in a regular pentagon
    for (let i = 0; i < 5; i++) {
        const angle = i * angleStep;
        verts.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
    }

    verts.push(top);    // index 5
    verts.push(bottom); // index 6

    // 🔁 Reversed winding order for correct facing
    for (let i = 0; i < 5; i++) {
        const next = (i + 1) % 5;
        faces.push([next, i, 5]); // Top pole triangle — reversed
    }

    for (let i = 0; i < 5; i++) {
        const next = (i + 1) % 5;
        faces.push([i, next, 6]); // Bottom pole triangle — reversed
    }

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

        // Project triangle to 2D for texture mapping
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

        const shouldRotate180 = (i >= 5); // faces 5–9 (digits 6–10)

        const packUV = (uv) => {
            let u = (uv.u / maxRange / 2 + 0.5);
            let v = (uv.v / maxRange / 2 + 0.5);

            if (shouldRotate180) {
                u = 1 - u;
                v = 1 - v;
            }

            return [
                tileOffsetU + u * tileWidth,
                v
            ];
        };

        uvs.push(...packUV(uvA), ...packUV(uvB), ...packUV(uvC));
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.computeVertexNormals();

    return geometry;
}

export function createPhysicsD10Shape() {
    const radius = D10_SCALE;
    const numEquatorVerts = 5;

    const verts = [];

    // Rotate vector -90° around X-axis to convert Z-up to Y-up
    const rotateX90 = (v) => {
        return new CANNON.Vec3(v.x, -v.z, v.y);
    };

    // Top and bottom poles (aligned with Z axis originally, now aligned with Y)
    verts.push(rotateX90(new CANNON.Vec3(0, 0, radius)));  // Vertex 0 (Top pole)
    verts.push(rotateX90(new CANNON.Vec3(0, 0, -radius))); // Vertex 1 (Bottom pole)

    // Equator vertices arranged in a regular pentagon around Z axis, rotated
    for (let i = 0; i < numEquatorVerts; i++) {
        const angle = (i / numEquatorVerts) * Math.PI * 2;
        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);
        const z = 0;
        verts.push(rotateX90(new CANNON.Vec3(x, y, z))); // Vertices 2 to 6
    }

    const faces = [];

    // Faces from top pole to equator
    for (let i = 0; i < numEquatorVerts; i++) {
        const a = 0;  // top pole
        const b = 2 + i;
        const c = 2 + ((i + 1) % numEquatorVerts);
        faces.push([a, b, c]);
    }

    // Faces from bottom pole to equator
    for (let i = 0; i < numEquatorVerts; i++) {
        const a = 1;  // bottom pole
        const b = 2 + ((i + 1) % numEquatorVerts);
        const c = 2 + i;
        faces.push([a, b, c]);
    }

    return new CANNON.ConvexPolyhedron({vertices: verts, faces: faces});
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

        faceNormals.push({index: i / 3, dot});
    }

    // Sort faces by how upward-facing they are
    faceNormals.sort((a, b) => b.dot - a.dot);

    // Get top 2 candidates
    const topTwo = faceNormals.slice(0, 2);

    // Pick one randomly
    const chosen = Math.random() < 0.5 ? topTwo[0] : topTwo[1];

    return chosen.index;
}
