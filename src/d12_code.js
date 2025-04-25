import * as THREE from "three";
import * as CANNON from 'cannon-es';

import {
    DIE_COLORS
} from "./config.js"

// D12 creation
export function createNumberedD12AtlasTexture() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const tileSize = 128;
    const totalFaces = 12;
    canvas.width = tileSize * totalFaces;
    canvas.height = tileSize;

    for (let i = 0; i < totalFaces; i++) {
        const x = i * tileSize;
        const number = i + 1;

        // Background
        ctx.fillStyle = DIE_COLORS['d12'];
        ctx.fillRect(x, 0, tileSize, tileSize);

        // Save context for transformations
        ctx.save();

        // Center of the tile
        const centerX = x + tileSize / 2;
        const centerY = tileSize / 2;

        ctx.translate(centerX, centerY);

        // Number styling
        ctx.fillStyle = '#000';
        ctx.font = 'bold 52px sans-serif'; // Smaller than before
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(number.toString(), 0, 0);

        // Underline for 6 and 9
        if (number === 6 || number === 9) {
            const underlineWidth = 30;
            const underlineHeight = 3;
            const underlineY = 26; // Slightly below the number

            ctx.fillRect(
                -underlineWidth / 2,
                underlineY,
                underlineWidth,
                underlineHeight
            );
        }

        ctx.restore();
    }

    return new THREE.CanvasTexture(canvas);
}

