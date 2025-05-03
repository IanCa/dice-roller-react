import Game_loop from './game_loop.jsx';
import DiceResultsPanel from './DiceResultsPanel.jsx';
import BuildTimeTag from './BuildTimeTag';

function App() {
    return (
        <div>
            <DiceResultsPanel />
            <Game_loop />
            <BuildTimeTag />
        </div>
    );
}

export default App;
