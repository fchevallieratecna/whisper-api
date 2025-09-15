import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Whisper API - Service de transcription audio',
      version: '1.0.0',
      description: `
API de transcription audio basée sur WhisperX avec support de la diarisation (séparation des locuteurs).
Ce service permet de traiter des fichiers audio pour obtenir une transcription texte avec identification des locuteurs.

## Fonctionnalités

- 🎤 **Transcription audio** : Conversion audio vers texte avec WhisperX
- 👥 **Diarisation** : Identification et séparation des différents locuteurs
- 📄 **Formats multiples** : Support JSON, TXT et SRT
- ⚡ **Traitement asynchrone** : Jobs avec suivi en temps réel
- 🌍 **Multi-langues** : Support de nombreuses langues

## Utilisation par IA

Cette API est conçue pour être facilement utilisable par des systèmes d'IA :
- Spécification OpenAPI complète pour génération automatique de clients
- Endpoints RESTful standard avec codes de statut HTTP appropriés
- Réponses JSON structurées et prévisibles
- Documentation complète des schémas de données
- Gestion d'erreurs cohérente
      `,
      contact: {
        name: 'API Support',
        email: 'support@example.com'
      }
    },
    servers: [
      {
        url: '/api',
        description: 'API Server'
      }
    ],
    tags: [
      {
        name: 'Audio Processing',
        description: 'Endpoints pour le traitement des fichiers audio'
      },
      {
        name: 'Jobs Management',
        description: 'Gestion et suivi des tâches de traitement'
      },
      {
        name: 'System Status',
        description: 'Informations système et état du service'
      }
    ]
  },
  apis: ['./src/routes/*.ts']
};

export const specs = swaggerJsdoc(options);