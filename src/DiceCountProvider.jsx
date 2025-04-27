import React, {useContext, useEffect, useState} from 'react';
import DiceCountContext from './DiceCountContext';
import { useLocation } from 'react-router-dom';

const baseDiceDefaults = {
    d4: 0,
    d6: 0,
    d8: 0,
    d10: 0,
    d12: 0,
    d20: 0,
    add: 0
};

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

export default function DiceCountProvider({ children }) {
    const location = useLocation();

    function getDiceFromHash(hash) {
        const hashParams = new URLSearchParams(hash.slice(1));
        const dice_string = hashParams.get('dice');
        const parsedDice = parseDndDiceNotation(dice_string);

        if (parsedDice && Object.values(parsedDice).some(val => val > 0)) {
            return { ...baseDiceDefaults, ...parsedDice };
        } else {
            return { ...baseDiceDefaults, d8: 2 };
        }
    }
    const [diceTypeCounts, _setDiceTypeCounts] = useState(() => getDiceFromHash(window.location.hash));

    const [lastUpdateFromUrl, setLastUpdateFromUrl] = useState(false);

    // wrapped setter
    const setDiceTypeCounts = (newCounts) => {
        setLastUpdateFromUrl(false); // manual updates set this false
        _setDiceTypeCounts({ ...baseDiceDefaults, ...newCounts });
    };

    useEffect(() => {
        setLastUpdateFromUrl(true);
        _setDiceTypeCounts(getDiceFromHash(location.hash));
    }, [location]);

    return (
        <DiceCountContext.Provider value={{ diceTypeCounts, setDiceTypeCounts, lastUpdateFromUrl, setLastUpdateFromUrl }}>
            {children}
        </DiceCountContext.Provider>
    );
}