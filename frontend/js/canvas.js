const canvas = document.getElementById('graphCanvas');
const ctx = canvas.getContext('2d');
const detailsCard = document.getElementById('detailsCard');
const searchInput = document.getElementById('nodeSearch');

// Viewport Camera State
let scale = 0.85;
let offsetX = 0;
let offsetY = 20;
let isDragging = false;
let startX, startY;
let selectedNode = null;
let hoveredNode = null;
let searchQuery = "";

// Camera Lerp target for transitions
let targetX = null;
let targetY = null;
let isAnimating = false;

// Dimensions setup
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    draw();
}
window.addEventListener('resize', resizeCanvas);

// Generate Corkboard Procedural Texture
let corkPattern = null;
function createCorkTexture() {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 256;
    tempCanvas.height = 256;
    const tempCtx = tempCanvas.getContext('2d');
    
    // Base cork warm color
    tempCtx.fillStyle = '#bc9673';
    tempCtx.fillRect(0, 0, 256, 256);
    
    // Draw fine organic noise specks
    for (let i = 0; i < 15000; i++) {
        const x = Math.random() * 256;
        const y = Math.random() * 256;
        const size = Math.random() * 1.5;
        const rand = Math.random();
        if (rand < 0.5) {
            tempCtx.fillStyle = 'rgba(109, 78, 51, ' + (Math.random() * 0.15 + 0.05) + ')';
        } else {
            tempCtx.fillStyle = 'rgba(235, 210, 180, ' + (Math.random() * 0.2 + 0.05) + ')';
        }
        tempCtx.beginPath();
        tempCtx.arc(x, y, size, 0, Math.PI * 2);
        tempCtx.fill();
    }
    
    // Draw wood pulp patches
    for (let i = 0; i < 40; i++) {
        const x = Math.random() * 256;
        const y = Math.random() * 256;
        const w = Math.random() * 15 + 5;
        const h = Math.random() * 8 + 3;
        tempCtx.fillStyle = 'rgba(120, 85, 55, 0.08)';
        tempCtx.beginPath();
        tempCtx.ellipse(x, y, w, h, Math.random() * Math.PI, 0, Math.PI * 2);
        tempCtx.fill();
    }
    
    corkPattern = ctx.createPattern(tempCanvas, 'repeat');
}

// Generate Torn Edges Jagged Path
function drawJaggedRect(c, x, y, w, h, roughness = 4, segmentLength = 8) {
    c.beginPath();
    
    // Top Edge (Left to Right)
    c.moveTo(x, y);
    for (let curX = x + segmentLength; curX < x + w; curX += segmentLength) {
        c.lineTo(curX, y + (Math.random() * roughness - roughness / 2));
    }
    c.lineTo(x + w, y);
    
    // Right Edge (Top to Bottom)
    for (let curY = y + segmentLength; curY < y + h; curY += segmentLength) {
        c.lineTo(x + w + (Math.random() * roughness - roughness / 2), curY);
    }
    c.lineTo(x + w, y + h);
    
    // Bottom Edge (Right to Left)
    for (let curX = x + w - segmentLength; curX > x; curX -= segmentLength) {
        c.lineTo(curX, y + h + (Math.random() * roughness - roughness / 2));
    }
    c.lineTo(x, y + h);
    
    // Left Edge (Bottom to Top)
    for (let curY = y + h - segmentLength; curY > y; curY -= segmentLength) {
        c.lineTo(x + (Math.random() * roughness - roughness / 2), curY);
    }
    c.closePath();
}

