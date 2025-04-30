export function parseDndDiceNotation(notation) {
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

export function generateDndDiceNotation(dice_counts) {
    const parts = [];

    for (const [key, count] of Object.entries(dice_counts)) {
        if (key === "seedState") continue;
        if (key === "add") {
            if (count !== 0) {
                parts.push((count > 0 ? `+${count}` : `${count}`));
            }
        } else {
            if (count !== 0) {
                parts.push((count > 0 ? `+${count}${key}` : `${count}${key}`));
            }
        }
    }

    // Join and clean up leading +
    let notation = parts.join('');
    if (notation.startsWith('+')) {
        notation = notation.slice(1);
    }
    return notation;
}