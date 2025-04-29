import Game_loop from './game_loop.jsx';
import DiceResultsPanel from './DiceResultsPanel.jsx';
import { DiceResultsProvider } from './DiceResultsProvider.jsx';
import BuildTimeTag from './BuildTimeTag';

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