// Draw red pushpin / brass tack
function drawPushpin(c, x, y, color = '#c0392b') {
    c.save();
    
    // Draw Tack shadow on board
    c.shadowColor = 'rgba(0, 0, 0, 0.5)';
    c.shadowBlur = 6;
    c.shadowOffsetX = 3;
    c.shadowOffsetY = 5;
    
    // Tack pin point entry
    c.fillStyle = '#1c1c1e';
    c.beginPath();
    c.arc(x, y, 1.5, 0, Math.PI * 2);
    c.fill();
    
    // Tack metal shank
    c.strokeStyle = '#95a5a6';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(x + 2, y + 2);
    c.lineTo(x + 5, y + 5);
    c.stroke();
    
    // Plastic pushpin head
    c.fillStyle = color;
    c.beginPath();
    c.arc(x + 5, y + 5, 6, 0, Math.PI * 2);
    c.fill();
    
    // Highlight reflection
    c.fillStyle = 'rgba(255, 255, 255, 0.4)';
    c.beginPath();
    c.arc(x + 4, y + 4, 2, 0, Math.PI * 2);
    c.fill();
    
    c.restore();
}

// Draw text scaled down to fit perfectly inside the designated maximum width bounds
function drawFittedText(c, text, maxWidth, defaultSize, fontFamily, bold = false) {
    c.save();
    let size = defaultSize;
    c.font = (bold ? 'bold ' : '') + size + 'px ' + fontFamily;
    while (c.measureText(text).width > maxWidth && size > 6) {
        size -= 0.5;
        c.font = (bold ? 'bold ' : '') + size + 'px ' + fontFamily;
    }
    c.fillText(text, 0, 0);
    c.restore();
}

