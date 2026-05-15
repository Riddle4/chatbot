import { localKnowledge } from "./generated-knowledge.js";

const allowedOrigins = new Set([
  "http://localhost:5173",
  "https://www.magie-lacote.com",
  "https://magie-lacote.com"
]);

function createDeveloperInstructions() {
  return `
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
- Réponds en texte brut uniquement. N'utilise jamais de Markdown, donc pas de **gras**, pas de listes avec astérisques, pas de tableaux.
- N'invente jamais de prix, dates, horaires, adresses, disponibilités ou coordonnées.
- Si une information n'est pas dans la base, dis-le simplement et demande les détails nécessaires.
- Ne promets jamais qu'une réservation est confirmée.
- Pour une demande commerciale, demande: nom, contact, date souhaitée, lieu, nombre de participants, âge du public et type de prestation.
- Pour les anniversaires, ne collecte pas les informations dans le chat. Explique plutôt quelles informations le client doit envoyer par e-mail à info@magie-lacote.com pour recevoir le formulaire.

Base de connaissance locale:
${localKnowledge}
`.trim();
}

function corsHeaders(request) {
  const headers = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
  const origin = request.headers.get("Origin");

  if (origin && allowedOrigins.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers.Vary = "Origin";
  }

  return headers;
}

function jsonResponse(request, status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(request)
    }
  });
}

async function callOpenAI(env, message) {
  const tools = env.CMC_VECTOR_STORE_ID
    ? [{ type: "file_search", vector_store_ids: [env.CMC_VECTOR_STORE_ID] }]
    : undefined;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL || "gpt-5.4-mini",
      input: [
        { role: "developer", content: createDeveloperInstructions() },
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

async function handleChat(request, env) {
  if (!env.OPENAI_API_KEY) {
    return jsonResponse(request, 503, {
      answer:
        "Flamy n'est pas encore relié à OpenAI. Ajoutez OPENAI_API_KEY dans les secrets Cloudflare pour activer l'IA.",
      inScope: true,
      handoffRecommended: true
    });
  }

  try {
    const body = await request.json();
    const message = String(body.message || "").trim();

    if (!message) {
      return jsonResponse(request, 400, { error: "Message manquant." });
    }

    const result = await callOpenAI(env, message);
    return jsonResponse(request, 200, {
      answer: result.answer,
      inScope: result.in_scope,
      handoffRecommended: result.handoff_recommended
    });
  } catch (error) {
    console.error(error);
    return jsonResponse(request, 500, {
      answer:
        "Flamy a eu un petit souci de connexion. Vous pouvez reformuler ou laisser vos coordonnées pour que l'équipe vous réponde.",
      inScope: true,
      handoffRecommended: true
    });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS" && url.pathname === "/api/chat") {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    if (request.method === "POST" && url.pathname === "/api/chat") {
      return handleChat(request, env);
    }

    return env.ASSETS.fetch(request);
  }
};
