import React from 'react';

function BuildTimeTag() {
    return (
        <div style={{
            position: 'fixed',
            bottom: '0px',
            right: '0px',
            fontSize: '10px',
            fontFamily: 'monospace',
            color: 'rgba(255,255,255,0.7)',
            background: 'rgba(0,0,0,0.4)',
            padding: '0px 0px',
            borderRadius: '6px',
            zIndex: 9999,
            pointerEvents: 'none',
        }}>
            {__BUILD_TIME__}
        </div>
    );
}

export default BuildTimeTag;