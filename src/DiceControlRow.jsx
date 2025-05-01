import React, { useContext, useEffect } from 'react';
import DiceCountContext  from './DiceCountContext';

export default function DiceControlRow({ type }) {
    const { diceTypeCounts, changeCount } = useContext(DiceCountContext);

    useEffect(() => {
        if (type !== 'd10') return;

        function handleClickOutside(event) {
            const d10Details = document.getElementById('d10-details');
            if (d10Details?.open && !d10Details.contains(event.target)) {
                d10Details.removeAttribute('open');
            }
        }

        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [type]);

    return (
        <div className="control-row">
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
    );
}