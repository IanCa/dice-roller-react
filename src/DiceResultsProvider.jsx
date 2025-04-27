import React, { useState, useContext } from 'react';
import DiceResultsContext from './DiceResultsContext.js';


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

    return (
        <DiceResultsContext.Provider value={{ dice_results, setDiceResults }}>
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