export function createNumberedD12Geometry() {
    const base = new THREE.DodecahedronGeometry(.75);
    const geometry = new THREE.BufferGeometry().copy(base.toNonIndexed());

    const position = geometry.getAttribute('position');
    const triangleCount = position.count / 3;

    const uvs = [];
    const tileWidth = 1 / 12;
    let faceCenter = new THREE.Vector3();
    // Track how many faces we've seen
    let labelNumber = -1;
    for (let i = 0; i < triangleCount; i++) {
        // Start a new label every 3 triangles (1 pentagon)
        if (i % 3 === 0) labelNumber++;

        const a = new THREE.Vector3().fromBufferAttribute(position, i * 3);
        const b = new THREE.Vector3().fromBufferAttribute(position, i * 3 + 1);
        const c = new THREE.Vector3().fromBufferAttribute(position, i * 3 + 2);

        // Every 3 triangles = 1 face
        if (i % 3 === 0) {
            // Grab all 9 vertices for the face
            const a1 = new THREE.Vector3().fromBufferAttribute(position, i * 3);
            const b1 = new THREE.Vector3().fromBufferAttribute(position, i * 3 + 1);
            const c1 = new THREE.Vector3().fromBufferAttribute(position, i * 3 + 2);
            const a2 = new THREE.Vector3().fromBufferAttribute(position, (i + 1) * 3);
            const b2 = new THREE.Vector3().fromBufferAttribute(position, (i + 1) * 3 + 1);
            const c2 = new THREE.Vector3().fromBufferAttribute(position, (i + 1) * 3 + 2);
            const a3 = new THREE.Vector3().fromBufferAttribute(position, (i + 2) * 3);
            const b3 = new THREE.Vector3().fromBufferAttribute(position, (i + 2) * 3 + 1);
            const c3 = new THREE.Vector3().fromBufferAttribute(position, (i + 2) * 3 + 2);

            // Average all 9 vertices to get true face center
            faceCenter = new THREE.Vector3()
                .add(a1).add(b1).add(c1)
                .add(a2).add(b2).add(c2)
                .add(a3).add(b3).add(c3)
                .divideScalar(9);
        }
        const ab = new THREE.Vector3().subVectors(b, a);
        const ac = new THREE.Vector3().subVectors(c, a);
        const normal = new THREE.Vector3().crossVectors(ab, ac).normalize();

        const upVec = new THREE.Vector3(0, 1, 0);
        const fallbackUp = new THREE.Vector3(1, 0, 0);
        const faceY = Math.abs(normal.dot(upVec)) > 0.99 ? fallbackUp : upVec;

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

        const tileOffsetU = labelNumber * tileWidth;
        const shouldRotate180 = ((labelNumber + 1) % 2 === 0); // Even-numbered faces

        const packUV = (uv) => {
            let u = uv.u / maxRange / 2 + 0.5;
            let v = uv.v / maxRange / 2 + 0.5;
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

    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.computeVertexNormals();

    return geometry;
}

export function createPhysicsD12Shape() {
    const geometry = new THREE.DodecahedronGeometry(.75);
    const position = geometry.getAttribute('position');
    const verts = [];

    for (let i = 0; i < position.count; i++) {
        const v = new THREE.Vector3().fromBufferAttribute(position, i);
        verts.push(v);
    }

    const uniqueVerts = [];
    const vertMap = new Map();
    const indexMap = [];

    for (let i = 0; i < verts.length; i++) {
        const key = verts[i].toArray().map(n => n.toFixed(5)).join(',');
        if (!vertMap.has(key)) {
            vertMap.set(key, uniqueVerts.length);
            uniqueVerts.push(new CANNON.Vec3(...verts[i].toArray()));
        }
        indexMap[i] = vertMap.get(key);
    }

    const faces = [];
    for (let i = 0; i < indexMap.length; i += 9) {
        const rawFace = [
            indexMap[i], indexMap[i + 1], indexMap[i + 2],
            indexMap[i + 3], indexMap[i + 4], indexMap[i + 5],
            indexMap[i + 6], indexMap[i + 7], indexMap[i + 8],
        ];

        // Deduplicate, but preserve order
        const face = [];
        for (let idx of rawFace) {
            if (!face.includes(idx)) face.push(idx);
        }

        if (face.length !== 5) {
            console.warn("Unexpected face length:", face);
            continue;
        }

        // Step 1: get actual vertex positions
        const verts3D = face.map(i => new THREE.Vector3(
            uniqueVerts[i].x,
            uniqueVerts[i].y,
            uniqueVerts[i].z
        ));

        // Step 2: compute face center
        const center = verts3D.reduce((acc, v) => acc.add(v), new THREE.Vector3()).divideScalar(5);

        // Step 3: compute normal
        const normal = new THREE.Vector3()
            .crossVectors(
                new THREE.Vector3().subVectors(verts3D[1], verts3D[0]),
                new THREE.Vector3().subVectors(verts3D[2], verts3D[0])
            )
            .normalize();

        // Step 4: define local x/y axes
        const xAxis = new THREE.Vector3().subVectors(verts3D[0], center).normalize();
        const yAxis = new THREE.Vector3().crossVectors(normal, xAxis).normalize();

        // Step 5: sort by polar angle around center
        const withAngles = verts3D.map((v, i) => {
            const rel = new THREE.Vector3().subVectors(v, center);
            return {
                index: face[i],
                angle: Math.atan2(rel.dot(yAxis), rel.dot(xAxis))
            };
        });

        withAngles.sort((a, b) => a.angle - b.angle);
        const sortedFace = withAngles.map(v => v.index);

        faces.push(sortedFace);
    }

    return new CANNON.ConvexPolyhedron({
        vertices: uniqueVerts,
        faces: faces
    });
}

export function getTopFaceIndexForD12(quat, dice_geometry) {
    const up = new THREE.Vector3(0, 1, 0);
    const q = new THREE.Quaternion(quat.x, quat.y, quat.z, quat.w);
    const position = dice_geometry.getAttribute('position');

    let bestDot = -Infinity;
    let bestIndex = 0;

    for (let i = 0; i < position.count; i += 3) {
        const a = new THREE.Vector3().fromBufferAttribute(position, i);
        const b = new THREE.Vector3().fromBufferAttribute(position, i + 1);
        const c = new THREE.Vector3().fromBufferAttribute(position, i + 2);

        const ab = new THREE.Vector3().subVectors(b, a);
        const ac = new THREE.Vector3().subVectors(c, a);
        const normal = new THREE.Vector3().crossVectors(ab, ac).normalize();
        const worldNormal = normal.clone().applyQuaternion(q);
        const dot = worldNormal.dot(up);

        if (dot > bestDot) {
            bestDot = dot;
            bestIndex = i / 3;
        }
    }

    return Math.floor(bestIndex / 3);
}