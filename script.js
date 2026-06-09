class MapManager {
    constructor() {
        this.points = [];
        this.currentFilter = 'all';
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

        // Smooth zoom
        this._targetZoom = 1.0;
        this._targetPanX = 0;
        this._targetPanY = 0;
        this._zoomAnimFrame = null;

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

        // View point modal
        this.viewPointModal = document.getElementById('viewPointModal');
        this.viewPointTitle = document.getElementById('viewPointTitle');
        this.viewPointImage = document.getElementById('viewPointImage');
        this.viewPointDescription = document.getElementById('viewPointDescription');
        this.viewPointCoords = document.getElementById('viewPointCoords');
        this.closeViewModal = document.getElementById('closeViewModal');
        this.closeViewBtn = document.getElementById('closeViewBtn');

        // Coord tracker
        this.cursorX = document.getElementById('cursorX');
        this.cursorY = document.getElementById('cursorY');
        this.copyCoordBtn = document.getElementById('copyCoordBtn');
        this.coordStatus = document.getElementById('coordStatus');
        this._lastSvgX = 0;
        this._lastSvgY = 0;
        this._coordLocked = false;
    }

    attachEventListeners() {
        // Map interaction
        this.mapViewport.addEventListener('mousedown', (e) => this.startDrag(e));
        this.mapViewport.addEventListener('mousemove', (e) => this.drag(e));
        this.mapViewport.addEventListener('mouseup', () => this.stopDrag());
        this.mapViewport.addEventListener('mouseleave', () => this.stopDrag());
        this.mapViewport.addEventListener('wheel', (e) => this.handleZoom(e), { passive: false });

        // View point modal
        this.closeViewModal.addEventListener('click', () => this.closeViewPointModal());
        this.closeViewBtn.addEventListener('click', () => this.closeViewPointModal());

        // Coord tracker — mousemove sur la map
        this.mapViewport.addEventListener('mousemove', (e) => this.trackCoords(e));

        // Clic droit = verrouiller / déverrouiller les coordonnées
        this.mapViewport.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this._coordLocked = !this._coordLocked;
            if (this.coordStatus) {
                this.coordStatus.textContent = this._coordLocked ? '🔒 verrouillé' : 'libre';
                this.coordStatus.classList.toggle('locked', this._coordLocked);
            }
        });

        this.copyCoordBtn.addEventListener('click', () => {
            const json = JSON.stringify({
                x: Math.round(this._lastSvgX),
                y: Math.round(this._lastSvgY),
                id: Date.now(),
                name: "Nouveau point",
                description: "",
                color: "#ff006e",
                imageData: null
            }, null, 2);
            navigator.clipboard.writeText(json).then(() => {
                this.copyCoordBtn.textContent = '✅ Copié !';
                this.copyCoordBtn.classList.add('copied');
                setTimeout(() => {
                    this.copyCoordBtn.textContent = '📋 Copier JSON';
                    this.copyCoordBtn.classList.remove('copied');
                }, 1800);
            });
        });

        // Filter buttons
        document.querySelectorAll('.btn-filter').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentFilter = btn.dataset.filter;
                this.render();
            });
        });

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
        // Sync targets pour éviter un saut au prochain zoom
        this._targetPanX = this.panX;
        this._targetPanY = this.panY;
        this.updateMapTransform();
    }

    stopDrag() {
        this.isDragging = false;
        this.mapCanvas.classList.remove('grabbing');
    }

    handleZoom(e) {
        e.preventDefault();

        const rect = this.mapViewport.getBoundingClientRect();
        const cursorX = e.clientX - rect.left;
        const cursorY = e.clientY - rect.top;

        // Accumule le zoom cible
        const factor = e.deltaY > 0 ? 0.92 : 1.08;
        const newTarget = Math.max(this.minZoom, Math.min(this.maxZoom, this._targetZoom * factor));

        // Ajuste le pan cible pour que le curseur reste fixe
        this._targetPanX = cursorX - (cursorX - this._targetPanX) * (newTarget / this._targetZoom);
        this._targetPanY = cursorY - (cursorY - this._targetPanY) * (newTarget / this._targetZoom);
        this._targetZoom = newTarget;

        // Lance l'animation si pas déjà en cours
        if (!this._zoomAnimFrame) {
            this._animateSmoothZoom();
        }
    }

    _animateSmoothZoom() {
        const lerp = (a, b, t) => a + (b - a) * t;
        const speed = 0.14;

        this.currentZoom = lerp(this.currentZoom, this._targetZoom, speed);
        this.panX = lerp(this.panX, this._targetPanX, speed);
        this.panY = lerp(this.panY, this._targetPanY, speed);

        this.updateMapTransform();

        const done =
            Math.abs(this.currentZoom - this._targetZoom) < 0.0005 &&
            Math.abs(this.panX - this._targetPanX) < 0.2 &&
            Math.abs(this.panY - this._targetPanY) < 0.2;

        if (done) {
            this.currentZoom = this._targetZoom;
            this.panX = this._targetPanX;
            this.panY = this._targetPanY;
            this.updateMapTransform();
            this._zoomAnimFrame = null;
        } else {
            this._zoomAnimFrame = requestAnimationFrame(() => this._animateSmoothZoom());
        }
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
        this._targetZoom = 1;
        this._targetPanX = 0;
        this._targetPanY = 0;
        this.updateMapTransform();
    }

    trackCoords(e) {
        if (this._coordLocked) return;
        const svg = this.mapSvg;
        const matrix = svg.getScreenCTM();
        if (!matrix) return;
        const inv = matrix.inverse();
        const pt = svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const svgPt = pt.matrixTransform(inv);
        const x = Math.round(svgPt.x);
        const y = Math.round(svgPt.y);
        this._lastSvgX = x;
        this._lastSvgY = y;
        if (this.cursorX) this.cursorX.textContent = x;
        if (this.cursorY) this.cursorY.textContent = y;
    }

    getPointType(point) {
        const name = (point.name || '').toLowerCase();
        if (name.includes('grand')) return 'grand';
        if (name.includes('medium')) return 'medium';
        if (name.includes('petit')) return 'petit';
        if (name.includes('mur')) return 'mur';
        return 'autre';
    }

    getFilteredPoints() {
        if (this.currentFilter === 'all') return this.points;
        return this.points.filter(p => this.getPointType(p) === this.currentFilter);
    }

    render() {
        this.renderMarkers();
        this.renderPointsList();
        const filtered = this.getFilteredPoints();
        this.pointCount.textContent = filtered.length;
        try { this.updateTiles(); } catch (e) {}
    }

    renderMarkers() {
        if (!this.markersGroup) return;
        while (this.markersGroup.firstChild) this.markersGroup.removeChild(this.markersGroup.firstChild);

        const baseRadius = Math.max(14, Math.min(40, 22 / this.currentZoom));
        const innerRadius = baseRadius * 0.4;
        const strokeWidth = baseRadius * 0.28;
        const fontSize = baseRadius * 1.4;
        const labelY = -(baseRadius + 10);

        const svgns = 'http://www.w3.org/2000/svg';
        this.getFilteredPoints().forEach(point => {
            const g = document.createElementNS(svgns, 'g');
            g.setAttribute('class', 'svg-marker');
            g.setAttribute('transform', `translate(${point.x}, ${point.y})`);
            g.style.cursor = 'pointer';

            const outer = document.createElementNS(svgns, 'circle');
            outer.setAttribute('r', baseRadius);
            outer.setAttribute('fill', point.color || '#FF006E');
            outer.setAttribute('stroke', '#fff');
            outer.setAttribute('stroke-width', strokeWidth);
            outer.setAttribute('opacity', 0.95);

            const inner = document.createElementNS(svgns, 'circle');
            inner.setAttribute('r', innerRadius);
            inner.setAttribute('fill', '#ffffff');
            inner.setAttribute('opacity', 0.95);

            g.appendChild(outer);
            g.appendChild(inner);

            // Label background pill
            const labelText = point.name || '';
            const charWidth = fontSize * 0.6;
            const pillW = labelText.length * charWidth + fontSize;
            const pillH = fontSize * 1.4;

            const labelBg = document.createElementNS(svgns, 'rect');
            labelBg.setAttribute('class', 'label-bg');
            labelBg.setAttribute('x', -(pillW / 2));
            labelBg.setAttribute('y', labelY - pillH * 0.75);
            labelBg.setAttribute('width', pillW);
            labelBg.setAttribute('height', pillH);
            labelBg.setAttribute('rx', pillH / 2);
            labelBg.setAttribute('ry', pillH / 2);

            const label = document.createElementNS(svgns, 'text');
            label.setAttribute('x', 0);
            label.setAttribute('y', labelY);
            label.setAttribute('text-anchor', 'middle');
            label.setAttribute('font-size', fontSize);
            label.textContent = labelText;

            g.appendChild(labelBg);
            g.appendChild(label);

            g.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showViewPointModal(point);
            });

            this.markersGroup.appendChild(g);
        });
    }

    renderPointsList() {
        const filtered = this.getFilteredPoints();
        if (filtered.length === 0) {
            this.pointsList.innerHTML = '<p class="empty-state">Aucun point disponible</p>';
            return;
        }

        this.pointsList.innerHTML = '';
        filtered.forEach(point => {
            const item = document.createElement('div');
            item.className = 'point-item';
            item.innerHTML = `
                <div class="point-item-name">${this.escapeHtml(point.name)}</div>
                <div class="point-item-meta">X: ${Math.round(point.x)}, Y: ${Math.round(point.y)}</div>
            `;
            item.addEventListener('click', () => {
                this.centerOnPoint(point);
                this.showViewPointModal(point);
            });
            this.pointsList.appendChild(item);
        });
    }

    centerOnPoint(point) {
        const vpRect = this.mapViewport.getBoundingClientRect();
        const vpCenterX = vpRect.width / 2;
        const vpCenterY = vpRect.height / 2;

        this.panX = vpCenterX - point.x * this.currentZoom;
        this.panY = vpCenterY - point.y * this.currentZoom;
        this._targetPanX = this.panX;
        this._targetPanY = this.panY;
        this.updateMapTransform();
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
        const x = Math.floor((c - 1) * this.tileSize);
        const y = Math.floor((r - 1) * this.tileSize);
        const w = Math.ceil(this.tileSize) + 1;
        const h = Math.ceil(this.tileSize) + 1;

        const img = document.createElementNS(svgns, 'image');
        img.setAttributeNS('http://www.w3.org/1999/xlink', 'href', `assets/${fname}`);
        img.setAttribute('x', x);
        img.setAttribute('y', y);
        img.setAttribute('width', w);
        img.setAttribute('height', h);
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