# 🔧 OpenAPI Integration - Whisper API

Cette API est maintenant entièrement documentée avec OpenAPI 3.0 et prête pour une utilisation par des systèmes d'IA.

## 🚀 Accès à la Documentation

### Interface Interactive (Swagger UI)
```
http://localhost:3000/api/docs
```
Interface web complète avec possibilité de tester directement les endpoints.

### Spécification OpenAPI
```
JSON: http://localhost:3000/api/openapi.json
YAML: http://localhost:3000/api/openapi.yaml
```

## 🤖 Utilisation par les IA

### Workflow Typique pour IA

1. **Vérification du système**
   ```
   GET /api/status
   ```

2. **Traitement audio**
   ```
   POST /api/process
   Content-Type: multipart/form-data
   - audio: [fichier]
   - outputFormat: json
   - diarize: true
   - hfToken: [token_hugging_face]
   ```

3. **Suivi du traitement**
   ```
   GET /api/jobs/{jobId}
   ```

4. **Récupération du résultat**
   ```
   GET /api/jobs/{jobId}/result
   ```

### Génération Automatique de Clients

La spécification OpenAPI permet la génération automatique de clients dans de nombreux langages :

```bash
# Python
openapi-generator-cli generate -i http://localhost:3000/api/openapi.json -g python -o ./python-client

# JavaScript/Node.js
openapi-generator-cli generate -i http://localhost:3000/api/openapi.json -g javascript -o ./js-client

# Java
openapi-generator-cli generate -i http://localhost:3000/api/openapi.json -g java -o ./java-client
```

## 📋 Endpoints Disponibles

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/status` | GET | État du système |
| `/api/process` | POST | Démarrer transcription |
| `/api/jobs` | GET | Lister tous les jobs |
| `/api/jobs/{id}` | GET | Détails d'un job |
| `/api/jobs/{id}/logs` | GET | Logs d'un job |
| `/api/jobs/{id}/logs/stream` | GET | Stream temps réel (SSE) |
| `/api/jobs/{id}/result` | GET | Résultat de transcription |

## 🔄 Formats de Réponse

### Transcription JSON
```json
{
  "segments": [
    {
      "start": 0.0,
      "end": 3.2,
      "text": "Bonjour tout le monde",
      "speaker": "SPEAKER_00"
    },
    {
      "start": 3.5,
      "end": 7.1,
      "text": "Comment allez-vous ?",
      "speaker": "SPEAKER_01"
    }
  ]
}
```

### Transcription TXT
```
SPEAKER_00: Bonjour tout le monde
SPEAKER_01: Comment allez-vous ?
```

### Transcription SRT
```
1
00:00:00,000 --> 00:00:03,200
[SPEAKER_00] Bonjour tout le monde

2
00:00:03,500 --> 00:00:07,100
[SPEAKER_01] Comment allez-vous ?
```

## 🛠️ Configuration IA

### Paramètres Recommandés

**Pour la qualité maximale :**
```json
{
  "model": "large-v3",
  "outputFormat": "json",
  "diarize": true,
  "computeType": "float16",
  "batchSize": 4
}
```

**Pour la vitesse :**
```json
{
  "model": "base",
  "outputFormat": "txt",
  "diarize": false,
  "computeType": "int8",
  "batchSize": 16
}
```

## 🔐 Authentification

Actuellement, l'API ne nécessite pas d'authentification. Pour la diarisation, un token Hugging Face est requis :

```
hfToken: hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## 📊 Monitoring

L'API fournit plusieurs mécanismes de monitoring :
- Logs détaillés par job
- Stream temps réel des logs (Server-Sent Events)
- Statuts de progression des jobs
- Métriques système via `/api/status`