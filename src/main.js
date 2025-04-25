import * as THREE from 'three';
import {camera, controls, debugMode, renderer, scene, toggleDebug, world} from './globals.js';
import {actuallyResetDice, createDiceSet, detectDiceState, dice} from "./dice_shared.js";
import {renderResults} from "./render_results.js";

const urlParams = new URLSearchParams(window.location.search);

const MAX_DICE = 1000
const D4_COUNT = parseInt(urlParams.get('d4')) || 0;
const D6_COUNT = parseInt(urlParams.get('d6')) || 0;
const D8_COUNT = parseInt(urlParams.get('d8')) || 0;
const D10_COUNT = parseInt(urlParams.get('d10')) || 0;
const D12_COUNT = parseInt(urlParams.get('d12')) || 0;
const D20_COUNT = parseInt(urlParams.get('d20')) || 0;
let ADD_COUNT = parseInt(urlParams.get('add')) || 0;
const dice_string = urlParams.get("dice") || ""


let diceTypeCounts = {
    d4: D4_COUNT,
    d6: D6_COUNT,
    d8: D8_COUNT,
    d10: D10_COUNT,
    d12: D12_COUNT,
    d20: D20_COUNT
};

tryLoadDiceParameter();

function tryLoadDiceParameter() {
    if (dice_string != "") {
        let loaded_dice = parseDndDiceNotation(dice_string);
        for (let key in diceTypeCounts) {
            if (key.startsWith("d")) {
                diceTypeCounts[key] = 0;
                ADD_COUNT = 0;
            }
        }

        for (let key in loaded_dice) {
            if (key.startsWith("d")) {
                diceTypeCounts[key] = loaded_dice[key];
            } else {
                ADD_COUNT = loaded_dice[key];
            }
        }
    }
}

if (Object.values(diceTypeCounts).every(count => count === 0)) {
    diceTypeCounts.d8 = 2; // default fallback
}

function parseDndDiceNotation(notation) {
    const validDice = new Set(["d4", "d6", "d8", "d10", "d12", "d20"]);
    const result = {};
    const pattern = /([+-]?\d*)d(\d+)|([+-]?\d+)/gi;
    let match;
    while ((match = pattern.exec(notation)) !== null) {
        if (match[1] !== undefined && match[2] !== undefined) {
            // Dice term
            const dieType = `d${match[2]}`;
            if (!validDice.has(dieType)) continue; // skip invalid dice

            const count = parseInt(match[1]) || (match[1] === "-" ? -1 : 1);
            result[dieType] = (result[dieType] || 0) + count;
        } else if (match[3] !== undefined) {
            // Flat modifier
            const value = parseInt(match[3]);
            result["add"] = (result["add"] || 0) + value;
        }
    }

    return result;
}


export function checkDiceStopped() {
    const {allStopped, dice_results} = detectDiceState();

    if (allStopped && dice_results.every(x => x !== null)) {
        renderResults(dice_results, ADD_COUNT);
    }
}

function resetDice() {
    actuallyResetDice();

    // Clear label bar
    const labelBar = document.getElementById('labelBar');
    if (labelBar) labelBar.innerHTML = '';

    // Clear SVG lines
    const svg = document.getElementById('lineOverlay');
    if (svg) while (svg.firstChild) svg.removeChild(svg.firstChild);
    document.getElementById('result').innerText = 'Rolling...';

    // Reset and recreate dice
    createDiceSet(diceTypeCounts);
}

const updateUI = () => {
    document.getElementById('d20Count').textContent = diceTypeCounts.d20;
    document.getElementById('d12Count').textContent = diceTypeCounts.d12;
    document.getElementById('d10Count').textContent = diceTypeCounts.d10;
    document.getElementById('d8Count').textContent = diceTypeCounts.d8;
    document.getElementById('d6Count').textContent = diceTypeCounts.d6;
    document.getElementById('d4Count').textContent = diceTypeCounts.d4;
};


const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    world.step(1 / 60, delta, 3);

    dice.forEach(d => {
        d.mesh.position.copy(d.body.position);
        d.mesh.quaternion.copy(d.body.quaternion);
        d.debugMesh.position.copy(d.body.position);
        d.debugMesh.quaternion.copy(d.body.quaternion);
    });
    checkDiceStopped();
    controls.update(); // for damping
    renderer.render(scene, camera);
}

updateUI()
createDiceSet(diceTypeCounts);
animate();

