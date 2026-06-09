class MapManager {
    constructor() {
        this.points = [];
        this.currentZoom = 1.0;
        this.minZoom = 0.5;
        this.maxZoom = 10;
        this.panX = 0;
        this.panY = 0;
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.dragStartPanX = 0;
        this.dragStartPanY = 0;
        this.currentEditingPoint = null;
        this.currentViewingPoint = null;

        this.initElements();
        this.attachEventListeners();
        // loadPoints and render are now called from DOMContentLoaded after async load
    }

    initElements() {
        // Map elements
        this.mapViewport = document.getElementById('mapViewport');
        this.mapCanvas = document.getElementById('mapCanvas');
        this.mapSvg = document.getElementById('mapSvg');
        this.markersGroup = document.getElementById('markersGroup');
        this.tilesGroup = null; // created lazily

        // UI elements
        this.addPointBtn = document.getElementById('addPointBtn');
        this.clearAllBtn = document.getElementById('clearAllBtn');
        this.pointsList = document.getElementById('pointsList');
        this.pointCount = document.getElementById('pointCount');
        this.zoomLevel = document.getElementById('zoomLevel');

        // Controls
        this.zoomInBtn = document.getElementById('zoomInBtn');
        this.zoomOutBtn = document.getElementById('zoomOutBtn');
        this.resetViewBtn = document.getElementById('resetViewBtn');

        // Point modal
        this.pointModal = document.getElementById('pointModal');
        this.modalTitle = document.getElementById('modalTitle');
        this.pointName = document.getElementById('pointName');
        this.pointDescription = document.getElementById('pointDescription');
        this.pointImage = document.getElementById('pointImage');
        this.pointColor = document.getElementById('pointColor');
        this.colorDisplay = document.getElementById('colorDisplay');
        this.coordsDisplay = document.getElementById('coordsDisplay');
        this.imagePreview = document.getElementById('imagePreview');
        this.closeModal = document.getElementById('closeModal');
        this.cancelBtn = document.getElementById('cancelBtn');
        this.saveBtn = document.getElementById('saveBtn');

        // View point modal
        this.viewPointModal = document.getElementById('viewPointModal');
        this.viewPointTitle = document.getElementById('viewPointTitle');
        this.viewPointImage = document.getElementById('viewPointImage');
        this.viewPointDescription = document.getElementById('viewPointDescription');
        this.viewPointCoords = document.getElementById('viewPointCoords');
        this.closeViewModal = document.getElementById('closeViewModal');
        this.deleteBtn = document.getElementById('deleteBtn');
        this.closeViewBtn = document.getElementById('closeViewBtn');
    }

    attachEventListeners() {
        // Map interaction
        this.mapViewport.addEventListener('mousedown', (e) => this.startDrag(e));
        this.mapViewport.addEventListener('mousemove', (e) => this.drag(e));
        this.mapViewport.addEventListener('mouseup', () => this.stopDrag());
        this.mapViewport.addEventListener('mouseleave', () => this.stopDrag());
        this.mapViewport.addEventListener('wheel', (e) => this.handleZoom(e));
        this.mapViewport.addEventListener('click', (e) => this.handleMapClick(e));

        // Controls
        this.addPointBtn.addEventListener('click', () => this.addPoint());
        this.clearAllBtn.addEventListener('click', () => this.clearAll());
        this.zoomInBtn.addEventListener('click', () => this.zoom(1.2));
        this.zoomOutBtn.addEventListener('click', () => this.zoom(0.8));
        this.resetViewBtn.addEventListener('click', () => this.resetView());

        // Point modal events
        this.closeModal.addEventListener('click', () => this.closePointModal());
        this.cancelBtn.addEventListener('click', () => this.closePointModal());
        this.saveBtn.addEventListener('click', () => this.savePoint());
        this.pointColor.addEventListener('input', (e) => {
            this.colorDisplay.textContent = e.target.value;
        });
        this.pointImage.addEventListener('change', (e) => this.handleImageUpload(e));

        // View point modal events
        this.closeViewModal.addEventListener('click', () => this.closeViewPointModal());
        this.closeViewBtn.addEventListener('click', () => this.closeViewPointModal());
        this.deleteBtn.addEventListener('click', () => this.deletePoint());

        // create tiles group for lazy tile loading (tiles under markers)
        if (this.mapSvg) {
            this.tilesGroup = this.mapSvg.querySelector('#tilesGroup');
            if (!this.tilesGroup) {
                const svgns = 'http://www.w3.org/2000/svg';
                this.tilesGroup = document.createElementNS(svgns, 'g');
                this.tilesGroup.setAttribute('id', 'tilesGroup');
                const markerRef = this.mapSvg.querySelector('#markersGroup');
                this.mapSvg.insertBefore(this.tilesGroup, markerRef);
            }
        }

        window.addEventListener('resize', () => this.updateTiles());
    }

    startDrag(e) {
        if (e.button !== 0) return;
        this.isDragging = true;
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;
        this.dragStartPanX = this.panX;
        this.dragStartPanY = this.panY;
        this.dragDistance = 0;
        this.mapCanvas.classList.add('grabbing');
    }

    drag(e) {
        if (!this.isDragging) return;
        const deltaX = e.clientX - this.dragStartX;
        const deltaY = e.clientY - this.dragStartY;
        this.dragDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        this.panX = this.dragStartPanX + deltaX;
        this.panY = this.dragStartPanY + deltaY;
        this.updateMapTransform();
    }

    stopDrag() {
        this.isDragging = false;
        this.mapCanvas.classList.remove('grabbing');
    }

    handleZoom(e) {
        e.preventDefault();
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        this.zoom(zoomFactor, e.clientX, e.clientY);
    }

    zoom(factor, cursorX, cursorY) {
        const oldZoom = this.currentZoom;
        this.currentZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.currentZoom * factor));

        if (cursorX !== undefined && cursorY !== undefined) {
            const rect = this.mapViewport.getBoundingClientRect();
            const x = cursorX - rect.left;
            const y = cursorY - rect.top;
            this.panX = x - (x - this.panX) * (this.currentZoom / oldZoom);
            this.panY = y - (y - this.panY) * (this.currentZoom / oldZoom);
        }

        this.updateMapTransform();
    }

    updateMapTransform() {
        this.mapCanvas.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.currentZoom})`;
        this.zoomLevel.textContent = Math.round(this.currentZoom * 100);
        // Update visible tiles when view changes
        try { this.updateTiles(); } catch (e) { /* ignore during early init */ }
    }

    resetView() {
        this.currentZoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.updateMapTransform();
    }

    handleMapClick(e) {
        // Ignore le clic si on vient de drag (distance > 5px)
        if (this.isDragging || (this.dragDistance && this.dragDistance > 5)) return;

        // Map screen coordinates to SVG viewBox using getScreenCTM inverse
        const svg = this.mapSvg;
        const matrix = svg.getScreenCTM();
        if (!matrix) return;
        const inv = matrix.inverse();

        const pt = svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const vbPt = pt.matrixTransform(inv);

        const x = vbPt.x;
        const y = vbPt.y;

        if (x >= 0 && x <= 8192 && y >= 0 && y <= 8192) {
            this.showAddPointModal(x, y);
        }
    }

    addPoint() {
        const x = 4096;
        const y = 4096;
        this.showAddPointModal(x, y);
    }

    showAddPointModal(x, y) {
        this.currentEditingPoint = null;
        this.modalTitle.textContent = 'Ajouter un point';
        this.pointName.value = '';
        this.pointDescription.value = '';
        this.pointColor.value = '#FF006E';
        this.colorDisplay.textContent = '#FF006E';
        this.pointImage.value = '';
        this.imagePreview.innerHTML = '';
        this.coordsDisplay.textContent = `X: ${Math.round(x)}, Y: ${Math.round(y)}`;
        this.saveBtn.textContent = 'Enregistrer';

        this.currentEditingPoint = { x, y, id: Date.now() };
        this.pointModal.classList.add('active');
        this.pointName.focus();
    }

    closePointModal() {
        this.pointModal.classList.remove('active');
        this.currentEditingPoint = null;
    }

    handleImageUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = document.createElement('img');
            img.src = event.target.result;
            this.imagePreview.innerHTML = '';
            this.imagePreview.appendChild(img);
            this.currentEditingPoint.imageData = event.target.result;
        };
        reader.readAsDataURL(file);
    }

    savePoint() {
        if (!this.pointName.value.trim()) {
            alert('Veuillez entrer un nom pour le point');
            return;
        }

        const point = {
            ...this.currentEditingPoint,
            name: this.pointName.value.trim(),
            description: this.pointDescription.value.trim(),
            color: this.pointColor.value,
            imageData: this.currentEditingPoint.imageData || null
        };

        const existingIndex = this.points.findIndex(p => p.id === point.id);
        if (existingIndex >= 0) {
            this.points[existingIndex] = point;
        } else {
            this.points.push(point);
        }

        this.saveToStorage();
        this.closePointModal();
        this.render();
    }

    deletePoint() {
        if (!this.currentViewingPoint) return;
        if (confirm(`Êtes-vous sûr de vouloir supprimer "${this.currentViewingPoint.name}" ?`)) {
            this.points = this.points.filter(p => p.id !== this.currentViewingPoint.id);
            this.saveToStorage();
            this.closeViewPointModal();
            this.render();
        }
    }

    clearAll() {
        if (confirm('Êtes-vous sûr de vouloir effacer TOUS les points ?')) {
            this.points = [];
            this.saveToStorage();
            this.render();
        }
    }

    render() {
        this.renderMarkers();
        this.renderPointsList();
        this.pointCount.textContent = this.points.length;
        try { this.updateTiles(); } catch (e) {}
    }

    renderMarkers() {
        // Render markers as SVG elements inside the SVG viewBox so they always match coordinates
        if (!this.markersGroup) return;
        while (this.markersGroup.firstChild) this.markersGroup.removeChild(this.markersGroup.firstChild);

        const svgns = 'http://www.w3.org/2000/svg';
        this.points.forEach(point => {
            const g = document.createElementNS(svgns, 'g');
            g.setAttribute('class', 'svg-marker');
            g.setAttribute('transform', `translate(${point.x}, ${point.y})`);
            g.style.cursor = 'pointer';

            const outer = document.createElementNS(svgns, 'circle');
            outer.setAttribute('r', 20);
            outer.setAttribute('fill', point.color || '#FF006E');
            outer.setAttribute('stroke', '#fff');
            outer.setAttribute('stroke-width', 6);
            outer.setAttribute('opacity', 0.95);

            const inner = document.createElementNS(svgns, 'circle');
            inner.setAttribute('r', 8);
            inner.setAttribute('fill', '#ffffff');
            inner.setAttribute('opacity', 0.95);

            g.appendChild(outer);
            g.appendChild(inner);

            // label (hidden by default, shown on hover via CSS)
            const label = document.createElementNS(svgns, 'text');
            label.setAttribute('x', 0);
            label.setAttribute('y', -30);
            label.setAttribute('text-anchor', 'middle');
            label.setAttribute('fill', 'var(--text)');
            label.setAttribute('font-size', '28');
            label.textContent = point.name || '';
            g.appendChild(label);

            g.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showViewPointModal(point);
            });

            this.markersGroup.appendChild(g);
        });
    }

    renderPointsList() {
        if (this.points.length === 0) {
            this.pointsList.innerHTML = '<p class="empty-state">Aucun point ajouté</p>';
            return;
        }

        this.pointsList.innerHTML = '';
        this.points.forEach(point => {
            const item = document.createElement('div');
            item.className = 'point-item';
            item.innerHTML = `
                <div class="point-item-name">${this.escapeHtml(point.name)}</div>
                <div class="point-item-meta">
                    X: ${Math.round(point.x)}, Y: ${Math.round(point.y)}
                </div>
            `;
            item.addEventListener('click', () => this.showViewPointModal(point));
            this.pointsList.appendChild(item);
        });
    }

    showViewPointModal(point) {
        this.currentViewingPoint = point;
        this.viewPointTitle.textContent = point.name;

        this.viewPointImage.innerHTML = point.imageData 
            ? `<img src="${point.imageData}" alt="${this.escapeHtml(point.name)}">`
            : '<p style="color: var(--text-light);">Aucune image</p>';

        this.viewPointDescription.innerHTML = point.description
            ? `<p>${this.escapeHtml(point.description)}</p>`
            : '<p style="color: var(--text-light);">Aucune description</p>';

        this.viewPointCoords.innerHTML = `
            <strong>Position:</strong> X: ${Math.round(point.x)}, Y: ${Math.round(point.y)}<br>
            <strong>Couleur:</strong> <span style="display: inline-block; width: 20px; height: 20px; background: ${point.color}; border: 1px solid white; margin-left: 5px;"></span>
        `;

        this.viewPointModal.classList.add('active');
    }

    closeViewPointModal() {
        this.viewPointModal.classList.remove('active');
        this.currentViewingPoint = null;
    }

    saveToStorage() {
        // Save points to server via API
        fetch('/api/points', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(this.points)
        }).catch(err => console.error('Error saving points:', err));
    }

    async loadPoints() {
        try {
            // Try to load from API first (server with data.json)
            const response = await fetch('/api/points');
            if (response.ok) {
                this.points = await response.json();
            } else {
                // Fallback to localStorage if API not available
                const stored = localStorage.getItem('mapPoints');
                if (stored) {
                    this.points = JSON.parse(stored);
                }
            }
        } catch (err) {
            // Fallback to localStorage if API fails
            console.log('API not available, using localStorage');
            const stored = localStorage.getItem('mapPoints');
            if (stored) {
                try {
                    this.points = JSON.parse(stored);
                } catch (e) {
                    console.error('Error loading points:', e);
                    this.points = [];
                }
            }
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // --- Tile management ---
    initTiles() {
        this.tileRows = 8;
        this.tileCols = 8;
        this.tileSize = 8192 / this.tileCols; // viewBox units per tile (1024)
        this.loadedTiles = new Map(); // key -> <image> element
    }

    updateTiles() {
        if (!this.tilesGroup) return;
        if (!this.tileCols) this.initTiles();

        // Compute visible region in SVG viewBox coordinates using screen->SVG transform
        const vpRect = this.mapViewport.getBoundingClientRect();
        const svg = this.mapSvg;
        const matrix = svg.getScreenCTM();
        if (!matrix) return;
        const inv = matrix.inverse();

        const pt = svg.createSVGPoint();
        const toSvg = (clientX, clientY) => {
            pt.x = clientX; pt.y = clientY;
            const res = pt.matrixTransform(inv);
            return { x: res.x, y: res.y };
        };

        const tl = toSvg(vpRect.left, vpRect.top);
        const tr = toSvg(vpRect.right, vpRect.top);
        const bl = toSvg(vpRect.left, vpRect.bottom);
        const br = toSvg(vpRect.right, vpRect.bottom);

        const minX = Math.max(0, Math.floor(Math.min(tl.x, tr.x, bl.x, br.x)));
        const maxX = Math.min(8192, Math.ceil(Math.max(tl.x, tr.x, bl.x, br.x)));
        const minY = Math.max(0, Math.floor(Math.min(tl.y, tr.y, bl.y, br.y)));
        const maxY = Math.min(8192, Math.ceil(Math.max(tl.y, tr.y, bl.y, br.y)));

        const padTiles = 1; // load one tile buffer around
        const startCol = Math.max(0, Math.floor(minX / this.tileSize) - padTiles);
        const endCol = Math.min(this.tileCols - 1, Math.floor((maxX) / this.tileSize) + padTiles);
        const startRow = Math.max(0, Math.floor(minY / this.tileSize) - padTiles);
        const endRow = Math.min(this.tileRows - 1, Math.floor((maxY) / this.tileSize) + padTiles);

        const needed = new Set();
        for (let r = startRow; r <= endRow; r++) {
            for (let c = startCol; c <= endCol; c++) {
                const key = `${r}_${c}`;
                needed.add(key);
                if (!this.loadedTiles.has(key)) {
                    this.loadTile(r + 1, c + 1);
                }
            }
        }

        for (const key of Array.from(this.loadedTiles.keys())) {
            if (!needed.has(key)) this.unloadTile(key);
        }
    }

    loadTile(r, c) {
        const svgns = 'http://www.w3.org/2000/svg';
        const fname = `map tiles/GTA-V-Custom-Postal-Code-Map_r${r}_c${c}.jpg`;
        const x = (c - 1) * this.tileSize;
        const y = (r - 1) * this.tileSize;

        const img = document.createElementNS(svgns, 'image');
        // Use xlink href for broad compatibility
        img.setAttributeNS('http://www.w3.org/1999/xlink', 'href', `assets/${fname}`);
        img.setAttribute('x', x);
        img.setAttribute('y', y);
        img.setAttribute('width', this.tileSize);
        img.setAttribute('height', this.tileSize);
        img.setAttribute('preserveAspectRatio', 'none');

        const key = `${r - 1}_${c - 1}`;
        this.tilesGroup.appendChild(img);
        this.loadedTiles.set(key, img);
    }

    unloadTile(key) {
        const el = this.loadedTiles.get(key);
        if (el && el.parentNode) el.parentNode.removeChild(el);
        this.loadedTiles.delete(key);
    }
}

// Initialize the map when the DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    const mapManager = new MapManager();
    await mapManager.loadPoints();
    mapManager.render();
});
