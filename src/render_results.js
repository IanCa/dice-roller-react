import {DIE_COLORS} from "./config.js";
import {dice} from "./dice_shared.js";
import {camera} from "./globals.js";
import {diceTypes} from "./dice_types.js";

function worldToScreenPos(pos, camera) {
    const vector = pos.clone().project(camera);
    return {
        x: (vector.x + 1) * window.innerWidth / 2,
        y: (-vector.y + 1) * window.innerHeight / 2
    };
}

export function renderTotalResult(labelBar, total, add_count) {
    if (add_count) {
        const bonusLabel = document.createElement('div');
        bonusLabel.className = 'die-label';
        bonusLabel.textContent = `+${add_count}`;
        labelBar.appendChild(bonusLabel);
    }

    const totalLabel = document.createElement('div');
    totalLabel.className = 'die-label';
    totalLabel.textContent = `= ${total}`;
    labelBar.appendChild(totalLabel);

    document.getElementById('result').innerText = '';
}

function renderDieLabel(labelBar, die, isD20 = false) {
    const label = document.createElement('div');
    label.className = 'die-label';
    label.textContent = die.result;

    label.style.backgroundColor = DIE_COLORS[die.type] || '#ffffff';
    label.style.color = '#000';

    if (isD20) {
        label.style.border = '2px dashed #888';
    } else {
        label.style.border = '2px solid white';
    }

    labelBar.appendChild(label);
    die.label = label;
}

export function renderResults(dice_results, add_count) {
    const labelBar = document.getElementById('labelBar');
    const svg = document.getElementById('lineOverlay');

    labelBar.innerHTML = '';
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    if (dice_results.length > 20) {
        const total = dice_results.reduce((sum, val) => sum + val, 0) + add_count;

        const buckets = {};
        dice.forEach((d, i) => {
            const value = dice_results[i];
            const key = `${value}`;
            if (!buckets[key]) buckets[key] = {count: 0, color: DIE_COLORS[d.type] || '#fff'};
            buckets[key].count++;
        });

        Object.keys(buckets).sort((a, b) => parseInt(a) - parseInt(b)).forEach(key => {
            const {count, color} = buckets[key];
            const label = document.createElement('div');
            label.className = 'die-label';
            label.textContent = `${count}×${key}`;
            label.style.backgroundColor = color;
            label.style.border = '2px solid white';
            label.style.color = '#000';
            labelBar.appendChild(label);
        });

        renderTotalResult(labelBar, total);

        return;
    }

    let total = 0;
    let d20Results = [];
    let dieData = [];

    dice.forEach((d, i) => {
        const result = dice_results[i];
        const dieInfo = {
            result: result,
            screen: worldToScreenPos(d.mesh.position.clone(), camera),
            mesh: d.mesh,
            type: d.type
        };

        dieData.push(dieInfo);

        if (diceTypes[d.type].faceCount === 20) {
            d20Results.push(dieInfo);
        } else {
            total += result;
        }
    });

    total += add_count;

    const grouped = {};
    dieData.forEach(d => {
        if (!grouped[d.result]) grouped[d.result] = [];
        grouped[d.result].push(d);
    });

    Object.values(grouped).forEach(group => {
        group.sort((a, b) => a.screen.x - b.screen.x);
    });

    const sortedData = Object.keys(grouped)
        .map(Number)
        .sort((a, b) => a - b)
        .flatMap(key => grouped[key]);

    sortedData.forEach(die => {
        if (diceTypes[die.type].faceCount !== 20) {
            renderDieLabel(labelBar, die, false);
        }
    });

    renderTotalResult(labelBar, total, add_count)

    d20Results.forEach(die => {
        renderDieLabel(labelBar, die, true);
    });

    const labelBarRect = labelBar.getBoundingClientRect();
    sortedData.forEach(die => {
        const labelRect = die.label.getBoundingClientRect();
        const labelX = labelRect.left + labelRect.width / 2;
        const labelY = labelBarRect.bottom;

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', labelX);
        line.setAttribute('y1', labelY);
        line.setAttribute('x2', die.screen.x);
        line.setAttribute('y2', die.screen.y);
        const color = DIE_COLORS[die.type] || '#ffffff';

        line.setAttribute('stroke', color);
        line.setAttribute('stroke-width', '1.5');
        svg.appendChild(line);
    });
}