// Add gui(most of it anyway)
document.getElementById('resetButton').addEventListener('click', resetDice);
window.addEventListener('keydown', e => {
    if (e.key.toLowerCase() === 'r') resetDice();
    if (e.key.toLowerCase() === 'd') {
        toggleDebug();
        dice.forEach(d => d.debugMesh.visible = debugMode);
    }
});

export const changeCount = (type, delta) => {
    if (!diceTypeCounts.hasOwnProperty(type)) return;

    diceTypeCounts[type] = Math.max(0, Math.min(MAX_DICE, diceTypeCounts[type] + delta));
    const total = Object.values(diceTypeCounts).reduce((sum, n) => sum + n, 0);

    // If we're over the limit, trim the excess
    const excess = total - MAX_DICE;
    if (excess > 0) {
        let maxType = null;
        let maxCount = -Infinity;

        for (const t in diceTypeCounts) {
            if (t === type) continue; // skip the just-modified type
            if (diceTypeCounts[t] > maxCount) {
                maxCount = diceTypeCounts[t];
                maxType = t;
            }
        }

        if (maxType) {
            diceTypeCounts[maxType] = Math.max(0, diceTypeCounts[maxType] - excess);
        }
    }

    updateUI();
};

window.changeCount = changeCount;

document.addEventListener('click', function (event) {
    const d10Details = document.getElementById('d10-details');

    // If the click is *outside* the <details> element, and it's open, close it
    if (
        d10Details.open &&
        !d10Details.contains(event.target)
    ) {
        d10Details.removeAttribute('open');
    }
});

const presets = [
    { label: '1d20', d8: 0, d6: 0, d10: 0, d12: 0, d20: 1, d4: 0 },
    { label: '2d20', d8: 0, d6: 0, d10: 0, d12: 0, d20: 2, d4: 0 },
    { label: 'Fireball', d8: 0, d6: 8, d10: 0, d12: 0, d20: 0, d4: 0 },
    { label: '+Smite 1', d8: 2, d6: 0, d10: 0, d12: 0, d20: 0, d4: 0, additive: true },
    { label: '+Smite 2', d8: 3, d6: 0, d10: 0, d12: 0, d20: 0, d4: 0, additive: true },
    { label: '+Smite 3', d8: 4, d6: 0, d10: 0, d12: 0, d20: 0, d4: 0, additive: true },
    { label: '+Smite 4', d8: 5, d6: 0, d10: 0, d12: 0, d20: 0, d4: 0, additive: true },
    { label: 'Max Demo', d8: 10, d6: 10, d10: 0, d12: 0, d20: 0, d4: 0 },
    { label: '1000', d8: 0, d6: 1000, d10: 0, d12: 0, d20: 0, d4: 0 },
];

// Update function to optionally add to existing counts
function setDiceCounts(d20, d12, d10, d8, d6, d4, additive = false) {
    if (additive) {
        tryLoadDiceParameter();
        diceTypeCounts.d4 += d4;
        diceTypeCounts.d6 += d6;
        diceTypeCounts.d8 += d8;
        diceTypeCounts.d10 += d10;
        diceTypeCounts.d12 += d12;
        diceTypeCounts.d20 += d20;
    } else {
        diceTypeCounts.d4 = d4;
        diceTypeCounts.d6 = d6;
        diceTypeCounts.d8 = d8;
        diceTypeCounts.d10 = d10;
        diceTypeCounts.d12 = d12;
        diceTypeCounts.d20 = d20;
        ADD_COUNT = 0;
    }

    updateUI();
}

// Generate buttons in #presets
const presetContainer = document.getElementById('presets');

presets.forEach(preset => {
    const btn = document.createElement('button');
    btn.className = 'preset-button';
    btn.textContent = preset.label;
    btn.addEventListener('click', () => {
        setDiceCounts(preset.d20, preset.d12, preset.d10, preset.d8, preset.d6, preset.d4, preset.additive ?? false);
    });
    presetContainer.appendChild(btn);
});


const tag = document.createElement('div');
tag.textContent = `🕒 ${__BUILD_TIME__}`;
tag.style.cssText = `
  position: fixed;
  bottom: 10px;
  right: 12px;
  font-size: 14px;
  font-family: monospace;
  color: rgba(255,255,255,0.7);
  background: rgba(0,0,0,0.4);
  padding: 4px 8px;
  border-radius: 6px;
  z-index: 9999;
  pointer-events: none;
`;
document.body.appendChild(tag);
