import Game_loop from './game_loop.jsx';
import DiceResultsPanel from './DiceResultsPanel.jsx';
import { DiceResultsProvider } from './DiceResultsProvider.jsx';
import BuildTimeTag from './BuildTimeTag';
import DiceControls from "./DiceControls.jsx";

function App() {
    return (
        <DiceResultsProvider>
            <DiceResultsPanel />
            <Game_loop />
            <BuildTimeTag />
        </DiceResultsProvider>
    );
}

export default App;
