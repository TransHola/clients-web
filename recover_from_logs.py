import json
import re

file_path = "/Users/fathallahlahlou/.gemini/antigravity/brain/021c5bfe-9b17-4768-80e9-3306c9e22579/.system_generated/logs/overview.txt"

lines_dict = {}

with open(file_path, 'r') as f:
    for line in f:
        try:
            entry = json.loads(line)
            # Stop if we hit the git checkout command in the logs!
            if entry.get("source") == "MODEL" and entry.get("type") == "PLANNER_RESPONSE":
                tool_calls = entry.get("tool_calls", [])
                for tc in tool_calls:
                    if tc.get("name") == "run_command" and "git checkout" in tc.get("args", {}).get("CommandLine", ""):
                        print("Hit git checkout, stopping collection.")
                        # We won't break just yet, maybe we just want to collect all views BEFORE git checkout
            
            content = entry.get("content", "")
            if "The following code has been modified to include a line number before every line" in content:
                for l in content.split("\n"):
                    match = re.match(r"^(\d+): (.*)$", l)
                    if match:
                        line_num = int(match.group(1))
                        line_content = match.group(2)
                        # We want the LATEST version seen, but BEFORE git checkout.
                        # Wait, since we are reading sequentially, we just overwrite.
                        # As long as we stop before git checkout.
                        lines_dict[line_num] = line_content
        except Exception as e:
            pass

if lines_dict:
    max_line = max(lines_dict.keys())
    with open("recovered_booking_panel.tsx", "w") as out:
        for i in range(1, max_line + 1):
            out.write(lines_dict.get(i, "") + "\n")
    print(f"Recovered {len(lines_dict)} lines up to line {max_line}")
else:
    print("Failed to recover any lines.")
