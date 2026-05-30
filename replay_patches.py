import json
import glob
import os

convos = [
    "b66ab5c8-b29a-44b8-a178-99e10793f35f",
    "0186515c-f8a2-4dc8-b52a-1226ec1dc50f",
    "af978609-2e70-496d-a19a-f82749dde8ec",
    "20e03a5d-6158-4acf-92bd-80fab1ded84c",
    "ee16243d-25ec-4cbe-ae57-d5d3905a845a",
    "056662e1-a32c-461e-8242-4e716a342490",
    "c48ca96a-fc63-48de-8956-ebb2b4af6772",
    "8a1fc4e9-8b32-42e6-ba59-1a1714b24cc7",
    "d16e14a7-fa90-4da7-b8f4-6cf51d3234fe",
    "dc8ecf80-cc6f-4697-b5a4-659797f329a9",
    "3e0ecf0a-aa33-4646-b0f6-71593faf6e76",
    "021c5bfe-9b17-4768-80e9-3306c9e22579"
]

file_path = "src/components/booking/booking-panel.tsx"
with open(file_path, "r") as f:
    content = f.read()

total_applied = 0
total_failed = 0

for c in convos:
    log_path = f"/Users/fathallahlahlou/.gemini/antigravity/brain/{c}/.system_generated/logs/overview.txt"
    if not os.path.exists(log_path):
        continue
    
    with open(log_path, 'r') as f:
        for line in f:
            if 'replace_file_content' in line and 'booking-panel.tsx' in line:
                try:
                    data = json.loads(line)
                    if 'tool_calls' in data:
                        for tc in data['tool_calls']:
                            if tc['name'] == 'replace_file_content' and 'booking-panel.tsx' in tc.get('args', {}).get('TargetFile', ''):
                                target = tc['args'].get('TargetContent', '')
                                replacement = tc['args'].get('ReplacementContent', '')
                                if target in content:
                                    content = content.replace(target, replacement, 1)
                                    total_applied += 1
                                else:
                                    print(f"FAILED to apply patch from {c}: {tc['args'].get('Instruction')}")
                                    total_failed += 1
                except Exception as e:
                    pass

with open("booking-panel-replayed.tsx", "w") as f:
    f.write(content)

print(f"Applied {total_applied} patches. Failed {total_failed} patches.")
