const fs = require('fs');

const path = '/Users/fathallahlahlou/Workspace/clients-web/src/components/booking/vehicle-details-panel.tsx';
let code = fs.readFileSync(path, 'utf8');

// Add useState
code = code.replace(
    /import \* as React from "react"/,
    `import * as React from "react"\nimport { useState } from "react"`
);

// Add state to component
code = code.replace(
    /export function VehicleDetailsPanel\(.*\) \{/,
    `export function VehicleDetailsPanel({ option, amenities = [], adaRequired = false, adaVehicleCount = 1 }: { option: any; amenities?: string[]; adaRequired?: boolean; adaVehicleCount?: number }) {\n  const [engineModalOpen, setEngineModalOpen] = useState(false);\n`
);

// Add button
code = code.replace(
    /<h3 style=\{\{ fontSize: '18px', fontWeight: 900, margin: '0 0 4px', color: '#0f172a' \}\}>Pricing Breakdown<\/h3>/,
    `<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 900, margin: 0, color: '#0f172a' }}>Pricing Breakdown</h3>
          <button onClick={() => setEngineModalOpen(true)} style={{ fontSize: '11px', color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontWeight: 700 }}>Verify Engine Math (Dev)</button>
        </div>`
);

// Add modal at the end before final div
code = code.replace(
    /      \{" "\}\n    <\/div>\n  \)\n\}/,
    `      {" "}
      {engineModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: 'white', borderRadius: '12px', width: '100%', maxWidth: '600px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>Rate Engine Calculation Log</h3>
              <button onClick={() => setEngineModalOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#64748b' }}>&times;</button>
            </div>
            <div style={{ padding: '16px', overflowY: 'auto', flex: 1, background: '#1e293b' }}>
              {(option.vehicles || []).map((v: any, idx: number) => (
                <div key={idx} style={{ marginBottom: '24px' }}>
                  <h4 style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: 800, color: '#e2e8f0' }}>Vehicle: {v.type}</h4>
                  <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#10b981', background: '#0f172a', padding: '12px', borderRadius: '6px', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                    {v.debugLog && v.debugLog.length > 0 ? v.debugLog.join('\\n') : 'No engine log data available.'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}`
);

fs.writeFileSync(path, code);
console.log("panel patched");
