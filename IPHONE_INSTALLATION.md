# iPhone Installation - Bruch-Kassensystem

## So installierst du die App auf dem iPhone (ohne v0):

### Methode 1: Als PWA auf dem iPhone installieren

1. **Öffne die App-URL in Safari**
   - Wichtig: Nur Safari unterstützt PWA-Installation auf iOS
   - Chrome/Firefox funktionieren NICHT für die Installation

2. **Tippe auf den Teilen-Button** 
   - Der Button unten in der Mitte (Viereck mit Pfeil nach oben)

3. **Scrolle nach unten und wähle "Zum Home-Bildschirm"**

4. **Gib einen Namen ein** (z.B. "Bruch-Kasse") und tippe auf "Hinzufügen"

5. **Fertig!** 
   - Die App erscheint jetzt als Icon auf deinem Home-Bildschirm
   - Sie läuft jetzt komplett offline
   - Funktioniert auch im Flugmodus

### Methode 2: GitHub Download & Hosting

Falls du die App selbst hosten möchtest:

1. **Lade den Code herunter**
   - Klicke in v0 auf die drei Punkte → "Download ZIP"
   - Oder: Veröffentliche zu GitHub (Button in v0)

2. **Hoste die App kostenlos**
   - Bei Vercel: `npx vercel --prod`
   - Bei Netlify: Drag & Drop das build-Verzeichnis
   - Bei GitHub Pages: Aktiviere GitHub Pages in den Repo-Settings

3. **Eigene Domain (optional)**
   - Vercel/Netlify erlauben eigene Domains
   - z.B. `bruch-kasse.deine-firma.de`

### Wichtig für Offline-Nutzung:

- **Einmal online öffnen**: Die App muss einmal mit Internet geöffnet werden, damit der Service Worker installiert wird
- **Danach komplett offline**: Alle Funktionen laufen offline (Scannen, Verkaufen, etc.)
- **Flugmodus funktioniert**: Nach der ersten Installation läuft alles auch im Flugmodus

### Troubleshooting:

**"App startet nicht ohne Internet"**
- Stelle sicher, dass du die App mindestens einmal MIT Internet geöffnet hast
- Safari Cache leeren und App neu zum Home-Bildschirm hinzufügen
- Prüfe ob der Service Worker registriert ist (in Safari Entwicklertools)

**"Kamera funktioniert nicht"**
- Erlaube Kamera-Zugriff in iOS Einstellungen → Safari → Kamera
- Bei PWA: Einstellungen → Safari → Website-Einstellungen

**"Daten gehen verloren"**
- Nutze regelmäßig die Backup-Funktion
- Aktiviere Auto-Backup (alle 10 Minuten)
- Exportiere wichtige Daten als JSON/CSV

## Support

Bei Problemen: 
- Prüfe die Browser-Konsole (Safari → Entwickler → Konsole)
- Stelle sicher, dass du die neueste Safari-Version hast
- Teste erst im Browser, dann als installierte PWA
