import React from 'react';

export const HudBackground: React.FC = () => {
  return (
    <>
      {/* Sci-Fi Canvas Dot Matrix Grid */}
      <div className="hud-grid-background" />
      <div className="hud-scanline" />

      {/* Lateral Geographic / Coordinate HUD Markings */}
      <div className="hud-coords-left">
        29° 42' 12.8" N &nbsp; // &nbsp; SYS.LOC.ALPHA
      </div>
      <div className="hud-coords-right">
        90° 19' 40.2" E &nbsp; // &nbsp; NODE.MESH.ACTIVE
      </div>

      {/* Decorative High-Tech Grid Reticles */}
      <div style={{ position: 'fixed', top: '15%', left: '10%', opacity: 0.15, pointerEvents: 'none', color: '#ff6b00' }}>
        +
      </div>
      <div style={{ position: 'fixed', top: '25%', right: '12%', opacity: 0.15, pointerEvents: 'none', color: '#ff6b00' }}>
        +
      </div>
      <div style={{ position: 'fixed', bottom: '20%', left: '15%', opacity: 0.15, pointerEvents: 'none', color: '#ff6b00' }}>
        +
      </div>
      <div style={{ position: 'fixed', bottom: '28%', right: '18%', opacity: 0.15, pointerEvents: 'none', color: '#ff6b00' }}>
        +
      </div>
    </>
  );
};
