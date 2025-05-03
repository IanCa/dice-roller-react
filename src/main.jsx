import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // global styles
import App from './App';
import DiceCountProvider from './DiceCountProvider';
import GlobalProvider from './GlobalProvider';
import { BrowserRouter } from 'react-router-dom';
import {DiceResultsProvider} from "./DiceResultsProvider.jsx";

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <BrowserRouter>
            <GlobalProvider>
                <DiceCountProvider>
                    <DiceResultsProvider>
                    <App />
                    </DiceResultsProvider>
                </DiceCountProvider>
            </GlobalProvider>
        </BrowserRouter>
    </React.StrictMode>
);