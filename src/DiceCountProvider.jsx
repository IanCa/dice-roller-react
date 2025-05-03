import React, {useEffect, useRef, useState} from 'react';
import DiceCountContext from './DiceCountContext';
import {useLocation} from 'react-router-dom';
import {parseDndDiceNotation} from "./dnd_notation.js";


const MAX_DICE = 1000;
const baseDiceDefaults = {
    d4: 0,
    d6: 0,
    d8: 0,
    d10: 0,
    d12: 0,
    d20: 0,
    add: 0
};


export default function DiceCountProvider({ children }) {
    const location = useLocation();
    const [resetRequested, setResetRequested] = useState(0);

    function getDiceFromHash(hash) {
        const hashParams = new URLSearchParams(hash.slice(1));
        const dice_string = hashParams.get('dice');
        const seedState = JSON.parse(decodeURIComponent(hashParams.get('seedState')));
        const parsedDice = parseDndDiceNotation(dice_string);

        let result = null

        if (parsedDice && Object.values(parsedDice).some(val => val > 0)) {
            result = { ...baseDiceDefaults, ...parsedDice };
        } else {
            result = { ...baseDiceDefaults, d8: 2 };
        }
        if (seedState) {
            result['seedState'] = seedState
        }
        return result
    }
    const [diceTypeCounts, setDiceTypeCounts] = useState(() => getDiceFromHash(window.location.hash));

    const updateFromHash = useRef(false);

    useEffect(() => {
        const dice_counts = getDiceFromHash(location.hash);
        updateFromHash.current = true;
        setDiceTypeCounts(dice_counts);
    }, [location]);

    useEffect(() => {
        if (updateFromHash.current) {
            updateFromHash.current = false;
            setResetRequested(2);
        }
    }, [diceTypeCounts]);

    const changeCount = (type, delta) => {
        if (!diceTypeCounts.hasOwnProperty(type)) return;

        const updated = { ...diceTypeCounts };
        updated[type] = Math.max(0, Math.min(MAX_DICE, updated[type] + delta));

        const total = Object.values(updated).reduce((sum, n) => sum + n, 0);
        const excess = total - MAX_DICE;

        if (excess > 0 && type !== 'add') {
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

    const value = { diceTypeCounts, setDiceTypeCounts, resetRequested, setResetRequested, changeCount};
    return (
        <DiceCountContext.Provider value={value}>
            {children}
        </DiceCountContext.Provider>
    );
}