document.addEventListener('DOMContentLoaded', () => {
    const stage = document.getElementById('stage');
    const partsContainer = document.getElementById('parts-container');
    let selectedItems = [];

    // Undo/Redo History
    let history = [];
    let historyPointer = -1;
    const MAX_HISTORY_SIZE = 50; // Limit history size

    function saveState() {
        if (historyPointer < history.length - 1) {
            history = history.slice(0, historyPointer + 1);
        }

        const currentState = {
            items: [],
            memberTable: [],
            header: {
                date: document.getElementById('date-input').value, // Save the raw YYYY-MM-DD value
                performanceOrder: document.getElementById('performance-order').innerText,
                bandName: document.getElementById('band-name').innerText,
                totalTime: document.getElementById('total-time').innerText,
                venueName: document.getElementById('venue-name').innerText
            }
        };

        document.querySelectorAll('.draggable-item').forEach(item => {
            const itemState = item.state;
            const type = item.classList.contains('text-box') ? 'text' : 'svg';
            const src = type === 'svg' ? item.querySelector('img').src : '';
            const textContent = type === 'text' ? item.querySelector('[contenteditable="true"]').textContent : '';
            const grayedOut = item.classList.contains('grayed-out');

            currentState.items.push({
                ...itemState,
                type,
                src,
                textContent,
                grayedOut
            });
        });

        const memberTableBody = document.getElementById('member-request-table').getElementsByTagName('tbody')[0];
        Array.from(memberTableBody.rows).forEach(row => {
            const rowData = [];
            Array.from(row.cells).forEach(cell => {
                rowData.push(cell.textContent);
            });
            currentState.memberTable.push(rowData);
        });

        history.push(currentState);
        historyPointer++;

        if (history.length > MAX_HISTORY_SIZE) {
            history.shift();
            historyPointer--;
        }
        updateUndoRedoButtons();
    }

    async function restoreState(state) {
        stage.querySelectorAll('.draggable-item').forEach(item => item.remove());
        selectedItems = [];

        for (const itemState of state.items) {
            const item = await createNewItem(itemState.src, itemState.x, itemState.y, itemState.type, itemState.textContent, false); // Don't save state during restore
            
            // Restore exact state properties
            item.state = { ...itemState };
            item.style.width = item.state.width + 'px';
            item.style.height = item.state.height + 'px';
            applyTransform(item, item.state);

            if (itemState.grayedOut) {
                item.classList.add('grayed-out');
            }
        }

        const memberTableBody = document.getElementById('member-request-table').getElementsByTagName('tbody')[0];
        memberTableBody.innerHTML = '';
        state.memberTable.forEach(rowData => {
            const newRow = memberTableBody.insertRow();
            rowData.forEach(cellText => {
                let newCell = newRow.insertCell();
                newCell.contentEditable = "true";
                newCell.textContent = cellText;
            });
            newRow.addEventListener('click', () => {
                Array.from(memberTableBody.rows).forEach(r => r.classList.remove('selected-row'));
                newRow.classList.add('selected-row');
            });
        });

        document.getElementById('date-input').value = state.header.date;
        // Also update the display
        const dateValue = state.header.date;
        if (dateValue) {
            const [year, month, day] = dateValue.split('-');
            document.getElementById('date-display').innerText = `${year}/${month}/${day}`;
        } else {
            document.getElementById('date-display').innerText = '';
        }

        document.getElementById('performance-order').innerText = state.header.performanceOrder;
        document.getElementById('band-name').innerText = state.header.bandName;
        document.getElementById('total-time').innerText = state.header.totalTime;
        document.getElementById('venue-name').innerText = state.header.venueName;

        updateUndoRedoButtons();
    }

    const svgFiles = {
        'Drums': ['China.svg', 'Crash.svg', 'EffectCymbal.svg', 'FTOM.svg', 'Hihat.svg', 'HTOM.svg', 'Kick.svg', 'LTOM.svg', 'Ride.svg', 'Snare.svg', 'Splash.svg'],
        'Electronic': ['100V.svg', 'DI.svg', 'IEM.svg', 'Mic.svg', 'Mixer.svg', 'Monitor.svg', 'PC.svg'],
        'Guitar_Bass': ['cabi.svg', 'Combo.svg', 'Head.svg'],
        'Others': ['Human.svg']
    };

    for (const category in svgFiles) {
        const categoryContainer = document.createElement('div');
        categoryContainer.classList.add('category-container');

        const categoryHeader = document.createElement('h4');
        categoryHeader.textContent = `▶︎ ${category}`;
        categoryHeader.classList.add('category-header');
        categoryContainer.appendChild(categoryHeader);

        const categoryItems = document.createElement('div');
        categoryItems.classList.add('category-items', 'hidden');
        categoryContainer.appendChild(categoryItems);

        svgFiles[category].forEach(file => {
            const div = document.createElement('div');
            div.classList.add('svg-item');
            div.setAttribute('data-src', `SVG_icon/${category}/${file}`);
            const img = document.createElement('img');
            img.src = `SVG_icon/${category}/${file}`;
            div.appendChild(img);
            categoryItems.appendChild(div);
        });
        partsContainer.appendChild(categoryContainer);

        categoryHeader.addEventListener('click', () => {
            categoryItems.classList.toggle('hidden');
            categoryHeader.textContent = categoryItems.classList.contains('hidden') ? `▶︎ ${category}` : `▼ ${category}`;
        });
    }

    stage.addEventListener('click', (e) => {
        if (e.target === stage) {
            selectedItems.forEach(item => item.classList.remove('selected'));
            selectedItems = [];
        }
    });

    function applyTransform(element, state) {
        element.style.transform = `translate(${state.x}px, ${state.y}px) rotate(${state.angle}deg)`;
        element.setAttribute('data-x', state.x);
        element.setAttribute('data-y', state.y);
        element.setAttribute('data-angle', state.angle);
    }

    async function createNewItem(src, x, y, type = 'svg', textContent = '', doSaveState = true) {
        const item = document.createElement('div');
        item.className = 'draggable-item';

        let initialWidth, initialHeight;

        if (type === 'svg') {
            const img = new Image();
            img.src = src;
            await new Promise(resolve => img.onload = resolve);
            initialWidth = img.naturalWidth * 0.6;
            initialHeight = img.naturalHeight * 0.6;
            item.innerHTML = `<img src="${src}" alt="stage item">`;
        } else { // text
            item.classList.add('text-box');
            initialWidth = 150;
            initialHeight = 50;
            const textEl = document.createElement('div');
            textEl.contentEditable = true;
            textEl.textContent = textContent || 'テキスト';
            item.appendChild(textEl);
        }

        item.innerHTML += `
            <div class="rotate-handle"></div>
            <div class="resize-handle nw"></div>
            <div class="resize-handle ne"></div>
            <div class="resize-handle sw"></div>
            <div class="resize-handle se"></div>
        `;
        stage.appendChild(item);

        item.state = { x, y, width: initialWidth, height: initialHeight, angle: 0 };
        item.style.width = item.state.width + 'px';
        item.style.height = item.state.height + 'px';
        applyTransform(item, item.state);

        initializeInteractions(item);

        selectedItems.forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        selectedItems = [item];

        if (doSaveState) {
            saveState();
        }
        return item;
    }

    function initializeInteractions(element) {
        if (!element.state) {
            element.state = {
                x: parseFloat(element.getAttribute('data-x')) || 0,
                y: parseFloat(element.getAttribute('data-y')) || 0,
                angle: parseFloat(element.getAttribute('data-angle')) || 0,
                width: element.offsetWidth,
                height: element.offsetHeight
            };
        }

        interact(element)
            .draggable({
                inertia: false, // Set to false for better control
                ignoreFrom: '.text-box [contenteditable="true"]', // Ignore dragging from contenteditable areas
                listeners: {
                    move(event) {
                        element.state.x += event.dx;
                        element.state.y += event.dy;
                        applyTransform(element, element.state);
                    }
                },
                modifiers: [interact.modifiers.restrictRect({ restriction: 'parent' })],
                onend: saveState
            })
            .resizable({
                edges: { left: true, right: true, bottom: true, top: true },
                listeners: {
                    move(event) {
                        let { x, y } = element.state;
                        element.style.width = `${event.rect.width}px`;
                        element.style.height = `${event.rect.height}px`;
                        x += event.deltaRect.left;
                        y += event.deltaRect.top;
                        element.state.width = event.rect.width;
                        element.state.height = event.rect.height;
                        element.state.x = x;
                        element.state.y = y;
                        applyTransform(element, element.state);
                    }
                },
                modifiers: [
                    interact.modifiers.aspectRatio({ ratio: 'preserve' }),
                    interact.modifiers.restrictSize({ min: { width: 30, height: 30 } })
                ],
                inertia: false,
                onend: saveState
            });

        interact(element.querySelector('.rotate-handle'))
            .draggable({
                listeners: {
                    move(event) {
                        const rect = element.getBoundingClientRect();
                        const centerX = rect.left + rect.width / 2;
                        const centerY = rect.top + rect.height / 2;
                        const angle = Math.atan2(event.pageY - centerY, event.pageX - centerX);
                        element.state.angle = angle * (180 / Math.PI) + 90;
                        applyTransform(element, element.state);
                    }
                },
                onend: saveState
            });

        element.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!e.shiftKey && !e.metaKey) {
                selectedItems.forEach(item => item.classList.remove('selected'));
                selectedItems = [];
            }
            if (!selectedItems.includes(element)) {
                selectedItems.push(element);
            }
            element.classList.add('selected');
            stage.appendChild(element);
        });
    }

    interact('.svg-item').draggable({
        inertia: true,
        listeners: {
            move: (event) => {
                const { target } = event;
                const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
                const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;
                target.style.transform = `translate(${x}px, ${y}px)`;
                target.setAttribute('data-x', x);
                target.setAttribute('data-y', y);
            }
        }
    });

    interact('#stage').dropzone({
        accept: '.svg-item',
        ondrop: (event) => {
            const src = event.relatedTarget.getAttribute('data-src');
            const stageRect = stage.getBoundingClientRect();
            const x = event.dragEvent.clientX - stageRect.left;
            const y = event.dragEvent.clientY - stageRect.top;
            createNewItem(src, x, y);
            event.relatedTarget.style.transform = 'none';
            event.relatedTarget.removeAttribute('data-x');
            event.relatedTarget.removeAttribute('data-y');
        }
    });

    document.getElementById('export-pdf').addEventListener('click', async () => {
        const stageElement = document.getElementById('stage');
        const legendElement = document.querySelector('.stage-legend');
        const mainContentElement = document.getElementById('main-content');

        // Temporarily hide selections for a clean capture, but keep the legend visible
        const selected = document.querySelectorAll('.selected');
        selected.forEach(el => el.classList.remove('selected'));

        // Temporarily hide selected rows in member table
        const selectedRows = document.querySelectorAll('#member-request-table .selected-row');
        selectedRows.forEach(row => row.classList.remove('selected-row'));

        // Store original main-content styles and adjust for full capture
        const originalMainContentOverflow = mainContentElement.style.overflow;
        const originalMainContentHeight = mainContentElement.style.height;
        const originalMainContentPaddingBottom = mainContentElement.style.paddingBottom;
        const originalMainContentTransform = mainContentElement.style.transform; // Store original transform
        const originalMainContentTransformOrigin = mainContentElement.style.transformOrigin; // Store original transform-origin

        mainContentElement.style.overflow = 'visible';
        mainContentElement.style.height = 'fit-content';
        mainContentElement.style.paddingBottom = '100px';

        // Calculate scale based on member table width
        const memberTable = document.getElementById('member-request-table');
        const memberTableWidth = memberTable.offsetWidth;
        const stageArea = document.getElementById('stage-area');
        const stageAreaWidth = stageArea.offsetWidth;

        let scaleFactor = 1; // Default scale
        if (stageAreaWidth > 0) {
            scaleFactor = memberTableWidth / stageAreaWidth;
        }

        // Ensure a minimum scale to avoid tiny images, and a maximum to prevent excessive scaling
        scaleFactor = Math.max(1, Math.min(2, scaleFactor)); // Scale between 1 and 2

        const html2canvasScale = 2 * scaleFactor; // Base scale of 2 for resolution, multiplied by our calculated factor

        const conversions = [];
        const originalSrcs = new Map();

        document.querySelectorAll('.draggable-item img[src$=".svg"]').forEach(img => {
            const originalSrc = img.src;
            originalSrcs.set(img, originalSrc);

            const conversionPromise = new Promise(async (resolve) => {
                try {
                    const response = await fetch(originalSrc);
                    const svgText = await response.text();
                    const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
                    const url = URL.createObjectURL(svgBlob);
                    
                    const image = new Image();
                    image.onload = () => {
                        const canvas = document.createElement('canvas');
                        canvas.width = image.width;
                        canvas.height = image.height;
                        const ctx = canvas.getContext('2d');

                        // Check if the parent item is grayed out and apply filter directly to the canvas
                        const parentItem = img.closest('.draggable-item');
                        if (parentItem && parentItem.classList.contains('grayed-out')) {
                            ctx.filter = 'grayscale(90%) brightness(60%)';
                        }

                        ctx.drawImage(image, 0, 0);
                        img.src = canvas.toDataURL('image/png');
                        URL.revokeObjectURL(url);
                        resolve();
                    };
                    image.onerror = () => resolve(); // Resolve even if image fails to load
                    image.src = url;
                } catch (error) {
                    console.error('Error converting SVG to PNG:', error);
                    resolve(); // Ensure promise always resolves
                }
            });
            conversions.push(conversionPromise);
        });

        await Promise.all(conversions);

        try {
            const canvas = await html2canvas(document.getElementById('main-content'), {
                scale: html2canvasScale, // Use dynamically calculated scale
                logging: true
            });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jspdf.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }); // Change to portrait

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const canvasAspectRatio = canvas.width / canvas.height;
            const pdfAspectRatio = pdfWidth / pdfHeight;

            let finalImgWidth;
            let finalImgHeight;

            if (canvasAspectRatio > pdfAspectRatio) {
                // Canvas is wider than PDF page, scale by width
                finalImgWidth = pdfWidth;
                finalImgHeight = pdfWidth / canvasAspectRatio;
            } else {
                // Canvas is taller or same aspect ratio as PDF page, scale by height
                finalImgHeight = pdfHeight;
                finalImgWidth = pdfHeight * canvasAspectRatio;
            }

            // Center the image on the page
            const xPosition = (pdfWidth - finalImgWidth) / 2;
            const yPosition = (pdfHeight - finalImgHeight) / 2;

            pdf.addImage(imgData, 'PNG', xPosition, yPosition, finalImgWidth, finalImgHeight);
            pdf.save("stage-set.pdf");
        } catch (error) {
            console.error("Error generating PDF:", error);
        } finally {
            // Restore original state
            originalSrcs.forEach((src, img) => img.src = src);
            selected.forEach(el => el.classList.add('selected'));
            selectedRows.forEach(row => row.classList.add('selected-row')); // Restore selected rows
            mainContentElement.style.overflow = originalMainContentOverflow;
            mainContentElement.style.height = originalMainContentHeight;
            mainContentElement.style.paddingBottom = originalMainContentPaddingBottom; // Restore original padding
        }
    });

    document.getElementById('delete-item').addEventListener('click', () => {
        selectedItems.forEach(item => item.remove());
        selectedItems = [];
        saveState();
    });

    document.getElementById('reset-rotation').addEventListener('click', () => {
        selectedItems.forEach(item => {
            item.state.angle = 0;
            applyTransform(item, item.state);
        });
        saveState();
    });

    document.getElementById('toggle-grayout').addEventListener('click', () => {
        selectedItems.forEach(item => item.classList.toggle('grayed-out'));
        saveState();
    });

    document.getElementById('add-text-box').addEventListener('click', () => {
        const stageRect = stage.getBoundingClientRect();
        createNewItem('', stageRect.width / 2 - 75, stageRect.height / 2 - 25, 'text');
    });

    document.getElementById('add-member-row').addEventListener('click', () => addEditableRow('member-request-table'));

    function addEditableRow(tableId) {
        const tbody = document.getElementById(tableId).getElementsByTagName('tbody')[0];
        const newRow = tbody.insertRow();
        const cellCount = document.getElementById(tableId).getElementsByTagName('thead')[0].rows[0].cells.length;
        for (let i = 0; i < cellCount; i++) {
            let newCell = newRow.insertCell();
            newCell.contentEditable = "true";
        }
        newRow.addEventListener('click', () => {
            Array.from(tbody.rows).forEach(r => r.classList.remove('selected-row'));
            newRow.classList.add('selected-row');
        });
        saveState();
    }

    document.getElementById('delete-member-row').addEventListener('click', () => {
        const table = document.getElementById('member-request-table');
        const selectedRow = table.querySelector('.selected-row');
        if (selectedRow) {
            selectedRow.remove();
            saveState();
        }
    });

    const undoButton = document.getElementById('undo-button');
    const redoButton = document.getElementById('redo-button');

    function updateUndoRedoButtons() {
        undoButton.disabled = historyPointer <= 0;
        redoButton.disabled = historyPointer >= history.length - 1;
    }

    undoButton.addEventListener('click', () => {
        if (historyPointer > 0) {
            historyPointer--;
            restoreState(history[historyPointer]);
        }
    });

    redoButton.addEventListener('click', () => {
        if (historyPointer < history.length - 1) {
            historyPointer++;
            restoreState(history[historyPointer]);
        }
    });

    saveState(); // Initial state

    // --- Date Picker and Formatter Logic ---
    const dateInput = document.getElementById('date-input');
    const dateDisplay = document.getElementById('date-display');

    // When the hidden calendar input changes, update the display
    dateInput.addEventListener('change', () => {
        const dateValue = dateInput.value;
        if (dateValue) {
            const [year, month, day] = dateValue.split('-');
            dateDisplay.innerText = `${year}/${month}/${day}`;
            saveState(); // Save the new state
        }
    });

    // When the user types in the display area, format it
    dateDisplay.addEventListener('blur', () => {
        let text = dateDisplay.innerText.replace(/[^0-9]/g, ''); // Remove non-numeric characters
        if (text.length === 8) {
            const year = text.substring(0, 4);
            const month = text.substring(4, 6);
            const day = text.substring(6, 8);
            
            // Basic validation
            if (parseInt(month, 10) >= 1 && parseInt(month, 10) <= 12 && parseInt(day, 10) >= 1 && parseInt(day, 10) <= 31) {
                dateDisplay.innerText = `${year}/${month}/${day}`;
                dateInput.value = `${year}-${month}-${day}`; // Update the hidden input as well
                saveState(); // Save the new state
            }
        }
    });
});