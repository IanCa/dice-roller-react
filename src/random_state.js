import seedrandom from 'seedrandom';

let rng = null;
let rngState = null;

// Initialize RNG
export function setRandomSeedState(state = null) {
    if (state) {
        rng = seedrandom("", { state });
        rngState = rng.state();
    } else {
        // Non-deterministic: entropy-based
        rng = seedrandom(undefined, { state: true });
        rngState = rng.state();
    }
    Math.random = rng; // optional: override global Math.random
    return rngState;
}

export function getRandomSeedState() {
    return rngState;
}
