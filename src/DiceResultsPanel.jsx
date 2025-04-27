import { useDiceResults } from './DiceResultsProvider.jsx';
import {DIE_COLORS} from "./config.js";
import {useContext, useEffect, useMemo, useRef, useState} from "react";
import GlobalContext from "./GlobalConext.js";
import * as THREE from "three";
import "./DiceResultsPanel.css";
import DiceCountContext from "./DiceCountContext.js";

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
    if (!diceResults.some(die => die !== null)) return 0;

    const landedDiceTypes = diceResults
        .filter(d => d && filterFn(d))
        .map(d => d[1])
        .sort();

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

    if (totalCombinations === 0n) return 0;

    const rawPercent = (betterOrEqualResults * 10000n) / totalCombinations;
    return (Number(rawPercent) / 100).toFixed(2);
}


export default function DiceResultsPanel() {
    const { dice_results } = useDiceResults();
    const { camera, renderer, world, controls } = useContext(GlobalContext);
    const labelRefs = useRef([]); // refs for each label
    const [lines, setLines] = useState([]);
    const [sortedDice, setSortedDice] = useState([]);
    const [finalTotal, setFinalTotal] = useState(0);
    const [finald20Total, setFinald20Total] = useState(0);
    const {diceTypeCounts} = useContext(DiceCountContext);

    // Todo: probably move "add" out from dicetypecounts
    // Todo: this could use more optimization for > 20 mode.(to skip the sort and screen calculations)
    useEffect(() => {
        if (!renderer || !camera || !controls || !world) return;

        function updateSortedDiceAndLines() {
            let total = 0;
            let d20Total = 0;
            let dieData = [];

            dice_results.forEach((die, i) => {
                if (!die) return;

                const [result, type, x, y, z] = die;
                const screen = worldToScreenPos(x, y, z, camera);

                const dieInfo = {
                    result,
                    type,
                    screen,
                    index: i,
                    x,
                    y,
                    z,
                };

                dieData.push(dieInfo);

                if (type !== "d20") {
                    total += result;
                } else {
                    d20Total += result;
                }
            });

            //total += diceTypeCounts['add'];
            setFinalTotal(total);
            setFinald20Total(d20Total)

            if (!dieData.length) {
                setSortedDice([]);
                setLines([]);
                return;
            }

            // Group by die result value
            const grouped = {};
            dieData.forEach(d => {
                if (!grouped[d.result]) grouped[d.result] = [];
                grouped[d.result].push(d);
            });

            // Sort each group by screen.x
            Object.values(grouped).forEach(group => {
                group.sort((a, b) => a.screen.x - b.screen.x);
            });

            // Full sorted list
            const sortedData = Object.keys(grouped)
                .map(Number)
                .sort((a, b) => a - b)
                .flatMap(key => grouped[key]);

            setSortedDice(sortedData);
        }

        controls.addEventListener('change', updateSortedDiceAndLines);
        updateSortedDiceAndLines(); // run immediately

        return () => {
            controls.removeEventListener('change', updateSortedDiceAndLines);
        };
    }, [dice_results, camera, renderer, world, controls, diceTypeCounts]);

    useEffect(() => {
        if (!sortedDice.length) {
            setLines([]);
            return;
        }

        if (sortedDice.length > 20) {
            const buckets = {};

            sortedDice.forEach(die => {
                const key = `${die.result}`;
                if (!buckets[key]) {
                    buckets[key] = { count: 0, color: DIE_COLORS[die.type] || '#ffffff' };
                }
                buckets[key].count++;
            });

            const bucketSummaries = Object.keys(buckets)
                .sort((a, b) => parseInt(a) - parseInt(b))
                .map(key => ({
                    index: key,
                    value: key,
                    count: buckets[key].count,
                    color: buckets[key].color,
                }));

            setLines(bucketSummaries);
            return;
        }

        const newLines = sortedDice.map(die => {
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

    const allDiceLanded = dice_results.every(die => die !== null);

    function LabelBar({ sortedDice, labelRefs }) {
        return (
            <div id="labelBar">
                {sortedDice.length > 20 ? (
                    // Render summarized buckets if too many dice
                    lines.map(bucket => (
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
                    ))
                ) : (
                    // Render individual dice if few enough
                    sortedDice.map(die => (
                        <div
                            key={die.index}
                            className="die-label"
                            style={getDieStyle(die.type)}
                            ref={el => (labelRefs.current[die.index] = el)}
                        >
                            {die.result}
                        </div>
                    ))
                )}
            </div>
        );
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

    function ResultPanel({ finalTotal, diceTypeCounts }) {
        return (
            <div id="dice-results-panel">
                <div
                    className={`result-panel ${allDiceLanded ? 'result-complete' : ''}`}
                >
                    Result: {finalTotal} + {diceTypeCounts['add'] || 0} = {Number(finalTotal) + Number(diceTypeCounts['add'] || 0)}
                </div>
                {finalTotal > 0 && (
                    <div className="luck-panel">
                        Beats: {luckPercentile}%
                    </div>
                )}

                {finald20Total > 0 && (
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
                <LabelBar sortedDice={sortedDice} labelRefs={labelRefs} />
                <ResultPanel finalTotal={finalTotal} diceTypeCounts={diceTypeCounts} />
            </div>

            <ConnectionLines lines={lines} />
        </>
    )
}
