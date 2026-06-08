# Weazel Signs Map - GTA SA

Un site interactif permettant de placer des points/marqueurs sur une carte de GTA San Andreas avec la possibilité d'ajouter des images et descriptions.

## 🎮 Fonctionnalités

### Navigation de la carte
- **Zoom** : Utilisez la molette de la souris ou les boutons +/- en bas à droite
- **Déplacement** : Cliquez et glissez sur la carte pour la déplacer
- **Réinitialiser** : Bouton ↻ pour revenir à la vue par défaut

### Gestion des points
- **Ajouter un point** : 
  - Cliquez sur le bouton "+ Ajouter un point" en haut
  - Ou cliquez directement sur la carte pour placer un point
- **Visualiser les détails** : Cliquez sur un marqueur pour voir ses informations
- **Modifier** : Cliquez sur "✏️ Modifier" dans la fenêtre de détails
- **Supprimer** : Cliquez sur "🗑️ Supprimer"
- **Tout effacer** : Bouton "🗑️ Tout effacer" (demande confirmation)

### Informations par point
- **Nom** : Requis
- **Description** : Optionnel
- **Image** : Upload une image pour chaque point
- **Couleur** : Personnalisez la couleur du marqueur
- **Coordonnées** : Affichées automatiquement

### Stockage
- Tous les points sont sauvegardés **automatiquement** dans un fichier `data.json`
- Les données persistent après fermeture du navigateur et redémarrage du serveur
- Les images sont converties en base64 pour le stockage
- Fallback automatique sur localStorage si le serveur n'est pas disponible

## 📋 Structure du projet

```
weazel_signs_map/
├── index.html       # Structure HTML
├── style.css        # Styles et layout
├── script.js        # Logique JavaScript (client-side)
├── server.js        # Serveur Node.js (API)
├── package.json     # Dépendances npm
├── data.json        # Fichier de stockage des points
├── assets/
│   ├── samap.svg    # Carte de San Andreas
│   └── map tiles/   # Tuiles GTA 8x8
└── README.md        # Ce fichier
```

## 🛠️ Installation et utilisation

### Avec serveur (recommandé pour la persistence)
1. Installez Node.js si ce n'est pas déjà fait
2. Dans le dossier du projet, exécutez :
   ```bash
   npm install
   npm start
   ```
3. Ouvrez http://localhost:5500 dans votre navigateur
4. Les points seront sauvegardés dans `data.json`

### Sans serveur (localStorage uniquement)
1. Ouvrez `index.html` directement dans votre navigateur
2. Les points seront sauvegardés dans le localStorage du navigateur

## ⚙️ Optimisations

### Carte
- **Zoom progressif** : Support du zoom de 0.5x à 3x
- **Pan fluide** : Déplacement rapide et réactif
- **Marqueurs SVG** : Légers et scalables
- **Images en base64** : Intégrées directement pour portabilité

### Performance
- Utilisation de `transform` pour le zoom/pan (GPU accelerated)
- Rendu efficace des marqueurs
- Stockage local optimisé

## 🎨 Personnalisation

### Couleurs
Modifiez les variables CSS dans `style.css` :
```css
:root {
    --primary: #FF0000;      /* Rouge GTA */
    --secondary: #333;
    --accent: #FFC800;
    --bg: #1a1a1a;           /* Fond sombre */
    --text: #fff;
}
```

### Limites de zoom
Dans `script.js` :
```javascript
this.minZoom = 0.5;    // Zoom minimum
this.maxZoom = 3;      // Zoom maximum
```

## 🐛 Dépannage

### Les marqueurs ne s'affichent pas
- Vérifiez que le navigateur permet le stockage local
- Vérifiez la console du navigateur pour les erreurs

### L'image de la map ne s'affiche pas
- Assurez-vous que `assets/samap.svg` est au bon emplacement
- Vérifiez le chemin dans l'attribut `href` de l'SVG

### Les données ne sont pas sauvegardées
- Le stockage local peut être limité à 5-10MB par domaine
- Essayez de vider le cache du navigateur
- Essayez un autre navigateur

## 📱 Responsive

Le site s'adapte à différentes tailles d'écran :
- **Desktop** : Affichage complet avec sidebar
- **Tablet** : Sidebar réduite
- **Mobile** : Layout vertical avec sidebar collapsible

## 🔧 Développement

Pour modifier le code :
1. Éditer les fichiers HTML/CSS/JS
2. Rafraîchir la page dans le navigateur
3. Les modifications sont immédiatement visibles

### Ajouter de nouvelles fonctionnalités

Exemples d'extensions possibles :
- Export/Import de points (JSON)
- Catégories/filtrage de points
- Mesure de distances entre points
- Système de routes/trajets
- Intégration avec des bases de données

## 📄 Licence

Libre d'utilisation et de modification.

## 🎯 Améliorations futures

- [ ] Export des points en JSON
- [ ] Import depuis JSON
- [ ] Catégories de points
- [ ] Recherche/filtrage
- [ ] Mesure de distances
- [ ] Partage de liens personnalisés
- [ ] Multi-utilisateurs en temps réel

---

**Version 1.0** - Juin 2026
