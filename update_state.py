import re

file_path = "/Users/fathallahlahlou/Workspace/clients-web/src/components/booking/booking-panel.tsx"
with open(file_path, "r") as f:
    content = f.read()

# 1. Remove the React.useState line for shuttleEndAtOrigin
content = content.replace("  const [shuttleEndAtOrigin, setShuttleEndAtOrigin] = React.useState(true)\n", "")

# 2. Update state saving logic (line 500)
content = content.replace("shuttleEndAtOrigin", "shuttleVehicleEndings")

with open(file_path, "w") as f:
    f.write(content)

print("Updated state.")
