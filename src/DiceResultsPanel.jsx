import { useDiceResults } from './DiceResultsProvider.jsx';
import {DIE_COLORS} from "./config.js";
import {useContext, useEffect, useMemo, useRef, useState} from "react";
import GlobalContext from "./GlobalConext.js";
import * as THREE from "three";
import "./DiceResultsPanel.css";
import DiceCountContext from "./DiceCountContext.js";
import {generateDndDiceNotation} from "./dnd_notation.js";

function getDieStyle(type) {
    const isD20 = type === 'd20';
    return {
        backgroundColor: DIE_COLORS[type] || '#ffffff',
        color: '#000',
        border: isD20 ? '2px dashed #888' : '2px solid white',
    };
}

function worldToScreenPos(x, y, z, camera) {
    const vector = new THREE.Vector3(x, y, z).project(camera);
    return {
        x: (vector.x + 1) * window.innerWidth / 2,
        y: (-vector.y + 1) * window.innerHeight / 2
    };
}

function calculateLuckPercentile({
                                     diceResults,
                                     finalTotal,
                                     diceTotalsMemoRef,
                                     filterFn,
                                 }) {
    if (!diceResults.some(die => die !== null)) return undefined;

    const landedDiceTypes = diceResults
        .filter(d => d && filterFn(d))
        .map(d => d[1])
        .sort();

    if (landedDiceTypes.length === 0) return undefined;
    const { types: memoTypes, totals: memoTotals } = diceTotalsMemoRef.current;

    let newDiceTypes = [];
    let landedIndex = 0;
    let memoIndex = 0;

    while (landedIndex < landedDiceTypes.length) {
        const landedType = landedDiceTypes[landedIndex];

        if (memoIndex < memoTypes.length && memoTypes[memoIndex] === landedType) {
            memoIndex++;
        } else {
            newDiceTypes.push(landedType);
        }

        landedIndex++;
    }

    const allMatched = memoIndex === memoTypes.length;
    if (!allMatched) {
        newDiceTypes = [...landedDiceTypes];
    }

    let totals;
    if (allMatched) {
        totals = { ...memoTotals };
    } else {
        totals = { 0: 1n };
        newDiceTypes.length = 0;
        newDiceTypes.push(...landedDiceTypes);
    }

    for (const type of newDiceTypes) {
        const dieMax = parseInt(type.slice(1));
        const newTotals = {};

        for (const [sumStr, count] of Object.entries(totals)) {
            const sum = BigInt(sumStr);
            for (let roll = 1; roll <= dieMax; roll++) {
                const newSum = sum + BigInt(roll);
                newTotals[newSum.toString()] = (newTotals[newSum.toString()] || 0n) + count;
            }
        }

        totals = newTotals;
    }

    // Update memo for next time
    diceTotalsMemoRef.current = {
        types: landedDiceTypes,
        totals,
    };

    // Calculate luck percentile
    let totalCombinations = 0n;
    let betterOrEqualResults = 0n;

    for (const [sumStr, count] of Object.entries(totals)) {
        const sum = BigInt(sumStr);
        totalCombinations += count;
        if (sum <= BigInt(finalTotal)) {
            betterOrEqualResults += count;
        }
    }
    // console.log('combinations ', totalCombinations, "success ", betterOrEqualResults);

    if (totalCombinations === 0n) return 0;

    // todo: This math is not safe with large numbers(normal dice counts are fine)
    const rawPercent = (betterOrEqualResults * 10000n) / totalCombinations;
    return (Number(rawPercent) / 100).toFixed(2);
}


