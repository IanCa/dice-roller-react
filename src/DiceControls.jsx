import React, {useContext, useState} from 'react';
import DiceCountContext from './DiceCountContext';
import DiceControlRow from './DiceControlRow';
import "./DiceUIControls.css";
import {generateDndDiceNotation} from "./dnd_notation.js";
import DiceResultsContext from "./DiceResultsContext.js";

export default function DiceControls({diceTypes}) {
    const { setResetRequested } = useContext(DiceCountContext);
    const { activeDiceTypeCounts } = useContext(DiceResultsContext);
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        const dice_notation = generateDndDiceNotation(activeDiceTypeCounts);
        const seedParam = activeDiceTypeCounts.seedState
            ? `&seedState=${encodeURIComponent(JSON.stringify(activeDiceTypeCounts.seedState))}`
            : '';
        const hash = `#?dice=${dice_notation}${seedParam}`;
        const fullUrl = `${window.location.origin}${window.location.pathname}${hash}`;

        // Modern async clipboard API
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(fullUrl)
                .then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                })
                .catch(() => {
                    fallbackCopy(fullUrl);
                });
        } else {
            fallbackCopy(fullUrl);
        }
    };

    // Needed for ios for some reason.
    function fallbackCopy(text) {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
            const successful = document.execCommand("copy");
            if (successful) {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
            } else {
                alert("Copy failed. Please copy manually.");
            }
        } catch {
            alert("Copy command not supported.");
        }

        document.body.removeChild(textArea);
    }

    return (
        <div id="controls-wrapper">
            <div id="dice-controls">
                {diceTypes.map(type => (
                    <DiceControlRow key={type} type={type} />
                ))}

                <button
                    id="saveResult"
                    type="button"
                    onClick={handleCopy}
                    aria-label="Copy"
                >
                    Save Result
                </button>
                {copied && (
                    <div className="popup" style={{ position: 'absolute', top: '-1.5em', left: '0' }}>
                        Copied reproducible url
                    </div>
                )}

                <button id="resetButton" onClick={() => setResetRequested(1)}>🎲 Roll</button>
            </div>
        </div>
    );
}