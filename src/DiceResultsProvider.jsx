import React, {useContext, useState} from 'react';
import DiceResultsContext from './DiceResultsContext.js';
import {generateDndDiceNotation} from "./dnd_notation.js";

export function DiceResultsProvider({ children }) {
    const [dice_results, _setDiceResults] = useState([]);

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

    const [activeDiceTypeCounts, _setActiveDiceTypeCounts] = useState(null);

    const setActiveDiceTypeCounts = (newCounts) => {
        newCounts = {...newCounts}
        const dice_notation = generateDndDiceNotation(newCounts)
        console.log(newCounts)
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