function processDiceResults(dice_results, camera) {
    let total = 0;
    let d20Total = 0;

    const dieData = dice_results
        .map((die, i) => {
            if (!die) return null;
            const [result, type, x, y, z] = die;
            const screen = worldToScreenPos(x, y, z, camera);

            if (type !== "d20") {
                total += result;
            } else {
                d20Total += result;
            }

            return { result, type, screen, index: i, x, y, z };
        })
        .filter(Boolean);

    // Separate into non-d20 and d20 arrays
    const nonD20Dice = dieData.filter(d => d.type !== "d20");
    const d20Dice = dieData.filter(d => d.type === "d20");

    // Group non-d20 dice by result
    const grouped = {};
    nonD20Dice.forEach(d => {
        if (!grouped[d.result]) grouped[d.result] = [];
        grouped[d.result].push(d);
    });

    // Sort each non-d20 group by screen.x
    Object.values(grouped).forEach(group => {
        group.sort((a, b) => a.screen.x - b.screen.x);
    });

    // Build final sorted array
    const sortedNonD20Data = Object.keys(grouped)
        .map(Number)
        .sort((a, b) => a - b)
        .flatMap(key => grouped[key]);

    // Final sortedData = non-d20 sorted + d20 raw
    const sortedData = [...sortedNonD20Data, ...d20Dice];

    return { total, d20Total, sortedData };
}

function buildLines(sortedDice, labelRefs, camera) {
    if (!sortedDice.length) return [];

    if (sortedDice.length > 20) {
        const buckets = {};

        sortedDice.forEach(die => {
            const key = `${die.result}`;
            if (!buckets[key]) {
                buckets[key] = { count: 0, color: DIE_COLORS[die.type] || '#ffffff' };
            }
            buckets[key].count++;
        });

        return Object.keys(buckets)
            .sort((a, b) => parseInt(a) - parseInt(b))
            .map(key => ({
                index: key,
                value: key,
                count: buckets[key].count,
                color: buckets[key].color,
            }));
    }

    return sortedDice.map(die => {
        const labelElement = labelRefs.current[die.index];
        if (!labelElement) return null;

        const labelRect = labelElement.getBoundingClientRect();
        const labelX = labelRect.left + labelRect.width / 2;
        const labelY = labelRect.bottom;

        const worldScreen = worldToScreenPos(die.x, die.y, die.z, camera);

        return {
            index: die.index,
            startX: labelX,
            startY: labelY,
            endX: worldScreen.x,
            endY: worldScreen.y,
            color: DIE_COLORS[die.type] || '#ffffff',
        };
    }).filter(Boolean);
}


