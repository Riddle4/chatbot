const chatLog = document.querySelector("#chatLog");
const chatForm = document.querySelector("#chatForm");
const messageInput = document.querySelector("#messageInput");
const quickActions = document.querySelectorAll("[data-question]");

const answers = [
  {
    keys: ["cours", "atelier", "apprendre", "formation", "debutant", "enfant", "adulte"],
    text:
      "Le Centre de Magie de la Côte peut proposer des cours et ateliers pour découvrir la magie, progresser pas à pas et prendre confiance devant un public. Le mieux est de nous dire l'âge, le niveau et l'objectif de la personne intéressée afin que nous conseillions la formule la plus adaptée."
  },
  {
    keys: ["anniversaire", "fete", "enfants", "animation", "birthday"],
    text:
      "Oui, Flamy adore les anniversaires magiques. On peut imaginer une animation avec effets visuels, participation des enfants et un moment vraiment mémorable. Précisez la date, l'âge des enfants, le lieu et le nombre d'invités pour recevoir une proposition."
  },
  {
    keys: ["spectacle", "show", "scene", "evenement", "entreprise", "mariage"],
    text:
      "Pour un spectacle ou un événement privé, le CMC peut orienter la proposition selon le public, la durée souhaitée et le contexte. Indiquez la date, le lieu, le nombre de personnes et l'ambiance recherchée."
  },
  {
    keys: ["tarif", "prix", "combien", "cout", "budget", "devis"],
    text:
      "Les tarifs dépendent du format: cours, atelier, anniversaire, spectacle ou accompagnement personnalisé. Donnez-moi le type de prestation, la date et le nombre de participants, puis l'équipe pourra préparer une réponse précise."
  },
  {
    keys: ["horaire", "date", "calendrier", "disponible", "disponibilite", "quand"],
    text:
      "Pour vérifier une date ou un horaire, envoyez votre souhait avec quelques options possibles. Flamy conseille toujours de proposer deux ou trois dates: la magie fonctionne mieux avec un peu de marge."
  },
  {
    keys: ["contact", "telephone", "email", "mail", "appeler", "joindre", "adresse"],
    text:
      "Je peux transmettre votre demande à l'équipe du Centre de Magie de la Côte. Ajoutez votre nom, votre email ou téléphone, le sujet de votre demande et le meilleur moment pour vous recontacter."
  },
  {
    keys: ["lieu", "ou", "adresse", "region", "cote", "deplacement"],
    text:
      "Le Centre de Magie de la Côte accompagne les passionnés et les événements de la région. Pour une intervention, indiquez votre commune et le lieu exact afin de confirmer les possibilités de déplacement."
  }
];

const fallbackAnswers = [
  "Je n'ai pas encore cette information dans mon grimoire. Laissez-moi votre question avec quelques détails, et l'équipe du CMC pourra vous répondre précisément.",
  "Bonne question. Pour éviter une réponse approximative, je vous propose de transmettre cela au Centre de Magie de la Côte avec votre contact.",
  "Je peux vous guider: s'agit-il plutot de cours, d'un anniversaire, d'un spectacle, d'un tarif ou d'une demande de contact ?"
];

function normalize(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function addMessage(author, text, options = {}) {
  const message = document.createElement("article");
  message.className = `message ${author === "Flamy" ? "bot" : "user"}`;
  if (options.pending) {
    message.dataset.pending = "true";
  }

  const label = document.createElement("strong");
  label.textContent = author;

  const body = document.createElement("span");
  appendLinkedText(body, cleanBotText(text));

  message.append(label, body);
  chatLog.append(message);
  chatLog.scrollTop = chatLog.scrollHeight;

  return message;
}

function cleanBotText(text) {
  return String(text)
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/^\s*#{1,6}\s+/gm, "")
    .trim();
}

function appendLinkedText(target, text) {
  const pattern = /https?:\/\/[^\s<>"')]+/g;
  let cursor = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) {
      target.append(document.createTextNode(text.slice(cursor, match.index)));
    }

    const link = document.createElement("a");
    link.href = match[0];
    link.textContent = match[0];
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    target.append(link);
    cursor = match.index + match[0].length;
  }

  if (cursor < text.length) {
    target.append(document.createTextNode(text.slice(cursor)));
  }
}

function setMessageText(message, text) {
  const body = message.querySelector("span");
  body.textContent = "";
  appendLinkedText(body, cleanBotText(text));
}

function findAnswer(question) {
  const normalized = normalize(question);
  const match = answers.find((entry) => entry.keys.some((key) => normalized.includes(key)));

  if (match) {
    return match.text;
  }

  return fallbackAnswers[Math.floor(Math.random() * fallbackAnswers.length)];
}

async function askOpenAI(question) {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ message: question })
  });

  const data = await response.json();

  if (!response.ok && !data.answer) {
    throw new Error(data.error || "Erreur API");
  }

  return data.answer || findAnswer(question);
}

async function askFlamy(question) {
  const trimmed = question.trim();

  if (!trimmed) {
    return;
  }

  addMessage("Vous", trimmed);
  messageInput.value = "";
  messageInput.disabled = true;

  const pending = addMessage("Flamy", "Flamy consulte son grimoire...", { pending: true });

  try {
    const answer = await askOpenAI(trimmed);
    setMessageText(pending, answer);
  } catch (error) {
    setMessageText(pending, findAnswer(trimmed));
  } finally {
    delete pending.dataset.pending;
    messageInput.disabled = false;
    messageInput.focus();
  }
}

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  askFlamy(messageInput.value);
});

quickActions.forEach((button) => {
  button.addEventListener("click", () => {
    askFlamy(button.dataset.question);
  });
});

addMessage(
  "Flamy",
  "Bonjour, je suis Flamy, le dragon magique du Centre de Magie de la Côte. Posez-moi une question sur les cours, anniversaires, spectacles, tarifs ou contacts."
);