// Master Draw Loop
function draw() {
    // Fill cork board pattern
    if (!corkPattern) {
        createCorkTexture();
    }
    ctx.fillStyle = corkPattern;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw outer wooden frame shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 30;
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 10;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    
    ctx.save();
    // Move to viewport coordinate frame
    ctx.translate(canvas.width / 2 + offsetX, canvas.height / 2 + offsetY);
    ctx.scale(scale, scale);
    
    // 1. Draw Red Thread Strings (Bezier lines with drop shadows)
    NODES.forEach(node => {
        if (node.parent) {
            const parentNode = NODES.find(n => n.id === node.parent);
            if (parentNode) {
                const nodeTheme = THEMES[node.type];
                
                // Determine opacity based on search query matching
                const matchesParent = parentNode.text.toLowerCase().includes(searchQuery) || parentNode.desc.toLowerCase().includes(searchQuery);
                const matchesChild = node.text.toLowerCase().includes(searchQuery) || node.desc.toLowerCase().includes(searchQuery);
                const isFaded = searchQuery && !matchesParent && !matchesChild;
                
                ctx.save();
                ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
                ctx.shadowBlur = 4;
                ctx.shadowOffsetX = 2;
                ctx.shadowOffsetY = 4;
                
                ctx.strokeStyle = isFaded ? 'rgba(192, 57, 43, 0.15)' : nodeTheme.stringColor;
                ctx.lineWidth = node.type === 'root' ? 4 : 2;
                
                // Simple straight yarn linking pins
                ctx.beginPath();
                ctx.moveTo(parentNode.x, parentNode.y);
                
                // Curved/Slacked strings to make it look organic
                const midX = (parentNode.x + node.x) / 2;
                const midY = (parentNode.y + node.y) / 2 + 10; // Slack sag
                ctx.quadraticCurveTo(midX, midY, node.x, node.y);
                ctx.stroke();
                
                ctx.restore();
            }
        }
    });
    
    // 2. Draw Cards/Clippings Nodes
    NODES.forEach(node => {
        const theme = THEMES[node.type];
        const isHovered = (hoveredNode === node);
        const isSelected = (selectedNode === node);
        const isQueryMatched = !searchQuery || node.text.toLowerCase().includes(searchQuery) || node.desc.toLowerCase().includes(searchQuery);
        const opacity = isQueryMatched ? 1.0 : 0.15;
        
        ctx.save();
        ctx.translate(node.x, node.y);
        
        // Static tilt angle per node to look like dynamic pinning
        const rotationAngle = (node.id.charCodeAt(0) % 6 - 3) * (Math.PI / 180);
        ctx.rotate(rotationAngle);
        
        // Setup drop shadows for paper clippings
        ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
        ctx.shadowBlur = isHovered ? 15 : 6;
        ctx.shadowOffsetX = isHovered ? 6 : 3;
        ctx.shadowOffsetY = isHovered ? 12 : 5;
        
        ctx.globalAlpha = opacity;
        
        // RENDER NODE BY SHAPE
        if (node.shape === 'polaroid') {
            const w = 110;
            const h = 130;
            
            // Photo card back
            ctx.fillStyle = theme.bg;
            ctx.strokeStyle = isSelected ? '#34495e' : '#e2d6be';
            ctx.lineWidth = isSelected ? 4 : 1;
            ctx.fillRect(-w/2, -h/2, w, h);
            ctx.strokeRect(-w/2, -h/2, w, h);
            
            // Image area (Mocked as sketch silhouette)
            ctx.fillStyle = '#4a3f35';
            ctx.fillRect(-w/2 + 8, -h/2 + 8, w - 16, h - 38);
            
            // Draw head sketch
            ctx.fillStyle = '#8c7a6b';
            ctx.beginPath();
            ctx.arc(0, -10, 15, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(0, 15, 25, 12, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Polaroid bottom white frame text (Bold and Fitted)
            ctx.shadowColor = 'transparent';
            ctx.fillStyle = '#000000';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            const lines = node.text.split('\n');
            ctx.save();
            ctx.translate(0, h/2 - 22);
            drawFittedText(ctx, lines[0], w - 12, 11, '"Courier Prime", monospace', true);
            ctx.restore();
            
            if (lines[1]) {
                ctx.save();
                ctx.translate(0, h/2 - 10);
                drawFittedText(ctx, lines[1], w - 12, 11, '"Courier Prime", monospace', true);
                ctx.restore();
            }
            
        } else if (node.shape === 'newspaper_clipping') {
            const w = 160;
            const h = 50;
            
            // Yellowed print clipping
            ctx.fillStyle = theme.bg;
            ctx.strokeStyle = isSelected ? '#000000' : 'rgba(0,0,0,0.15)';
            ctx.lineWidth = isSelected ? 3 : 1;
            
            // Jagged borders
            drawJaggedRect(ctx, -w/2, -h/2, w, h, 2, 6);
            ctx.fill();
            ctx.stroke();
            
            // Inside print lining borders
            ctx.shadowBlur = 0;
            ctx.shadowColor = 'transparent';
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(-w/2 + 6, -h/2 + 4);
            ctx.lineTo(w/2 - 6, -h/2 + 4);
            ctx.moveTo(-w/2 + 6, h/2 - 4);
            ctx.lineTo(w/2 - 6, h/2 - 4);
            ctx.stroke();
            
            // Print text (Bold and Fitted)
            ctx.fillStyle = varColorText(theme.badge);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            drawFittedText(ctx, node.text, w - 16, 13, '"Playfair Display", serif', true);
            
        } else if (node.shape === 'note_card') {
            const w = 130;
            const h = 65;
            
            // Index card yellowed
            ctx.fillStyle = theme.bg;
            ctx.strokeStyle = isSelected ? '#1c1c1e' : 'rgba(0,0,0,0.1)';
            ctx.lineWidth = isSelected ? 3 : 1;
            ctx.fillRect(-w/2, -h/2, w, h);
            ctx.strokeRect(-w/2, -h/2, w, h);
            
            // Ruled lined cards (horizontal blue ink lines)
            ctx.shadowBlur = 0;
            ctx.shadowColor = 'transparent';
            ctx.strokeStyle = 'rgba(41, 128, 185, 0.2)';
            ctx.lineWidth = 1;
            const lineGap = 12;
            for (let ly = -h/2 + 15; ly < h/2 - 5; ly += lineGap) {
                ctx.beginPath();
                ctx.moveTo(-w/2 + 2, ly);
                ctx.lineTo(w/2 - 2, ly);
                ctx.stroke();
            }
            
            // Left margin line
            ctx.strokeStyle = 'rgba(192, 57, 43, 0.3)';
            ctx.beginPath();
            ctx.moveTo(-w/2 + 15, -h/2);
            ctx.lineTo(-w/2 + 15, h/2);
            ctx.stroke();
            
            // Note card text (Bold, Fitted, and Split to prevent overflow)
            ctx.fillStyle = '#000000';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            const words = node.text.split(' ');
            if (words.length > 1) {
                const mid = Math.ceil(words.length / 2);
                const line1 = words.slice(0, mid).join(' ');
                const line2 = words.slice(mid).join(' ');
                
                ctx.save();
                ctx.translate(0, -7);
                drawFittedText(ctx, line1, w - 20, 11, '"Courier Prime", monospace', true);
                ctx.restore();
                
                ctx.save();
                ctx.translate(0, 7);
                drawFittedText(ctx, line2, w - 20, 11, '"Courier Prime", monospace', true);
                ctx.restore();
            } else {
                drawFittedText(ctx, node.text, w - 20, 11, '"Courier Prime", monospace', true);
            }
            
        } else if (node.shape === 'tape_label') {
            const w = 110;
            const h = 26;
            
            // Cream masking tape scrap
            ctx.fillStyle = theme.bg;
            ctx.strokeStyle = isSelected ? '#2c2c2e' : 'rgba(0, 0, 0, 0.1)';
            ctx.lineWidth = isSelected ? 2 : 0.5;
            
            // Dynamic torn tape jagged path
            drawJaggedRect(ctx, -w/2, -h/2, w, h, 1.5, 4);
            ctx.fill();
            ctx.stroke();
            
            // Masking tape details (Bold, Fitted, and High Contrast Solid Black)
            ctx.shadowBlur = 0;
            ctx.shadowColor = 'transparent';
            ctx.fillStyle = '#000000';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            drawFittedText(ctx, node.text, 98, 10, '"Special Elite", monospace', true);
        }
        
        ctx.restore(); // Undo local rotation translates
        
        // Draw pushpins directly through node center point on board frame coordinates
        drawPushpin(ctx, node.x, node.y, theme.border);
    });
    
    ctx.restore(); // Undo scale zoom matrix
}

// Mapping colors inside clippings
function varColorText(badge) {
    if (badge === 'programming') return '#5a211b';
    if (badge === 'architecture') return '#5c3d0b';
    if (badge === 'ai') return '#22482e';
    if (badge === 'dsa') return '#213d52';
    if (badge === 'devops') return '#381e43';
    return '#1c1c1e';
}

// Click and Hover Node Collisions
function getNodeAt(x, y) {
    const canvasX = (x - canvas.width / 2 - offsetX) / scale;
    const canvasY = (y - canvas.height / 2 - offsetY) / scale;

    for (let i = NODES.length - 1; i >= 0; i--) {
        const node = NODES[i];
        
        // Approximation of dimensions per type
        let w = 100, h = 40;
        if (node.shape === 'polaroid') { w = 110; h = 130; }
        else if (node.shape === 'newspaper_clipping') { w = 160; h = 50; }
        else if (node.shape === 'note_card') { w = 130; h = 65; }
        else if (node.shape === 'tape_label') { w = 110; h = 26; }
        
        const localX = canvasX - node.x;
        const localY = canvasY - node.y;
        
        if (localX >= -w/2 && localX <= w/2 &&
            localY >= -h/2 && localY <= h/2) {
            return node;
        }
    }
    return null;
}

// Camera Lerp animation loop
function updateCamera() {
    if (isAnimating && targetX !== null && targetY !== null) {
        const dx = targetX - offsetX;
        const dy = targetY - offsetY;
        
        // Threshold check to terminate
        if (Math.hypot(dx, dy) < 0.5) {
            offsetX = targetX;
            offsetY = targetY;
            isAnimating = false;
            targetX = null;
            targetY = null;
        } else {
            offsetX += dx * 0.12; // Easing coefficient
            offsetY += dy * 0.12;
        }
        draw();
        requestAnimationFrame(updateCamera);
    }
}

// Slide in Detail Card & populate data
function selectNode(node) {
    selectedNode = node;
    
    // Populate newspaper columns data
    const theme = THEMES[node.type];
    
    const catBadge = document.getElementById('newspaperCategory');
    catBadge.innerText = theme.name;
    catBadge.style.color = theme.border;
    catBadge.style.borderColor = theme.border;
    
    document.getElementById('newspaperNodeId').innerText = `ID: ${node.id.toUpperCase()}`;
    document.getElementById('newspaperTitle').innerText = node.text.replace('\n', ' ');
    document.getElementById('newspaperDesc').innerText = node.desc;
    
    // Core Concepts
    const conceptUl = document.getElementById('newspaperConcepts');
    conceptUl.innerHTML = "";
    node.concepts.forEach(c => {
        const li = document.createElement('li');
        li.innerText = c;
        conceptUl.appendChild(li);
    });
    
    // Research Papers lists
    const papersContainer = document.getElementById('newspaperPapers');
    papersContainer.innerHTML = "";
    
    if (node.papers && node.papers.length > 0) {
        node.papers.forEach(p => {
            const a = document.createElement('a');
            a.className = "paper-item";
            a.href = p.url;
            a.target = "_blank";
            a.rel = "noopener noreferrer";
            
            const titleDiv = document.createElement('div');
            titleDiv.className = "paper-title";
            titleDiv.innerText = p.title;
            
            const authorDiv = document.createElement('div');
            authorDiv.className = "paper-author";
            authorDiv.innerText = p.authors;
            
            a.appendChild(titleDiv);
            a.appendChild(authorDiv);
            papersContainer.appendChild(a);
        });
    } else {
        const p = document.createElement('p');
        p.className = "no-papers";
        p.innerText = "No research papers linked to this specific node.";
        papersContainer.appendChild(p);
    }
    
    // Deep links matching
    document.getElementById('gitLink').href = `https://github.com/dev-shridhar/architect-of-intelligence`;
    
    detailsCard.classList.add('active');
    
    // Smooth camera transition to clicked node center
    targetX = -(node.x * scale);
    targetY = -(node.y * scale) + 50; // offset slightly upward for modal panels
    isAnimating = true;
    requestAnimationFrame(updateCamera);
}

// Mouse Event listeners
canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.clientX - offsetX;
    startY = e.clientY - offsetY;
});

