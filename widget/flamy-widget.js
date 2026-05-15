(function () {
  const currentScript = document.currentScript;
  const apiUrl =
    currentScript?.dataset.apiUrl ||
    new URL("/api/chat", currentScript?.src || window.location.href).toString();
  const avatarUrl =
    currentScript?.dataset.avatarUrl ||
    new URL("/assets/flamy.png", currentScript?.src || window.location.href).toString();
  const position = currentScript?.dataset.position || "right";

  if (document.querySelector("flamy-cmc-widget")) {
    return;
  }

  const host = document.createElement("flamy-cmc-widget");
  document.body.append(host);

  const shadow = host.attachShadow({ mode: "open" });
  shadow.innerHTML = `
    <style>
      :host {
        --flamy-ink: #1d2433;
        --flamy-muted: #667085;
        --flamy-line: #d8dee8;
        --flamy-panel: #ffffff;
        --flamy-teal: #0f766e;
        --flamy-teal-dark: #114e49;
        --flamy-coral: #ef6f61;
        --flamy-mist: #eef7f5;
        color: var(--flamy-ink);
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      * {
        box-sizing: border-box;
      }

      .launcher,
      .panel {
        position: fixed;
        z-index: 2147483000;
        right: ${position === "left" ? "auto" : "22px"};
        left: ${position === "left" ? "22px" : "auto"};
      }

      .launcher {
        bottom: 22px;
        display: inline-flex;
        align-items: center;
        gap: 10px;
        min-height: 58px;
        max-width: min(310px, calc(100vw - 34px));
        padding: 9px 14px 9px 9px;
        border: 0;
        border-radius: 8px;
        color: white;
        background: linear-gradient(135deg, var(--flamy-teal), var(--flamy-teal-dark));
        box-shadow: 0 18px 42px rgba(17, 78, 73, 0.28);
        cursor: pointer;
      }

      .launcher img {
        width: 42px;
        height: 42px;
        border-radius: 8px;
        object-fit: cover;
        border: 2px solid rgba(255, 255, 255, 0.8);
      }

      .launcher span {
        display: grid;
        gap: 1px;
        text-align: left;
      }

      .launcher strong {
        font-size: 0.96rem;
        line-height: 1.1;
      }

      .launcher small {
        color: rgba(255, 255, 255, 0.84);
        font-size: 0.79rem;
        line-height: 1.2;
      }

      .panel {
        bottom: 92px;
        width: min(390px, calc(100vw - 24px));
        height: min(650px, calc(100vh - 118px));
        display: none;
        grid-template-rows: auto 1fr auto auto;
        overflow: visible;
        border: 1px solid rgba(29, 36, 51, 0.12);
        border-radius: 8px;
        background: var(--flamy-panel);
        box-shadow: 0 24px 70px rgba(29, 36, 51, 0.22);
      }

      .panel.open {
        display: grid;
      }

      .header {
        position: relative;
        display: flex;
        align-items: center;
        gap: 14px;
        min-height: 82px;
        padding: 16px 14px 14px 104px;
        border-bottom: 1px solid var(--flamy-line);
        border-radius: 8px 8px 0 0;
        background: linear-gradient(90deg, #eef7f5, #fffaf4);
      }

      .header img {
        position: absolute;
        left: 14px;
        bottom: 10px;
        width: 86px;
        height: 86px;
        border-radius: 8px;
        object-fit: cover;
        border: 4px solid white;
        box-shadow: 0 16px 32px rgba(29, 36, 51, 0.18);
        transform: translateY(-16px);
      }

      .identity {
        min-width: 0;
        flex: 1;
      }

      .identity strong,
      .identity small {
        display: block;
      }

      .identity strong {
        font-size: 1rem;
      }

      .identity small {
        margin-top: 2px;
        color: var(--flamy-muted);
        font-size: 0.82rem;
      }

      .close {
        width: 36px;
        height: 36px;
        border: 0;
        border-radius: 8px;
        color: var(--flamy-teal-dark);
        background: rgba(15, 118, 110, 0.09);
        cursor: pointer;
        font-size: 1.2rem;
        line-height: 1;
      }

      .log {
        display: flex;
        flex-direction: column;
        gap: 10px;
        min-height: 0;
        overflow-y: auto;
        padding: 14px;
        border-radius: 0;
        background:
          linear-gradient(rgba(255, 255, 255, 0.82), rgba(255, 255, 255, 0.82)),
          repeating-linear-gradient(135deg, rgba(15, 118, 110, 0.05) 0 2px, transparent 2px 20px);
      }

      .message {
        width: fit-content;
        max-width: 86%;
        padding: 11px 12px;
        border-radius: 8px;
        line-height: 1.42;
        font-size: 0.94rem;
        box-shadow: 0 8px 20px rgba(29, 36, 51, 0.08);
        white-space: pre-line;
      }

      .bot {
        align-self: flex-start;
        border: 1px solid rgba(15, 118, 110, 0.16);
        background: white;
      }

      .user {
        align-self: flex-end;
        color: white;
        background: linear-gradient(135deg, var(--flamy-teal), var(--flamy-teal-dark));
      }

      .message b {
        display: block;
        margin-bottom: 4px;
        font-size: 0.78rem;
      }

      .quick {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
        padding: 10px 12px;
        border-top: 1px solid var(--flamy-line);
      }

      .quick button {
        min-height: 38px;
        border: 0;
        border-radius: 8px;
        color: var(--flamy-teal-dark);
        background: var(--flamy-mist);
        cursor: pointer;
        font: inherit;
        font-weight: 750;
        font-size: 0.85rem;
      }

      form {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 8px;
        padding: 12px;
        border-top: 1px solid var(--flamy-line);
      }

      input {
        min-width: 0;
        height: 42px;
        padding: 0 12px;
        border: 1px solid var(--flamy-line);
        border-radius: 8px;
        color: var(--flamy-ink);
        background: #fbfcfd;
        font: inherit;
      }

      input:focus {
        outline: 3px solid rgba(15, 118, 110, 0.18);
        border-color: var(--flamy-teal);
      }

      form button {
        min-width: 48px;
        height: 42px;
        border: 0;
        border-radius: 8px;
        color: white;
        background: linear-gradient(135deg, var(--flamy-coral), #d94d42);
        cursor: pointer;
        font: inherit;
        font-weight: 800;
      }

      @media (max-width: 520px) {
        .launcher {
          right: ${position === "left" ? "auto" : "12px"};
          left: ${position === "left" ? "12px" : "auto"};
          bottom: 12px;
          max-width: calc(100vw - 24px);
        }

        .panel {
          inset: auto 10px 82px 10px;
          width: auto;
          height: min(620px, calc(100vh - 96px));
        }

        .header {
          min-height: 76px;
          padding-left: 92px;
        }

        .header img {
          width: 76px;
          height: 76px;
          transform: translateY(-12px);
        }
      }
    </style>

    <section class="panel" aria-label="Chatbot Flamy" aria-hidden="true">
      <header class="header">
        <img src="${avatarUrl}" alt="">
        <div class="identity">
          <strong>Flamy</strong>
          <small>Dragon magique du CMC</small>
        </div>
        <button class="close" type="button" aria-label="Fermer Flamy">×</button>
      </header>
      <div class="log" aria-live="polite"></div>
      <div class="quick" aria-label="Questions rapides">
        <button type="button" data-question="Je souhaite organiser un anniversaire magique">Anniversaire</button>
        <button type="button" data-question="Quels cours de magie proposez-vous ?">Cours</button>
        <button type="button" data-question="Quels escape games proposez-vous ?">Escape games</button>
        <button type="button" data-question="Comment puis-je vous contacter ?">Contact</button>
      </div>
      <form>
        <input aria-label="Votre question" placeholder="Votre question..." autocomplete="off">
        <button type="submit" aria-label="Envoyer">➜</button>
      </form>
    </section>

    <button class="launcher" type="button" aria-label="Ouvrir Flamy">
      <img src="${avatarUrl}" alt="">
      <span>
        <strong>Besoin d’aide ?</strong>
        <small>Demandez à Flamy</small>
      </span>
    </button>
  `;

  const panel = shadow.querySelector(".panel");
  const launcher = shadow.querySelector(".launcher");
  const close = shadow.querySelector(".close");
  const log = shadow.querySelector(".log");
  const form = shadow.querySelector("form");
  const input = shadow.querySelector("input");
  const quickButtons = shadow.querySelectorAll("[data-question]");

  function addMessage(author, text) {
    const message = document.createElement("article");
    message.className = `message ${author === "Flamy" ? "bot" : "user"}`;
    message.innerHTML = `<b>${author}</b><span></span>`;
    message.querySelector("span").textContent = text;
    log.append(message);
    log.scrollTop = log.scrollHeight;
    return message;
  }

  function openPanel() {
    panel.classList.add("open");
    panel.setAttribute("aria-hidden", "false");
    launcher.style.display = "none";
    window.setTimeout(() => input.focus(), 50);
  }

  function closePanel() {
    panel.classList.remove("open");
    panel.setAttribute("aria-hidden", "true");
    launcher.style.display = "inline-flex";
  }

  async function ask(question) {
    const trimmed = question.trim();
    if (!trimmed) return;

    addMessage("Vous", trimmed);
    input.value = "";
    input.disabled = true;

    const pending = addMessage("Flamy", "Flamy consulte son grimoire...");

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed })
      });
      const data = await response.json();
      pending.querySelector("span").textContent =
        data.answer ||
        "Je n’ai pas encore cette information dans mon grimoire. L’équipe du Centre pourra vous répondre précisément.";
    } catch (error) {
      pending.querySelector("span").textContent =
        "Flamy a un souci de connexion. Vous pouvez réessayer dans un instant ou contacter directement l’équipe du Centre.";
    } finally {
      input.disabled = false;
      input.focus();
    }
  }

  launcher.addEventListener("click", openPanel);
  close.addEventListener("click", closePanel);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    ask(input.value);
  });
  quickButtons.forEach((button) => {
    button.addEventListener("click", () => ask(button.dataset.question));
  });

  addMessage(
    "Flamy",
    "Salutations magiques 💫 Je suis Flamy. Je peux vous aider pour les cours, anniversaires, escape games, spectacles et contacts du Centre de Magie de la Côte."
  );
})();
