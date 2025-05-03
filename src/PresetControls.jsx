import React, { useEffect, useState, useContext } from 'react';
import "./DiceUIControls.css";
import DiceCountContext from './DiceCountContext';

const LOCAL_STORAGE_KEY = 'dicePresets';

const diceTypes = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'add'];

const defaultPresets = [
    { label: '1d20', d8: 0, d6: 0, d10: 0, d12: 0, d20: 1, d4: 0, add:0 },
    { label: '2d20', d8: 0, d6: 0, d10: 0, d12: 0, d20: 2, d4: 0, add:0 },
    { label: '2d8', d8: 2, d6: 0, d10: 0, d12: 0, d20: 0, d4: 0, add:0 },
    { label: 'Fireball', d8: 0, d6: 8, d10: 0, d12: 0, d20: 0, d4: 0, add:0 },
    { label: 'Max Demo', d8: 10, d6: 10, d10: 0, d12: 0, d20: 0, d4: 0, add:0 },
    { label: '1000', d8: 0, d6: 1000, d10: 0, d12: 0, d20: 0, d4: 0, add:0 },
    { label: 'Clear', d8: 0, d6: 0, d10: 0, d12: 0, d20: 0, d4: 0, add:0 },
];

export default function PresetControls() {
    const [presets, setPresets] = useState(() => {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        return saved ? JSON.parse(saved) : defaultPresets;
    });

    const {diceTypeCounts, setDiceTypeCounts, setResetRequested} = useContext(DiceCountContext);

    useEffect(() => {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(presets));
    }, [presets]);

    const resetPresets = () => {
        if (window.confirm('Reset all presets to defaults?')) {
            setPresets(defaultPresets);
        }
    };

    const saveAsPreset = () => {
        const label = prompt('Enter a name for the new preset:');
        if (!label) return;

        const newPreset = {label};
        for (const type of diceTypes) {
            newPreset[type] = diceTypeCounts[type] || 0;
        }

        const existing = presets.find(p => p.label === label);
        if (existing) {
            setPresets(presets.map(p => p.label === label ? newPreset : p));
        } else {
            setPresets([...presets, newPreset]);
        }
    };

    const [shouldResetAfterSet, setShouldResetAfterSet] = useState(false);

    useEffect(() => {
        if (shouldResetAfterSet) {
            setResetRequested(1);
            setShouldResetAfterSet(false);
        }
    }, [shouldResetAfterSet, setResetRequested]);

    const deletePreset = (label) => {
        if (!window.confirm(`Delete preset "${label}"?`)) return;
        setPresets(prev => prev.filter(p => p.label !== label));
    };

    return (
        <div id="preset-controls">
            <div id="presets">
                {presets.map((preset, index) => (
                    <div key={index} className="preset-row">
                        <button
                            className="preset-button"
                            onClick={() => {
                                setDiceTypeCounts(preset);
                                setShouldResetAfterSet(true);
                            }}
                        >
                            {preset.label}
                        </button>
                        <button
                            className="delete-preset"
                            onClick={() => deletePreset(preset.label)}
                            title={`Delete ${preset.label}`}
                        >
                            ✖
                        </button>
                    </div>
                ))}
            </div>
            <div className="preset-actions">
                <button className="preset-button" onClick={saveAsPreset}>Save Current</button>
                <button className="preset-button" onClick={resetPresets}>Reset All</button>
            </div>
        </div>
    );
}