window.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (isDragging) {
        isAnimating = false; // Override transition when user interacts
        offsetX = e.clientX - startX;
        offsetY = e.clientY - startY;
        draw();
    } else {
        const node = getNodeAt(mouseX, mouseY);
        if (node !== hoveredNode) {
            hoveredNode = node;
            canvas.style.cursor = node ? 'pointer' : 'grab';
            draw();
        }
    }
});

window.addEventListener('mouseup', () => {
    isDragging = false;
});

canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const node = getNodeAt(mouseX, mouseY);
    if (node) {
        selectNode(node);
    } else {
        selectedNode = null;
        detailsCard.classList.remove('active');
        draw();
    }
});

// Scroll Wheel zooming
canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomFactor = 1.08;
    if (e.deltaY < 0) {
        scale = Math.min(scale * zoomFactor, 2.2);
    } else {
        scale = Math.max(scale / zoomFactor, 0.35);
    }
    draw();
});

// Controls Hooks
document.getElementById('panUp').addEventListener('click', () => { offsetY += 60; draw(); });
document.getElementById('panDown').addEventListener('click', () => { offsetY -= 60; draw(); });
document.getElementById('panLeft').addEventListener('click', () => { offsetX += 60; draw(); });
document.getElementById('panRight').addEventListener('click', () => { offsetX -= 60; draw(); });
document.getElementById('resetView').addEventListener('click', () => {
    scale = 0.85;
    offsetX = 0;
    offsetY = 20;
    selectedNode = null;
    detailsCard.classList.remove('active');
    draw();
});
document.getElementById('zoomIn').addEventListener('click', () => { scale = Math.min(scale * 1.15, 2.2); draw(); });
document.getElementById('zoomOut').addEventListener('click', () => { scale = Math.max(scale / 1.15, 0.35); draw(); });
document.getElementById('closeDetails').addEventListener('click', () => {
    detailsCard.classList.remove('active');
    selectedNode = null;
    draw();
});

// Search input logic
searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    draw();
});

// Init
resizeCanvas();
draw();
requestAnimationFrame(updateCamera);
