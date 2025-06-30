import re
import os

file_path = "app.js"
full_file_path = os.path.join(os.getcwd(), file_path)

with open(full_file_path, 'r') as f:
    content = f.read()

# --- Draggable ---
# Remove saveState() from draggable move listener
content = re.sub(
    r'(listeners:\s*{\s*move\(event\)\s*{\s*[^}]*?applyTransform\(element, element\.state\);(?:\s*// If multiple items are selected,[^}]*?applyTransform\(item, item\.state\);)?\s*}\s*}\s*),\s*modifiers:\s*\[\s*interact\.modifiers\.restrictRect\({ restriction: \'parent\' }\)\s*\]\s*,\s*onend: saveState\s*//\s*Save state when drag ends\s*})',
    r'listeners:{
                    move(event) {
                        // Move the current element
                        element.state.x += event.dx;
                        element.state.y += event.dy;
                        applyTransform(element, element.state);

                        // If multiple items are selected, move them all
                        if (selectedItems.length > 1 && selectedItems.includes(element)) {
                            selectedItems.forEach(item => {
                                if (item !== element) { // Don\'t move the element that triggered the event again
                                    item.state.x += event.dx;
                                    item.state.y += event.dy;
                                    applyTransform(item, item.state);
                                }
                            });
                        }
                    }
                },
                modifiers: [
                    interact.modifiers.restrictRect({ restriction: \'parent\' })
                ],
                onend: saveState // Save state when drag ends
            }',
    content, flags=re.DOTALL
)

# --- Resizable ---
# Remove saveState() from resizable move listener
content = re.sub(
    r'(listeners:\s*{\s*move\(event\)\s*{\s*[^}]*?applyTransform\(item, item\.state\);\s*}\s*}\s*),\s*modifiers:\s*\[\s*interact\.modifiers\.aspectRatio\({ ratio: \'preserve\' }\),\s*interact\.modifiers\.restrictSize\({ min: { width: 30, height: 30 } }\)\s*\]\s*,\s*inertia: false\s*,\s*onend: saveState\s*//\s*Save state when resize ends\s*})',
    r'listeners:{
                    move(event) {
                        const target = event.target;
                        let x = parseFloat(target.getAttribute(\'data-x\')) || 0;
                        let y = parseFloat(target.getAttribute(\'data-y\')) || 0;

                        // Capture old dimensions before updating state
                        const oldTargetWidth = target.state.width;
                        const oldTargetHeight = target.state.height;

                        // Update the element\'s state dimensions
                        target.state.width = event.rect.width;
                        target.state.height = event.rect.height;

                        // Update the element\'s style dimensions
                        target.style.width = `${target.state.width}px`;
                        target.style.height = `${target.state.height}px`;

                        // Translate when resizing from top or left edges
                        x += event.deltaRect.left;
                        y += event.deltaRect.top;

                        target.state.x = x;
                        target.state.y = y;
                        applyTransform(target, target.state);

                        // Resize all selected items proportionally\n                        if (selectedItems.length > 1 && selectedItems.includes(target)) {\n                            // Calculate scale factors based on the change in the target element\'s dimensions\n                            const scaleX = target.state.width / oldTargetWidth;\n                            const scaleY = target.state.height / oldTargetHeight;\n\n                            selectedItems.forEach(item => {\n                                if (item !== target) {\n                                    const itemOldWidth = item.state.width;\n                                    const itemOldHeight = item.state.height;\n\n                                    item.state.width = itemOldWidth * scaleX;\n                                    item.state.height = itemOldHeight * scaleY;\n\n                                    item.style.width = `${item.state.width}px`;\n                                    item.style.height = `${item.state.height}px`;\n\n                                    // Adjust position based on the lead item\'s top-left corner movement, scaled by item\'s own scale factor\n                                    item.state.x += event.deltaRect.left * scaleX;\n                                    item.state.y += event.deltaRect.top * scaleY;\n\n                                    applyTransform(item, item.state);\n                                }\n                            });\n                        }\n                    }\n                },\n                modifiers: [\n                    interact.modifiers.aspectRatio({ ratio: \'preserve\' }),\n                    interact.modifiers.restrictSize({ min: { width: 30, height: 30 } })\n                ],\n                inertia: false,\n                onend: saveState // Save state when resize ends\n            }',
    content, flags=re.DOTALL
)

# --- Rotate Handle ---
# Remove saveState() from rotate-handle draggable move listener
content = re.sub(
    r'(listeners:\s*{\s*move\(event\)\s*{\s*[^}]*?applyTransform\(item, item\.state\);\s*}\s*}\s*),\s*onend: saveState\s*//\s*Save state when rotation ends\s*})',
    r'listeners:{
                    move(event) {
                        const rect = element.getBoundingClientRect();
                        const centerX = rect.left + rect.width / 2;
                        const centerY = rect.top + rect.height / 2;
                        const angle = Math.atan2(event.pageY - centerY, event.pageX - centerX);
                        const newAngle = angle * (180 / Math.PI) + 90; // Offset by 90 degrees\n
                        const deltaAngle = newAngle - element.state.angle; // Calculate angle change\n                        element.state.angle = newAngle;\n                        applyTransform(element, element.state);\n
                        // Rotate all selected items\n                        if (selectedItems.length > 1 && selectedItems.includes(element)) {\n                            selectedItems.forEach(item => {\n                                if (item !== element) {\n                                    item.state.angle += deltaAngle;\n                                    applyTransform(item, item.state);\n                                }\n                            });\n                        }\n                    }\n                },\n                onend: saveState // Save state when rotation ends\n            }',
    content, flags=re.DOTALL
)

with open(full_file_path, 'w') as f:
    f.write(content)

print("app.js has been modified.")
