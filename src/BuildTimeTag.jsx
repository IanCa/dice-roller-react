import React from 'react';

function BuildTimeTag() {
    return (
        <div style={{
            position: 'fixed',
            bottom: '10px',
            right: '12px',
            fontSize: '14px',
            fontFamily: 'monospace',
            color: 'rgba(255,255,255,0.7)',
            background: 'rgba(0,0,0,0.4)',
            padding: '4px 8px',
            borderRadius: '6px',
            zIndex: 9999,
            pointerEvents: 'none',
        }}>
            {__BUILD_TIME__}
        </div>
    );
}

export default BuildTimeTag;