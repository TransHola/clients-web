const fs = require('fs');
const path = '/Users/fathallahlahlou/Workspace/clients-web/src/components/booking/vehicle-details-panel.tsx';
let code = fs.readFileSync(path, 'utf8');

const endOfFileTarget = `        <div id="vehicle-details-footer-portal"></div>

        </div>
      </div>
    </div>
  )
}`;

const replacement = `        <div id="vehicle-details-footer-portal"></div>

        </div>
      </div>
      
      {engineModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: 'white', borderRadius: '12px', width: '100%', maxWidth: '600px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>Rate Engine Calculation Log</h3>
              <button onClick={() => setEngineModalOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#64748b' }}>&times;</button>
            </div>
            <div style={{ padding: '16px', overflowY: 'auto', flex: 1, background: '#1e293b' }}>
              {(option.vehicles || [{ type: option.label || option.title || 'Standard', debugLog: option.debugLog }]).map((v: any, idx: number) => (
                <div key={idx} style={{ marginBottom: '24px' }}>
                  <h4 style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: 800, color: '#e2e8f0' }}>Vehicle: {v.type || option.title}</h4>
                  <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#10b981', background: '#0f172a', padding: '12px', borderRadius: '6px', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                    {v.debugLog && v.debugLog.length > 0 ? v.debugLog.join('\\n') : 'No engine log data available. Check backend server.'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
    </div>
  )
}`;

code = code.replace(endOfFileTarget, replacement);
fs.writeFileSync(path, code);
console.log("modal patched");
