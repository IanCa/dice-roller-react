import * as THREE from "three";
import * as CANNON from 'cannon-es';

import {
    DIE_COLORS
} from "./config.js"

// D20 creation
export function createNumberedD20AtlasTexture() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const tileSize = 128;
    const totalFaces = 20;
    canvas.width = tileSize * totalFaces;
    canvas.height = tileSize;

    for (let i = 0; i < totalFaces; i++) {
        const x = i * tileSize;
        const number = i + 1;

        ctx.fillStyle = DIE_COLORS['d20'];
        ctx.fillRect(x, 0, tileSize, tileSize);

        ctx.save();
        const centerX = x + tileSize / 2;
        const centerY = tileSize / 2;
        ctx.translate(centerX, centerY);

        ctx.fillStyle = '#000';
        ctx.font = 'bold 52px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(number.toString(), 0, 0);

        if (number === 6 || number === 9) {
            ctx.fillRect(-15, 26, 30, 3);
        }

        ctx.restore();
    }

    return new THREE.CanvasTexture(canvas);
}


export function createNumberedD20Geometry() {
    const base = new THREE.IcosahedronGeometry(1);
    const geometry = new THREE.BufferGeometry().copy(base.toNonIndexed());

    const position = geometry.getAttribute('position');
    const triangleCount = position.count / 3;
    const tileWidth = 1 / 20;

    const uvs = [];
    let faceIndex = -1;

    for (let i = 0; i < triangleCount; i++) {
        faceIndex++; // each triangle is a unique face

        const a = new THREE.Vector3().fromBufferAttribute(position, i * 3);
        const b = new THREE.Vector3().fromBufferAttribute(position, i * 3 + 1);
        const c = new THREE.Vector3().fromBufferAttribute(position, i * 3 + 2);

        const faceCenter = new THREE.Vector3().add(a).add(b).add(c).divideScalar(3);
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

        const tileOffsetU = faceIndex * tileWidth;
        const shouldRotate180 = ((faceIndex + 1) % 2 === 0);

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

export function createPhysicsD20Shape() {
    const geometry = new THREE.IcosahedronGeometry(1);
    const position = geometry.getAttribute('position');

    const verts = [];
    for (let i = 0; i < position.count; i++) {
        verts.push(new THREE.Vector3().fromBufferAttribute(position, i));
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
    for (let i = 0; i < indexMap.length; i += 3) {
        faces.push([
            indexMap[i],
            indexMap[i + 1],
            indexMap[i + 2]
        ]);
    }

    return new CANNON.ConvexPolyhedron({
        vertices: uniqueVerts,
        faces: faces
    });
}


export function getTopFaceIndexForD20(quat, geometry) {
    const up = new THREE.Vector3(0, 1, 0);
    const q = new THREE.Quaternion(quat.x, quat.y, quat.z, quat.w);
    const position = geometry.getAttribute('position');

    let bestDot = -Infinity;
    let bestFaceIndex = 0;

    // Each 3 vertices = 1 triangle face
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
            bestFaceIndex = i / 3;
        }
    }

    return bestFaceIndex;
}



