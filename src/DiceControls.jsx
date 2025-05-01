import React, {useContext, useEffect} from 'react';
import "./DiceControls.css";
import DiceCountContext from './DiceCountContext.js';
import DiceControlRow from './DiceControlRow.jsx';
const diceTypes = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'];

const presets = [
    { label: '1d20', d8: 0, d6: 0, d10: 0, d12: 0, d20: 1, d4: 0 },
    { label: '2d20', d8: 0, d6: 0, d10: 0, d12: 0, d20: 2, d4: 0 },
    { label: 'Fireball', d8: 0, d6: 8, d10: 0, d12: 0, d20: 0, d4: 0 },
    { label: '+Smite 1', d8: 2, d6: 0, d10: 0, d12: 0, d20: 0, d4: 0, additive: true },
    { label: '+Smite 2', d8: 3, d6: 0, d10: 0, d12: 0, d20: 0, d4: 0, additive: true },
    { label: '+Smite 3', d8: 4, d6: 0, d10: 0, d12: 0, d20: 0, d4: 0, additive: true },
    { label: 'Max Demo', d8: 10, d6: 10, d10: 0, d12: 0, d20: 0, d4: 0 },
    { label: '1000', d8: 0, d6: 1000, d10: 0, d12: 0, d20: 0, d4: 0 },
    { label: 'Clear', d8: 0, d6: 0, d10: 0, d12: 0, d20: 0, d4: 0 },
];

export default function DiceControls() {
    const { diceTypeCounts, setDiceTypeCounts, setResetRequested } = useContext(DiceCountContext);

    const setDiceCounts = (preset, additive = false) => {
        const newCounts = additive ? { ...diceTypeCounts } : { d4: 0, d6: 0, d8: 0, d10: 0, d12: 0, d20: 0 };

        newCounts.d4 += preset.d4 || 0;
        newCounts.d6 += preset.d6 || 0;
        newCounts.d8 += preset.d8 || 0;
        newCounts.d10 += preset.d10 || 0;
        newCounts.d12 += preset.d12 || 0;
        newCounts.d20 += preset.d20 || 0;

        setDiceTypeCounts(newCounts);
    };

    return (
        <div id="controls-wrapper">
            <div id="controls">
                {diceTypes.map(type => (
                    <DiceControlRow key={type} type={type} />
                ))}
                <button id="resetButton" onClick={() => setResetRequested(1)}>🎲 Roll</button>
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
