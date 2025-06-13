# Projektanalyse: Plexer-Reborn

Diese Analyse dokumentiert die Struktur und die Kernfunktionalitäten des Plexer-Reborn-Projekts, mit einem besonderen Fokus auf die Benutzerinteraktionen bei der Auswahl von Filmen und Serien.

## Projektstruktur

Das Projekt besteht aus einer einfachen, aber effektiven Struktur, die auf Standard-Webtechnologien basiert:

-   `index.html`: Die Hauptseite, die die grundlegende Struktur der Benutzeroberfläche definiert, einschließlich der Sidebar, des Hauptinhaltsbereichs und der verschiedenen Popup-Container.
-   `style.css`: Enthält alle Stile für das Layout, die Medienkarten, Popups und Icons, um ein konsistentes Erscheinungsbild zu gewährleisten.
-   `script.js`: Das Herzstück des Projekts. Dieses umfangreiche Skript (über 1500 Zeilen) verwaltet die gesamte Anwendungslogik, einschließlich:
    -   Kommunikation mit der Plex-API.
    -   Verarbeitung von Suchanfragen.
    -   Dynamische Erstellung von Suchergebnissen (Medienkarten).
    -   Generierung von interaktiven Popups (Modals) für Filme und Serien.
-   `icons/`: Ein Verzeichnis, das alle SVG-Icons enthält, die in den Aktionsleisten verwendet werden (z. B. Download, Link kopieren, JDownloader).

## Analyse der Icon-Leisten in Modals

Die von dir angesprochenen Icon-Leisten sind ein zentrales Interaktionselement. Ihre Implementierung unterscheidet sich je nachdem, ob es sich um einen Film oder eine Serie handelt.

### 1. Filme

Der Prozess für Filme ist direkt und benutzerfreundlich:

1.  **Auswahl:** Der Benutzer klickt auf den "Download"-Button einer Film-Medienkarte in den Suchergebnissen.
2.  **Funktionsaufruf:** Dies löst die JavaScript-Funktion `downloadMovie()` aus.
3.  **Modal-Erstellung:** Die Funktion ruft die notwendigen URLs vom Server ab und generiert dynamisch ein Popup-Modal. Der Inhalt dieses Modals enthält ein `div` mit der Klasse `.movie_popup_actions`.
4.  **Icon-Leiste:** Dieses `div` fungiert als Container für die Icon-Leiste und beinhaltet folgende Aktionen:
    -   **Direkter Download:** Startet den direkten Download des Films. (`directDownloadMovie()`, Icon: `download.svg`)
    -   **An JDownloader senden:** Übergibt den Link an JDownloader. (Icon: `jdownloader.svg`)
    -   **Inline abspielen:** Öffnet einen Videoplayer direkt in der App. (`playMovieInline()`, Icon: `tv.svg`)
    -   **Link kopieren:** Kopiert den Download-Link in die Zwischenablage. Dies wird von der Funktion `copyMovieLink()` gehandhabt. (Icon: `link.svg`)
    -   **M3U erstellen:** Erstellt eine `.m3u`-Playlist-Datei für den Film. (`createMovieM3U()`, Icon: `playlist.svg`)

### 2. Serien

Der Prozess für Serien ist mehrstufig, um die hierarchische Struktur (Serie -> Staffel -> Episode) abzubilden:

1.  **Auswahl (Serie):** Der Benutzer klickt auf den "Download"-Button einer Serien-Medienkarte.
2.  **Funktionsaufruf (Serie):** Dies löst die Funktion `downloadShow()` aus.
3.  **Staffel-Modal:** Diese Funktion generiert ein erstes Modal, das eine Liste aller verfügbaren *Staffeln* der Serie anzeigt. Jede Staffel hat bereits Aktionen für die gesamte Staffel (z.B. "An JDownloader senden").
4.  **Auswahl (Staffel):** Der Benutzer klickt auf den Titel einer Staffel in der Liste.
5.  **Funktionsaufruf (Staffel):** Dies löst die Funktion `downloadSeason()` aus.
6.  **Episoden-Modal:** Diese Funktion ersetzt das Staffel-Modal durch ein neues Modal. Dieses zeigt eine detaillierte Tabelle aller *Episoden* der ausgewählten Staffel.
7.  **Icon-Leiste (pro Episode):** Jede Zeile in der Episodentabelle hat ihre eigene Icon-Leiste in der "Aktionen"-Spalte. Diese Leiste bietet folgende Optionen für die jeweilige Episode:
    -   **Inline abspielen:** Spielt die einzelne Episode ab. (`playEpisodeInline()`, Icon: `tv.svg`)
    -   **Direkter Download:** Lädt die einzelne Episode herunter. (`directDownloadEpisode()`, Icon: `download.svg`)
    -   **An JDownloader senden:** Sendet die einzelne Episode an JDownloader. (`sendSingleEpisodeToJDownloader()`, Icon: `jdownloader.svg`)
    -   **Link kopieren:** Kopiert den Download-Link der einzelnen Episode in die Zwischenablage. Dies wird von der Funktion `copyEpisodeLink()` gehandhabt. (Icon: `link.svg`)

## Zusammenfassung

Die "Link kopieren"-Funktion ist für beide Medientypen vorhanden, aber an unterschiedlichen Stellen im Benutzerfluss implementiert:
-   **Bei Filmen:** Direkt im ersten Modal, das nach dem Klick auf den Film erscheint.
-   **Bei Serien:** Erst im zweiten Modal, auf der Ebene der einzelnen Episoden.

Diese Implementierung ist logisch und spiegelt die unterschiedliche Natur der Medien wider. Während ein Film eine einzelne Einheit ist, erfordert eine Serie eine genauere Auswahl durch den Benutzer. 