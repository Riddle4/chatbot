const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = __dirname;
const envPath = path.join(root, ".env");

if (fs.existsSync(envPath)) {
  process.loadEnvFile(envPath);
}

const port = Number(process.env.PORT || 5173);
const model = process.env.OPENAI_MODEL || "gpt-5.4-mini";
const vectorStoreId = process.env.CMC_VECTOR_STORE_ID;
const allowedOrigins = new Set([
  "http://localhost:5173",
  "https://www.magie-lacote.com",
  "https://magie-lacote.com"
]);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8"
};

const localKnowledge = fs.readFileSync(path.join(root, "knowledge", "cmc.md"), "utf8");

const developerInstructions = `
Tu es Flamy, le dragon magique du Centre de Magie de la Côte.

Mission:
- Aider les visiteurs avec les questions concernant le Centre de Magie de la Côte.
- Répondre en français, avec un ton chaleureux, clair et professionnel.
- Donner des réponses courtes, utiles, orientées vers la prise de contact quand une information manque.

Périmètre autorisé:
- Cours, stages, ateliers et apprentissage de la magie.
- Anniversaires, spectacles, animations, événements privés ou entreprises.
- Informations pratiques: inscriptions, tarifs, horaires, lieu, déplacement, contact.
- Questions générales sur la magie seulement si elles aident à choisir une activité du centre.

Hors périmètre:
- Météo, actualité, politique, santé, droit, finance, devoirs scolaires, programmation, divertissement général.
- Toute question sans lien clair avec le Centre de Magie de la Côte.

Règles:
- Si la question est hors périmètre, refuse poliment et ramène vers les services du centre.
- N'invente jamais de prix, dates, horaires, adresses, disponibilités ou coordonnées.
- Si une information n'est pas dans la base, dis-le simplement et demande les détails nécessaires.
- Ne promets jamais qu'une réservation est confirmée.
- Pour une demande commerciale, demande: nom, contact, date souhaitée, lieu, nombre de participants, âge du public et type de prestation.

Base de connaissance locale:
${localKnowledge}
`.trim();

function sendJson(response, status, payload) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function applyCors(request, response) {
  const origin = request.headers.origin;

  if (origin && allowedOrigins.has(origin)) {
    response.setHeader("Access-Control-Allow-Origin", origin);
    response.setHeader("Vary", "Origin");
  }

  response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let data = "";

    request.on("data", (chunk) => {
      data += chunk;

      if (data.length > 12_000) {
        reject(new Error("Payload too large"));
        request.destroy();
      }
    });

    request.on("end", () => resolve(data));
    request.on("error", reject);
  });
}

function serveStatic(request, response) {
  const requestedUrl = new URL(request.url, `http://${request.headers.host}`);
  const safePath = path.normalize(decodeURIComponent(requestedUrl.pathname)).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(root, safePath === "/" ? "index.html" : safePath);

  if (!filePath.startsWith(root)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    response.writeHead(200, {
      "Content-Type": mimeTypes[path.extname(filePath)] || "application/octet-stream"
    });
    response.end(content);
  });
}

async function callOpenAI(message) {
  const tools = vectorStoreId
    ? [{ type: "file_search", vector_store_ids: [vectorStoreId] }]
    : undefined;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      input: [
        { role: "developer", content: developerInstructions },
        { role: "user", content: message }
      ],
      ...(tools ? { tools } : {}),
      max_output_tokens: 700,
      text: {
        format: {
          type: "json_schema",
          name: "flamy_response",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              in_scope: {
                type: "boolean",
                description: "True si la question concerne le Centre de Magie de la Côte."
              },
              answer: {
                type: "string",
                description: "Réponse finale à afficher au visiteur."
              },
              handoff_recommended: {
                type: "boolean",
                description: "True si l'équipe CMC doit reprendre la conversation."
              }
            },
            required: ["in_scope", "answer", "handoff_recommended"]
          }
        }
      }
    })
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${details}`);
  }

  const data = await response.json();
  const outputText =
    data.output_text ||
    data.output
      ?.flatMap((item) => item.content || [])
      .find((content) => content.type === "output_text")
      ?.text;

  if (!outputText) {
    throw new Error("OpenAI response did not include output text.");
  }

  return JSON.parse(outputText);
}

async function handleChat(request, response) {
  applyCors(request, response);

  if (!process.env.OPENAI_API_KEY) {
    sendJson(response, 503, {
      answer:
        "Flamy n'est pas encore relié à OpenAI. Ajoutez OPENAI_API_KEY dans l'environnement du serveur pour activer l'IA.",
      inScope: true,
      handoffRecommended: true
    });
    return;
  }

  try {
    const body = JSON.parse(await readBody(request));
    const message = String(body.message || "").trim();

    if (!message) {
      sendJson(response, 400, { error: "Message manquant." });
      return;
    }

    const result = await callOpenAI(message);
    sendJson(response, 200, {
      answer: result.answer,
      inScope: result.in_scope,
      handoffRecommended: result.handoff_recommended
    });
  } catch (error) {
    console.error(error);
    sendJson(response, 500, {
      answer:
        "Flamy a eu un petit souci de connexion. Vous pouvez reformuler ou laisser vos coordonnées pour que l'équipe vous réponde.",
      inScope: true,
      handoffRecommended: true
    });
  }
}

const server = http.createServer((request, response) => {
  if (request.method === "OPTIONS" && request.url === "/api/chat") {
    applyCors(request, response);
    response.writeHead(204);
    response.end();
    return;
  }

  if (request.method === "POST" && request.url === "/api/chat") {
    handleChat(request, response);
    return;
  }

  if (request.method === "GET") {
    serveStatic(request, response);
    return;
  }

  response.writeHead(405);
  response.end("Method not allowed");
});

server.listen(port, () => {
  console.log(`Flamy est disponible sur http://localhost:${port}`);
});
