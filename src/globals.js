import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import {OrbitControls} from "three/addons/controls/OrbitControls.js";


export let scene = new THREE.Scene();
export let camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 15, 20);
camera.lookAt(0, 0, 0);

export let renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5, 10, 7.5);
scene.add(light);

export let world = new CANNON.World({gravity: new CANNON.Vec3(0, -9.82, 0)});
world.broadphase = new CANNON.NaiveBroadphase();

export let diceMaterial = new CANNON.Material('dice');
world.defaultContactMaterial = new CANNON.ContactMaterial(diceMaterial, diceMaterial, {
    friction: 0.4,
    restitution: 0.6
});

export let controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.screenSpacePanning = false;
controls.minDistance = 5;
controls.maxDistance = 50;
controls.target.set(0, 0, 0);
controls.update();

export let debugMode = false;

export function toggleDebug() {
    debugMode = !debugMode;
}