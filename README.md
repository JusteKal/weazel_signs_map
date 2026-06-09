# Weazel Signs Map

Outil de visualisation interactive des panneaux publicitaires Weazel News sur la carte de GTA San Andreas. Développé pour usage interne — les points sont gérés manuellement via `data.json`.

## Aperçu

- Carte tuilée 8×8 haute résolution avec zoom et pan fluides
- Marqueurs adaptatifs (taille inversement proportionnelle au zoom)
- Filtrage par type de panneau : Grand, Medium, Petit, Mur
- Tracker de coordonnées en temps réel avec verrouillage au clic droit
- Thème visuel aligné sur le site MindCity RP

## Structure du projet

```
weazel_signs_map/
├── index.html
├── script.js
├── style.css
├── data.json          ← points à éditer manuellement
└── assets/
    ├── signsmapico.svg
    └── map tiles/     ← 64 tuiles JPG (r1-r8 × c1-c8)
```

## Lancer le projet

Aucune dépendance, aucun build. Il faut juste un serveur HTTP statique pour que `data.json` soit accessible via `fetch`.

**Avec VS Code — Live Server** (recommandé) :
1. Installe l'extension [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)
2. Clic droit sur `index.html` → *Open with Live Server*

**Avec Node.js** :
```bash
npx serve .
```

**Avec Python** :
```bash
python -m http.server 5500
```

Ouvre ensuite `http://localhost:5500` dans ton navigateur.

> ⚠️ Ouvrir `index.html` en double-cliquant (`file://`) ne fonctionnera pas — le navigateur bloque les `fetch` locaux.

## Ajouter un point

1. Navigue sur la carte jusqu'à l'emplacement voulu
2. **Clic droit** pour verrouiller les coordonnées affichées en bas à gauche
3. Clique sur **Copier JSON** — un bloc prêt à l'emploi est copié dans le presse-papier
4. Colle-le dans le tableau `points` de `data.json` et change le `name`

Format d'un point :

```json
{
  "x": 3716,
  "y": 6244,
  "id": 1780963271948,
  "name": "Petit Panneau Exemple",
  "description": "Description optionnelle",
  "color": "#ff006e",
  "imageData": null
}
```

## Convention de nommage

Le filtre par type se base sur le nom du point :

| Préfixe dans le nom | Filtre |
|---|---|
| `Grand` | Grand |
| `medium` | Medium |
| `Petit` | Petit |
| `mur` | Mur |

Exemple : `"Petit Panneau Parking Central"` → apparaît sous le filtre **Petit**.

## Navigation

| Action | Contrôle |
|---|---|
| Déplacer la carte | Clic gauche + glisser |
| Zoom | Molette |
| Verrouiller les coordonnées | Clic droit |
| Filtrer par type | Boutons dans le header |