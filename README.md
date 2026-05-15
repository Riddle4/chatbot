# Flamy - Chatbot du Centre de Magie de la Côte

## Lancer le chatbot avec OpenAI

1. Créer une clé API OpenAI.
2. Copier `.env.example` vers `.env` et remplir `OPENAI_API_KEY`.
3. Charger les variables puis lancer:

```bash
set -a
source .env
set +a
npm start
```

Le site sera disponible sur `http://localhost:5173`.

## Installer le widget sur Wix

Le fichier `widget/flamy-widget.js` injecte une petite fenêtre flottante sur un site externe.

Une fois le serveur Flamy publié sur une URL HTTPS, ajoutez ce code dans Wix:

```html
<script
  src="https://VOTRE-DOMAINE-FLAMY/widget/flamy-widget.js"
  data-api-url="https://VOTRE-DOMAINE-FLAMY/api/chat"
  async>
</script>
```

Dans Wix, allez dans le tableau de bord du site, puis **Paramètres > Code personnalisé > Ajouter un code personnalisé**. Collez le script dans le body, choisissez toutes les pages ou seulement les pages voulues, puis publiez.

Le serveur autorise déjà les domaines `https://www.magie-lacote.com` et `https://magie-lacote.com` pour les appels depuis le widget.

## Comment former Flamy

Pour un chatbot d'information, il vaut mieux commencer par une base de connaissance plutôt que par du fine-tuning.

Complétez d'abord `knowledge/cmc.md` avec les informations exactes:

- tarifs;
- horaires;
- adresse;
- e-mail et téléphone;
- types de cours;
- conditions d'annulation;
- formats d'anniversaire;
- zones de déplacement;
- FAQ réelle des clients.

Flamy reçoit cette base à chaque réponse et a pour instruction de ne pas inventer les informations manquantes.

## Base documentaire avancée

Quand vous avez plusieurs documents, créez un vector store OpenAI, ajoutez vos PDF ou fichiers `.md`, puis indiquez son identifiant dans `CMC_VECTOR_STORE_ID`.

Le serveur activera alors l'outil `file_search`, ce qui permet à Flamy de chercher dans vos documents avant de répondre.

## Limiter le champ de réponse

Le serveur impose le périmètre côté backend:

- Flamy répond uniquement aux questions liées au Centre de Magie de la Côte.
- Les questions hors sujet, comme la météo ou l'actualité, reçoivent un refus poli.
- La réponse OpenAI doit respecter un schéma JSON avec `in_scope`, `answer` et `handoff_recommended`.

Ces règles sont dans `server.js`, pas dans le navigateur, ce qui les rend plus difficiles à contourner.
