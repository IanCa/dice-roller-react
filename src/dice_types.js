

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
import * as THREE from "three";

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

export {diceTypes}