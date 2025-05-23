import React, { useContext } from 'react';
import DiceCountContext  from './DiceCountContext';

export default function DiceControlRow({ type }) {
    const { diceTypeCounts, changeCount } = useContext(DiceCountContext);

    return (
        <div className="control-row">
            <span className="control-label">{type.charAt(0).toUpperCase() + type.slice(1)}:</span>

            <button className="control-button" onClick={() => changeCount(type, -1)}>−</button>
            <span className="count-display" id={`${type}Count`}>{diceTypeCounts[type]}</span>
            <button className="control-button" onClick={() => changeCount(type, 1)}>+</button>
        </div>
    );
}