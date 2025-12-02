# Plexer-Reborn V2

Modern Vue 3 Plex Client mit Electron-Support

## Features

- 🎬 **Medien-Suche**: Durchsuche deine Plex-Bibliothek mit Autocomplete, Filtern und Sortierung
- 📺 **Video-Player**: Integrierter Player mit AC-3 Audio-Transcoding für Browser-Kompatibilität
- 💾 **Downloads**: Direkter Download oder Integration mit JDownloader
- 🎵 **M3U-Playlists**: Erstelle Playlists für Filme, Staffeln oder ausgewählte Episoden
- 🎥 **VLC-Integration**: Öffne Medien direkt in VLC
- 👁️ **Watched-Status**: Markiere Filme und Episoden als gesehen
- 🔖 **Bookmarks**: Speichere deine Lieblingsmedien
- 🌙 **Netflix-ähnliches Design**: Modernes, dunkles UI mit Sidebar-Navigation
- 💻 **Electron-Support**: Desktop-App für Windows, macOS und Linux

## Tech Stack

- **Frontend**: Vue 3 (Composition API), Vite, TailwindCSS
- **State Management**: Pinia
- **Routing**: Vue Router
- **Video**: Plyr, HLS.js
- **Desktop**: Electron
- **Audio**: ffmpeg-static (für AC-3 Support in Electron)

## Installation

### Web-Version

```bash
npm install
npm run dev
```

Die App läuft auf `http://localhost:3000`

### Electron-Version

```bash
npm install
npm run electron:dev
```

### Production Build

**Web:**
```bash
npm run build
```

**Electron:**
```bash
npm run electron:build
```

## Verwendung

1. **Login**: Melde dich mit deinen Plex-Anmeldedaten an
2. **Server auswählen**: Wähle einen Plex-Server aus
3. **Suchen**: Suche nach Filmen und Serien
4. **Abspielen**: Klicke auf einen Film oder eine Episode zum Abspielen
5. **Aktionen**: Nutze Download, VLC, M3U-Erstellung und mehr

## Konfiguration

### Plex-Server

Die App verbindet sich mit deinem Plex-Server über die Plex.tv API. Du benötigst:
- Plex-Account (Benutzername & Passwort)
- Zugriff auf mindestens einen Plex-Server

### Audio-Transcoding

**Browser**: AC-3 Audio wird automatisch zu AAC transkodiert (Server-seitig)

**Electron**: Native AC-3 Unterstützung via ffmpeg-static

## Projektstruktur

```
v2/
├── electron/           # Electron Main & Preload
├── src/
│   ├── components/     # Vue-Komponenten
│   ├── composables/    # Vue Composables
│   ├── services/       # API-Services
│   ├── stores/         # Pinia Stores
│   ├── utils/          # Utilities
│   ├── router/         # Vue Router
│   └── styles/         # CSS/TailwindCSS
├── public/             # Statische Assets
└── index.html          # HTML Template
```

## Entwicklung

### Dev-Server starten

```bash
npm run dev
```

### Electron-Dev starten

```bash
npm run electron:dev
```

### Build erstellen

```bash
npm run build              # Web
npm run electron:build     # Electron
```

## Lizenz

MIT

## Credits

Basierend auf [Plexer-Reborn](https://github.com/BotAwesome/Plexer-Reborn) V1

