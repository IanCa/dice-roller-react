import React, {useContext, useEffect, useState} from 'react';
import DiceResultsContext from './DiceResultsContext.js';
import {generateDndDiceNotation} from "./dnd_notation.js";

export function DiceResultsProvider({ children }) {
    const [dice_results, _setDiceResults] = useState([]);
    const [allDiceSet, setAllDiceSet] = useState(false);

    const setDiceResults = (newDiceResults) => {
        _setDiceResults(prev => {
            // Only update on changes.
            if (prev.length !== newDiceResults.length) return newDiceResults;
            for (let i = 0; i < newDiceResults.length; i++) {
                if (prev[i] !== newDiceResults[i]) {
                    return newDiceResults;
                }
            }
            return prev;
        });
    };

    useEffect(() => {
        const complete = dice_results.length > 0 && dice_results.every(val => val !== null && val !== undefined);
        setAllDiceSet(prev => (prev === complete ? prev : complete));
        //console.log("setting dice results to: ", complete)
    }, [dice_results]);

    const [activeDiceTypeCounts, _setActiveDiceTypeCounts] = useState(null);

    const setActiveDiceTypeCounts = (newCounts) => {
        //console.log("Setting active counts", newCounts)
        newCounts = {...newCounts}
        const dice_notation = generateDndDiceNotation(newCounts)
        //const seedParam = newCounts.seedState ? `&seedState=${encodeURIComponent(JSON.stringify(newCounts.seedState))}` : '';
        const seedParam = "";
        window.history.replaceState(null, '', `#?dice=${dice_notation}${seedParam}`);

        _setActiveDiceTypeCounts(newCounts);
    };


    const value = {
        dice_results,
        setDiceResults,
        activeDiceTypeCounts,
        setActiveDiceTypeCounts,
        allDiceSet,
        setAllDiceSet,
    };

    return (
        <DiceResultsContext.Provider value={value}>
            {children}
        </DiceResultsContext.Provider>
    );
}

export function useDiceResults() {
    const context = useContext(DiceResultsContext);
    if (!context) {
        throw new Error('useDiceResults must be used inside a DiceResultsProvider');
    }
    return context;
}