export default function DiceResultsPanel() {
    const { dice_results, activeDiceTypeCounts } = useDiceResults();
    const { camera, renderer, world, controls } = useContext(GlobalContext);
    const labelRefs = useRef([]); // refs for each label
    const [lines, setLines] = useState([]);
    const [sortedDice, setSortedDice] = useState([]);
    const [finalTotal, setFinalTotal] = useState(0);
    const [finald20Total, setFinald20Total] = useState(0);
    const {diceTypeCounts} = useContext(DiceCountContext);

    // todo: Improve the stats and more properly split out the d20 results.
    // Todo: probably move "add" out from dicetypecounts
    // Todo: this could use more optimization for > 20 mode.(to skip the sort and screen calculations)
    useEffect(() => {
        if (!renderer || !camera || !controls || !world) return;

        function updateSortedDiceAndLines() {
            console.log("updating dice");
            const { total, d20Total, sortedData } = processDiceResults(dice_results, camera);

            setFinalTotal(total);
            setFinald20Total(d20Total);

            if (!sortedData.length) {
                setSortedDice([]);
                //setLines([]);
                return;
            }

            setSortedDice(sortedData);
        }

        controls.addEventListener('change', updateSortedDiceAndLines);
        updateSortedDiceAndLines();

        return () => {
            controls.removeEventListener('change', updateSortedDiceAndLines);
        };
    }, [dice_results, camera, renderer, world, controls]);

    useEffect(() => {
        if (!sortedDice.length) {
            setLines([]);
            return;
        }

        console.log("updating camera/dice");

        const newLines = buildLines(sortedDice, labelRefs, camera);
        setLines(newLines);
    }, [sortedDice, camera]);

    const diceTotalsMemo = useRef({
        types: [],
        totals: { 0: 1n }
    });

    const diceTotalsMemod20 = useRef({
        types: [],
        totals: { 0: 1n }
    });

    const luckPercentile = useMemo(() => {
        return calculateLuckPercentile({
            diceResults: dice_results,
            finalTotal: finalTotal,
            diceTotalsMemoRef: diceTotalsMemo,
            filterFn: (d) => d[1] !== 'd20', // Exclude d20
        });
    }, [dice_results, finalTotal]);

    const luckPercentiled20 = useMemo(() => {
        return calculateLuckPercentile({
            diceResults: dice_results,
            finalTotal: finald20Total,
            diceTotalsMemoRef: diceTotalsMemod20,
            filterFn: (d) => d[1] === 'd20', // Only d20
        });
    }, [dice_results, finald20Total]);

    const allDiceLanded = dice_results.length > 0 && dice_results.every(die => die !== null);

    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        const dice_notation = generateDndDiceNotation(activeDiceTypeCounts);
        const seedParam = activeDiceTypeCounts.seedState
            ? `&seedState=${encodeURIComponent(JSON.stringify(activeDiceTypeCounts.seedState))}`
            : '';
        const hash = `#?dice=${dice_notation}${seedParam}`;
        const fullUrl = `${window.location.origin}${window.location.pathname}${hash}`;

        navigator.clipboard.writeText(fullUrl);

        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    function LabelBar({ sortedDice, labelRefs, lines }) {
        const labelElements = useMemo(() => {
            if (sortedDice.length > 20) {
                return lines.map(bucket => (
                    <div
                        key={bucket.value}
                        className="die-label"
                        style={{
                            backgroundColor: bucket.color,
                            border: '2px solid white',
                            color: '#000',
                        }}
                    >
                        {bucket.count}×{bucket.value}
                    </div>
                ));
            } else {
                return sortedDice.map(die => (
                    <div
                        key={die.index}
                        className="die-label"
                        style={getDieStyle(die.type)}
                        ref={el => (labelRefs.current[die.index] = el)}
                    >
                        {die.result}
                    </div>
                ));
            }
        }, [sortedDice, lines, labelRefs]);

        return <div id="labelBar">{labelElements}</div>;
    }
    function ConnectionLines({ lines }) {
        if (!lines.length) return null;

        return (
            <svg
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                    zIndex: 10,
                }}
            >
                {lines.map(line => (
                    <line
                        key={line.index}
                        x1={line.startX}
                        y1={line.startY}
                        x2={line.endX}
                        y2={line.endY}
                        stroke={line.color}
                        strokeWidth="1.5"
                    />
                ))}
            </svg>
        );
    }

    function ResultPanel({ finalTotal, diceTypeCounts, allDiceLanded, luckPercentile, luckPercentiled20 }) {
        return (
            <div id="dice-results-panel">
                <button onClick={handleCopy}>📋</button>
                {copied && (
                    <div className="popup" style={{ position: 'absolute', top: '-1.5em', left: '0' }}>
                        Copied reproducible url
                    </div>
                )}

                <div
                    className={`result-panel ${allDiceLanded ? 'result-complete' : ''}`}
                >
                    Result: {finalTotal} + {diceTypeCounts['add'] || 0} = {Number(finalTotal) + Number(diceTypeCounts['add'] || 0)}
                </div>
                {luckPercentile !== undefined && (
                    <div className="luck-panel">
                        Beats: {luckPercentile}%
                    </div>
                )}

                {luckPercentiled20 !== undefined && (
                    <div className="luck-panel">
                        D20 Beats: {luckPercentiled20}%
                    </div>
                )}
            </div>
        );
    }

    return (
        <>
            <div id="topBar">
                <ResultPanel
                    finalTotal={finalTotal}
                    diceTypeCounts={diceTypeCounts}
                    allDiceLanded={allDiceLanded}
                    luckPercentile={luckPercentile}
                    finald20Total={finald20Total}
                    luckPercentiled20={luckPercentiled20}
                />
                <LabelBar sortedDice={sortedDice} labelRefs={labelRefs} lines={lines}/>
            </div>

            <ConnectionLines lines={lines} />
        </>
    )
}
