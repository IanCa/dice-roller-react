import React, {useMemo, useState} from 'react';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import {OrbitControls} from "three/addons/controls/OrbitControls.js";
import GlobalContext from './GlobalConext.js';


export default function GlobalProvider({ children }) {
    const [debugMode, setDebugMode] = useState(false);

    const engine_value = useMemo(() => {
        // Setup Three.js scene
        const scene = new THREE.Scene();

        const camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        camera.position.set(0, 15, 20);
        camera.lookAt(0, 0, 0);

        const renderer = new THREE.WebGLRenderer({antialias: true});
        renderer.setSize(window.innerWidth, window.innerHeight);

        scene.add(new THREE.AmbientLight(0xffffff, 0.6));

        const light = new THREE.DirectionalLight(0xffffff, 1);
        light.position.set(5, 10, 7.5);
        scene.add(light);

        // Setup Cannon world
        const world = new CANNON.World({
            gravity: new CANNON.Vec3(0, -9.82, 0),
        });
        world.broadphase = new CANNON.NaiveBroadphase();
        world.dice = [];

        const diceMaterial = new CANNON.Material('dice');
        world.defaultContactMaterial = new CANNON.ContactMaterial(
            diceMaterial,
            diceMaterial,
            {
                friction: 0.4,
                restitution: 0.6,
            }
        );

        // Orbit controls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.screenSpacePanning = false;
        controls.minDistance = 5;
        controls.maxDistance = 50;
        controls.target.set(0, 0, 0);
        controls.update();

        // How to toggle debug
        // setDebugMode(prev => !prev);

        return {
            scene,
            camera,
            renderer,
            world,
            controls,
        };
    }, []); // Create once and memoize

    const value = {
        ...engine_value,   // spread the stable engine objects
        debugMode,
        setDebugMode
    };

    return (
        <GlobalContext.Provider value={value}>
            {children}
        </GlobalContext.Provider>
    );
}
