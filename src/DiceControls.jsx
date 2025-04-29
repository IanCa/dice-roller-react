import React, {useContext, useEffect} from 'react';
import DiceCountContext from './DiceCountContext.js';
import "./DiceControls.css";

const MAX_DICE = 1000;
const diceTypes = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'];

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

export default function DiceControls({ onRequestReset }) {
    const { diceTypeCounts, setDiceTypeCounts } = useContext(DiceCountContext);

    const changeCount = (type, delta) => {
        if (!diceTypeCounts.hasOwnProperty(type)) return;

        const updated = { ...diceTypeCounts };
        updated[type] = Math.max(0, Math.min(MAX_DICE, updated[type] + delta));

        const total = Object.values(updated).reduce((sum, n) => sum + n, 0);
        const excess = total - MAX_DICE;

        if (excess > 0) {
            let maxType = null;
            let maxCount = -Infinity;
            for (const t in updated) {
                if (t === type) continue;
                if (updated[t] > maxCount) {
                    maxCount = updated[t];
                    maxType = t;
                }
            }
            if (maxType) {
                updated[maxType] = Math.max(0, updated[maxType] - excess);
            }
        }

        setDiceTypeCounts(updated);
    };

    const setDiceCounts = (preset, additive = false) => {
        if (!preset) return;

        const newCounts = additive ? { ...diceTypeCounts } : { d4: 0, d6: 0, d8: 0, d10: 0, d12: 0, d20: 0 };

        newCounts.d4 += preset.d4 || 0;
        newCounts.d6 += preset.d6 || 0;
        newCounts.d8 += preset.d8 || 0;
        newCounts.d10 += preset.d10 || 0;
        newCounts.d12 += preset.d12 || 0;
        newCounts.d20 += preset.d20 || 0;

        setDiceTypeCounts(newCounts);
    };

    // Close <details> if clicked outside
    useEffect(() => {
        function handleClickOutside(event) {
            const d10Details = document.getElementById('d10-details');
            if (d10Details?.open && !d10Details.contains(event.target)) {
                d10Details.removeAttribute('open');
            }
        }

        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    return (
        <div id="controls-wrapper">
            <div id="controls">
                {diceTypes.map((type) => (
                    <div key={type} className="control-row">
                        {type === 'd10' ? (
                            <details className="d10-details" id="d10-details">
                                <summary className="control-label">
                                    D10:<span className="warning-icon">⚠️</span>
                                </summary>
                                <div className="popup">
                                    D10 is a weird shape and this simulates a 5-sided double pyramid instead,
                                    then randomly picks between the top two faces.
                                </div>
                            </details>
                        ) : (
                            <span className="control-label">{type.toUpperCase()}:</span>
                        )}

                        <button className="control-button" onClick={() => changeCount(type, -1)}>−</button>
                        <span className="count-display" id={`${type}Count`}>{diceTypeCounts[type]}</span>
                        <button className="control-button" onClick={() => changeCount(type, 1)}>+</button>
                    </div>
                ))}
                <button id="resetButton" onClick={onRequestReset}>🎲 Roll</button>
            </div>

            <div id="presets">
                {presets.map((preset, index) => (
                    <button
                        key={index}
                        className="preset-button"
                        onClick={() => setDiceCounts(preset, preset.additive ?? false)}
                    >
                        {preset.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
