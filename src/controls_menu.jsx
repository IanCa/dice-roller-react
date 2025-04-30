import { useState } from 'react';
import DiceControls from "./DiceControls.jsx";
import "./controls_menu.css";

export default function TabbedMenu() {
    const [activeTab, setActiveTab] = useState('controls');

    function handleTabClick(tabName) {
        if (tabName === activeTab) {
            tabName = 'hide';
        }
        setActiveTab(tabName);
    }

    return (
        <div className="tabbed-menu-container">
            {activeTab === 'controls' && (
                <div className="tab-content">
                    <DiceControls />
                </div>
            )}

            {/*{activeTab === 'other' && (*/}
            {/*    <div className="tab-content">*/}
            {/*        <div>Other tab content here</div>*/}
            {/*    </div>*/}
            {/*)}*/}
            <div className="tab-buttons">
                <button onClick={() => handleTabClick('controls')}>Controls</button>
                {/*<button onClick={() => handleTabClick('other')}>Other</button>*/}
                {activeTab !== 'hide' && (
                    <button onClick={() => handleTabClick('hide')}>Hide</button>
                )}
            </div>
        </div>
    );
}
