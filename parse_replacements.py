import json
import glob

# The most recent conversations
convos = [
    "dc8ecf80-cc6f-4697-b5a4-659797f329a9", # Optimizing Booking Panel Interface
    "d16e14a7-fa90-4da7-b8f4-6cf51d3234fe", # Pricing Controls
    "8a1fc4e9-8b32-42e6-ba59-1a1714b24cc7", # Resolving Quotation Pricing
    "c48ca96a-fc63-48de-8956-ebb2b4af6772", # Refining Itinerary Booking
    "0186515c-f8a2-4dc8-b52a-1226ec1dc50f"  # Restructuring Trip Confirmation
]

for c in reversed(convos):
    path = f"/Users/fathallahlahlou/.gemini/antigravity/brain/{c}/.system_generated/logs/overview.txt"
    try:
        with open(path, 'r') as f:
            for line in f:
                if 'replace_file_content' in line and 'booking-panel.tsx' in line:
                    data = json.loads(line)
                    if 'tool_calls' in data:
                        for tc in data['tool_calls']:
                            if tc['name'] == 'replace_file_content' and 'booking-panel.tsx' in tc.get('args', {}).get('TargetFile', ''):
                                print(f"\n--- From {c} ---")
                                print("Instruction:", tc['args'].get('Instruction'))
                                print("StartLine:", tc['args'].get('StartLine'))
                                print("EndLine:", tc['args'].get('EndLine'))
                                # print("Target:", tc['args'].get('TargetContent')[:100].replace('\n', ' '))
                                # print("Replacement:", tc['args'].get('ReplacementContent')[:100].replace('\n', ' '))
    except Exception as e:
        print(f"Error reading {c}: {e}")
