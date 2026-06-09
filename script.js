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
        this.currentViewingPoint = null;

        this.initElements();
        this.attachEventListeners();
    }

    initElements() {
        this.mapViewport = document.getElementById('mapViewport');
        this.mapCanvas = document.getElementById('mapCanvas');
        this.mapSvg = document.getElementById('mapSvg');
        this.markersGroup = document.getElementById('markersGroup');
        this.tilesGroup = null;

        this.pointsList = document.getElementById('pointsList');
        this.pointCount = document.getElementById('pointCount');
        this.zoomLevel = document.getElementById('zoomLevel');

        this.zoomInBtn = document.getElementById('zoomInBtn');
        this.zoomOutBtn = document.getElementById('zoomOutBtn');
        this.resetViewBtn = document.getElementById('resetViewBtn');

        // View point modal
        this.viewPointModal = document.getElementById('viewPointModal');
        this.viewPointTitle = document.getElementById('viewPointTitle');
        this.viewPointImage = document.getElementById('viewPointImage');
        this.viewPointDescription = document.getElementById('viewPointDescription');
        this.viewPointCoords = document.getElementById('viewPointCoords');
        this.closeViewModal = document.getElementById('closeViewModal');
        this.closeViewBtn = document.getElementById('closeViewBtn');
    }

    attachEventListeners() {
        // Map interaction
        this.mapViewport.addEventListener('mousedown', (e) => this.startDrag(e));
        this.mapViewport.addEventListener('mousemove', (e) => this.drag(e));
        this.mapViewport.addEventListener('mouseup', () => this.stopDrag());
        this.mapViewport.addEventListener('mouseleave', () => this.stopDrag());
        this.mapViewport.addEventListener('wheel', (e) => this.handleZoom(e));

        // Controls
        this.zoomInBtn.addEventListener('click', () => this.zoom(1.2));
        this.zoomOutBtn.addEventListener('click', () => this.zoom(0.8));
        this.resetViewBtn.addEventListener('click', () => this.resetView());

        // View point modal
        this.closeViewModal.addEventListener('click', () => this.closeViewPointModal());
        this.closeViewBtn.addEventListener('click', () => this.closeViewPointModal());

        // Tiles group
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
        try { this.updateTiles(); } catch (e) {}
    }

    resetView() {
        this.currentZoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.updateMapTransform();
    }

    render() {
        this.renderMarkers();
        this.renderPointsList();
        this.pointCount.textContent = this.points.length;
        try { this.updateTiles(); } catch (e) {}
    }

    renderMarkers() {
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
            this.pointsList.innerHTML = '<p class="empty-state">Aucun point disponible</p>';
            return;
        }

        this.pointsList.innerHTML = '';
        this.points.forEach(point => {
            const item = document.createElement('div');
            item.className = 'point-item';
            item.innerHTML = `
                <div class="point-item-name">${this.escapeHtml(point.name)}</div>
                <div class="point-item-meta">X: ${Math.round(point.x)}, Y: ${Math.round(point.y)}</div>
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
            <strong>Couleur:</strong> <span style="display:inline-block;width:20px;height:20px;background:${point.color};border:1px solid white;margin-left:5px;vertical-align:middle;"></span>
        `;

        this.viewPointModal.classList.add('active');
    }

    closeViewPointModal() {
        this.viewPointModal.classList.remove('active');
        this.currentViewingPoint = null;
    }

    async loadPoints() {
        // 1. API serveur
        try {
            const response = await fetch('/api/points');
            if (response.ok) {
                this.points = await response.json();
                console.log('Points chargés depuis le serveur');
                return;
            }
        } catch (e) {
            console.log('Serveur non disponible, tentative data.json statique...');
        }

        // 2. data.json statique
        try {
            const response = await fetch('./data.json');
            if (response.ok) {
                const data = await response.json();
                this.points = data.points || [];
                console.log('Points chargés depuis data.json statique');
                return;
            }
        } catch (e) {
            console.log('data.json non disponible, tentative localStorage...');
        }

        // 3. localStorage
        try {
            const stored = localStorage.getItem('mapPoints');
            if (stored) {
                this.points = JSON.parse(stored);
                console.log('Points chargés depuis localStorage');
            }
        } catch (e) {
            console.error('Erreur chargement localStorage:', e);
            this.points = [];
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
        this.tileSize = 8192 / this.tileCols;
        this.loadedTiles = new Map();
    }

    updateTiles() {
        if (!this.tilesGroup) return;
        if (!this.tileCols) this.initTiles();

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

        const padTiles = 1;
        const startCol = Math.max(0, Math.floor(minX / this.tileSize) - padTiles);
        const endCol = Math.min(this.tileCols - 1, Math.floor(maxX / this.tileSize) + padTiles);
        const startRow = Math.max(0, Math.floor(minY / this.tileSize) - padTiles);
        const endRow = Math.min(this.tileRows - 1, Math.floor(maxY / this.tileSize) + padTiles);

        const needed = new Set();
        for (let r = startRow; r <= endRow; r++) {
            for (let c = startCol; c <= endCol; c++) {
                const key = `${r}_${c}`;
                needed.add(key);
                if (!this.loadedTiles.has(key)) this.loadTile(r + 1, c + 1);
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

document.addEventListener('DOMContentLoaded', async () => {
    const mapManager = new MapManager();
    await mapManager.loadPoints();
    mapManager.render();
});