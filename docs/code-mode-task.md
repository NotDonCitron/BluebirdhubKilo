# Task für Code Mode: File Upload System Vervollständigung

## Kontext
Du arbeitest am AbacusHub Projekt - einer Next.js 14 Produktivitäts-App. Das chunked File Upload System ist bereits implementiert, benötigt aber noch die API-basierte File Serving Funktionalität und Error Recovery Verbesserungen.

## Hauptaufgabe
Implementiere das API-basierte File Serving System mit Authentifizierung und verbessere die Error Recovery des bestehenden Upload Systems.

## Zu implementierende Features

### 1. File Serving API Route
**Datei**: `app/api/files/[id]/route.ts`

Implementiere eine GET Route die:
- Session authentifiziert
- File-Berechtigungen prüft (Workspace-Zugehörigkeit)
- Dateien vom Dateisystem streamt
- Korrekte Headers setzt (Content-Type, Content-Disposition)
- Range Requests unterstützt für Video-Streaming

### 2. Storage Interface Abstraction
**Datei**: `app/lib/storage/index.ts`

Erstelle ein Storage Interface:
```typescript
interface StorageProvider {
  saveChunk(fileId: string, chunkIndex: number, data: Buffer): Promise<void>;
  assembleChunks(fileId: string, totalChunks: number): Promise<string>;
  getFile(path: string): Promise<Buffer>;
  getFileStream(path: string): Promise<ReadableStream>;
  deleteFile(path: string): Promise<void>;
  fileExists(path: string): Promise<boolean>;
}
```

Implementiere zunächst nur den LocalFileSystemProvider.

### 3. Upload Hook Verbesserungen
**Datei**: `app/hooks/use-file-upload.ts`

Erweitere den bestehenden Hook um:
- Exponential Backoff bei Fehlern
- Network Status Monitoring
- Progress Speicherung in localStorage
- Automatische Resume-Erkennung beim Seiten-Reload

### 4. Next.js Konfiguration
**Datei**: `app/next.config.js`

Füge Rewrite Rules hinzu:
```javascript
async rewrites() {
  return [
    {
      source: '/uploads/:path*',
      destination: '/api/files/serve/:path*',
    },
  ];
}
```

### 5. Error Handling Verbesserungen
In `app/api/upload/route.ts`:
- Transactional Chunk Processing
- Bessere Error Messages
- Cleanup bei fehlgeschlagenen Uploads
- Correlation IDs für Debugging

## Technische Anforderungen

### Sicherheit
- Path Traversal Schutz (keine ".." in Pfaden)
- Nur authentifizierte Zugriffe
- Workspace-basierte Berechtigungen
- MIME-Type Validierung

### Performance
- Streaming für große Dateien
- Keine kompletten Files in Memory laden
- Chunk-Size basierend auf Netzwerk anpassen
- Browser-Cache Headers setzen

### Error Handling
- Klare Error Messages
- Retry-fähige vs. permanente Fehler unterscheiden
- Cleanup von temporären Dateien
- User-freundliche Fehlermeldungen

## Test-Szenarien

1. **Upload einer 100MB Datei**
   - Sollte in Chunks aufgeteilt werden
   - Progress korrekt anzeigen
   - Bei Unterbrechung fortsetzen können

2. **File Access ohne Berechtigung**
   - 401/403 Error zurückgeben
   - Keine Datei-Inhalte leaken

3. **Parallele Uploads**
   - 3 Dateien gleichzeitig
   - Kein Deadlock
   - Korrekte Progress Updates

## Reihenfolge der Implementierung

1. **Zuerst**: File Serving API (kritisch für Test)
2. **Dann**: Storage Interface (Vorbereitung für S3)
3. **Danach**: Upload Hook Verbesserungen
4. **Zuletzt**: Error Handling Optimierungen

## Wichtige Dateien zum Reviewen

- `app/api/upload/route.ts` - Bestehende Upload Logik
- `app/hooks/use-file-upload.ts` - Client-Side Upload Hook
- `app/components/ui/file-upload.tsx` - Upload UI Component
- `prisma/schema.prisma` - File Model Definition

## Konfiguration

Neue Environment Variables in `.env.local`:
```
MAX_FILE_SIZE=524288000  # 500MB
MAX_CHUNK_SIZE=5242880   # 5MB
MIN_CHUNK_SIZE=1048576   # 1MB
```

## Erwartete Deliverables

1. Funktionierende File Serving API mit Auth
2. Storage Interface für zukünftige S3 Migration
3. Verbesserter Upload Hook mit Resume
4. Tests für kritische Pfade
5. Aktualisierte Dokumentation

## Hinweise

- Die Upload-Test-Seite läuft auf http://localhost:3000/test-upload
- Der Dev Server läuft bereits
- Nutze die bestehenden Patterns aus dem Projekt
- Achte auf TypeScript Strict Mode

Beginne mit der File Serving API, da diese für das Testen der Uploads kritisch ist!