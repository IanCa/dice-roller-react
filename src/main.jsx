import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // global styles
import App from './App';
import DiceCountProvider from './DiceCountProvider';
import GlobalProvider from './GlobalProvider';
import { BrowserRouter } from 'react-router-dom';

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <BrowserRouter>
            <GlobalProvider>
                <DiceCountProvider>
                    <App />
                </DiceCountProvider>
            </GlobalProvider>
        </BrowserRouter>
    </React.StrictMode>
);