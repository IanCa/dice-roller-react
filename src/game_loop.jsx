import React, {useEffect, useRef, useContext, useState} from 'react';
import { createDiceSet, detectDiceState } from './dice_shared'; // assuming diceTypeCounts is in same file
import DiceCountContext from './DiceCountContext.js';
import * as THREE from 'three';
import GlobalContext from "./GlobalConext.js";
import { useDiceResults } from './DiceResultsProvider.jsx';
import TabbedMenu from "./controls_menu.jsx";


const clock = new THREE.Clock();

export default function Game_loop() {
    const [resetRequested, setResetRequested] = useState(false);
    const { dice_results, setDiceResults } = useDiceResults();
    const { lastUpdateFromUrl, setLastUpdateFromUrl, diceTypeCounts, setDiceTypeCounts } = useContext(DiceCountContext);
    const { debugMode, setDebugMode } = useContext(GlobalContext);
    const { scene, camera, world, controls, renderer, diceMaterial} = useContext(GlobalContext);

    const canvasRef = useRef(null);
    const frameRef = useRef(null);

    useEffect(() => {
        if (canvasRef.current && !canvasRef.current.hasChildNodes()) {
            canvasRef.current.appendChild(renderer.domElement);
        }
        // // Initial setup
        // createDiceSet(diceTypeCounts, scene, world, diceMaterial, debugMode);
        // //updateUI();

        frameRef.current = requestAnimationFrame(animate);

        return () => {
            cancelAnimationFrame(frameRef.current);
        };
    }, []);

    useEffect(() => {
        if (resetRequested) {
            setDiceTypeCounts(diceTypeCountsRef.current);
            setLastUpdateFromUrl(true);
            setResetRequested(false);
        }
    }, [resetRequested]);

    useEffect(() => {
        function handleResize() {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
            // todo: this is too hacky
            setDiceResults(dice_results);
        }

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, [camera, renderer]);

    useEffect(() => {
        // console.log('debugMode updated:', debugMode);
        world.dice.forEach(d => {
            d.physics.debugMesh.visible = debugMode;
        });
    }, [debugMode]);

    // useEffect(() => {
    //     console.log('dice_results updated:', dice_results);
    // }, [dice_results]);

    useEffect(() => {
        if (lastUpdateFromUrl) {
            createDiceSet(diceTypeCounts, scene, world, diceMaterial, debugMode)
        }
    }, [diceTypeCounts, lastUpdateFromUrl]);

    const diceTypeCountsRef = useRef(diceTypeCounts);

    // keep ref updated
    useEffect(() => {
        diceTypeCountsRef.current = diceTypeCounts;
    }, [diceTypeCounts]);

    useEffect(() => {
        function handleKeyDown(e) {
            if (e.key.toLowerCase() === 'r') {
                setDiceTypeCounts(diceTypeCountsRef.current); // Use ref for latest
                setLastUpdateFromUrl(true);
            }
            if (e.key.toLowerCase() === 'd') {
                setDebugMode(prev => !prev);
            }
        }

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    let diceUpdateDelta = 0;

    function animate() {
        frameRef.current = requestAnimationFrame(animate);
        const delta = clock.getDelta();
        world.step(1 / 60, delta, 3);

        world.dice.forEach(d => {
            d.physics.mesh.position.copy(d.physics.body.position);
            d.physics.mesh.quaternion.copy(d.physics.body.quaternion);
            d.physics.debugMesh.position.copy(d.physics.body.position);
            d.physics.debugMesh.quaternion.copy(d.physics.body.quaternion);
        });

        if (world.dice.length > 100) {
            diceUpdateDelta += delta;
            if (diceUpdateDelta >= 1.0) {
                const { allStopped, dice_results } = detectDiceState(world);
                setDiceResults(dice_results);
                diceUpdateDelta = 0; // reset after running
            }
        } else {
            const {allStopped, dice_results} = detectDiceState(world);
            setDiceResults(dice_results);
        }

        controls.update();
        renderer.render(scene, camera);
    }

    return (
        <div>
        <TabbedMenu onRequestReset={() => setResetRequested(true)} />
        <div
            id="canvas-container"
            ref={canvasRef}
            style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}
        >

            {/* Other overlays, UI, etc */}
        </div>
        </div>
    );
}