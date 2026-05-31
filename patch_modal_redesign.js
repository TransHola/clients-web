const fs = require('fs');
const path = '/Users/fathallahlahlou/Workspace/clients-web/src/components/booking/vehicle-details-panel.tsx';
let code = fs.readFileSync(path, 'utf8');

const targetRegex = /<div style=\{\{ padding: '16px', overflowY: 'auto', flex: 1, background: '#1e293b' \}\}>[\s\S]*?<\/div>\n          <\/div>\n        <\/div>/;

const replacement = `<div style={{ padding: '16px', overflowY: 'auto', flex: 1, background: '#f8fafc' }}>
              {(option.vehicles || [{ type: option.label || option.title || 'Standard', debugLog: option.debugLog }]).map((v: any, idx: number) => {
                const logs = v.debugLog || [];
                return (
                  <div key={idx} style={{ marginBottom: '24px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                    <div style={{ padding: '12px 16px', background: '#0f172a', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Zap size={16} color="#38bdf8" />
                      <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: 'white' }}>{v.type || option.title}</h4>
                      <span style={{ marginLeft: 'auto', fontSize: '10px', fontWeight: 700, color: '#94a3b8', background: '#1e293b', padding: '2px 8px', borderRadius: '12px' }}>CALCULATION ENGINE</span>
                    </div>
                    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {logs.length > 0 ? logs.map((log: string, lIdx: number) => {
                        const isInit = log.includes('initialized for');
                        const isDayHeader = log.includes('Engine:');
                        const isCharge = log.includes('-> Charged');
                        
                        if (isInit) return null; // Skip init log
                        
                        if (isDayHeader) {
                          const dayMatch = log.match(/\\[(Day \\d+)\\]/);
                          const dayStr = dayMatch ? dayMatch[1] : '';
                          const details = log.replace(/\\[Day \\d+\\] Engine:/, '').trim();
                          return (
                            <div key={lIdx} style={{ marginTop: lIdx > 1 ? '8px' : 0, paddingBottom: '4px', borderBottom: '2px solid #f1f5f9' }}>
                              <span style={{ fontSize: '12px', fontWeight: 800, color: '#3b82f6', background: '#eff6ff', padding: '2px 6px', borderRadius: '4px', marginRight: '8px' }}>{dayStr}</span>
                              <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>{details}</span>
                            </div>
                          );
                        }
                        
                        if (isCharge) {
                          const parts = log.split('-> Charged');
                          const title = parts[0].replace(/\\[Day \\d+\\]/, '').trim();
                          const mathParts = parts[1].split('=');
                          const math = mathParts[0].trim();
                          const total = mathParts[1]?.trim() || '';
                          
                          return (
                            <div key={lIdx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8fafc', borderRadius: '6px', marginLeft: '12px', borderLeft: '2px solid #cbd5e1' }}>
                              <div>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>{title}</div>
                                <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace', marginTop: '2px' }}>{math}</div>
                              </div>
                              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>{total}</div>
                            </div>
                          );
                        }
                        
                        // Fallback generic log
                        return <div key={lIdx} style={{ fontSize: '12px', color: '#64748b', fontFamily: 'monospace' }}>{log}</div>;
                      }) : (
                        <div style={{ fontSize: '12px', color: '#64748b', textAlign: 'center', padding: '12px' }}>No engine log data available. Check backend server.</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>`;

code = code.replace(targetRegex, replacement);
fs.writeFileSync(path, code);
console.log("modal redesigned");
