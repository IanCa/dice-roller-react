import React, {useContext, useEffect, useState} from 'react';
import "./TabbedMenu.css";
import DiceControls from "./DiceControls.jsx";
import PresetControls from "./PresetControls.jsx";
import DiceCountContext from "./DiceCountContext.js";


export default function TabbedMenu() {
    const { setResetRequested } = useContext(DiceCountContext);
    const [openTabs, setOpenTabs] = useState(() => {
        const stored = localStorage.getItem("openTabs");
        return stored ? new Set(JSON.parse(stored)) : new Set(["controls", "presets"]);
    });

    useEffect(() => {
        localStorage.setItem("openTabs", JSON.stringify([...openTabs]));
    }, [openTabs]);

    function handleTabClick(tabName) {
        setOpenTabs(prev => {
            const next = new Set(prev);
            if (next.has(tabName)) {
                next.delete(tabName);
            } else {
                next.add(tabName);
            }
            return next;
        });
    }

    return (
        <div className="tabbed-menu-container">
            <div className="tab-contents">
                {openTabs.has('controls') && (
                    <div className="tab-content">
                        <DiceControls />
                    </div>
                )}

                {openTabs.has('presets') && (
                    <div className="tab-content">
                        <PresetControls />
                    </div>
                )}
            </div>
            <div className="tab-buttons">
                <button onClick={() => setResetRequested(1)}>🎲 Roll</button>
                <button
                    onClick={() => handleTabClick('controls')}
                    className={openTabs.has('controls') ? 'active-tab' : ''}
                >
                    Controls
                </button>

                <button
                    onClick={() => handleTabClick('presets')}
                    className={openTabs.has('presets') ? 'active-tab' : ''}
                >
                    Presets
                </button>
            </div>
        </div>
    );
}
