import { useEffect, useRef, useState } from "react";
import { useAiCredits } from "../../lib/ai-credits";
import "./chat.css";

/* ─────────────────────────────────────────────────────────
 * CHAT APEX / WHOSCORED — Assistant IA Foot avec Limites de temps
 * Inspiré de WhoScored & Claude (Crédits Quotidiens, Cooldown, Gemini Flash)
 * ───────────────────────────────────────────────────────── */

export type Phase = "idle" | "sent" | "reply1" | "reply2" | "done" | "rate_limited";

export interface ChatSectionData {
  label: string;
  sub: string;
  time: string;
  body: string;
  resolving?: boolean;
}

export interface ChatMatchContext {
  domicile?: string;
  exterieur?: string;
  competition?: string;
  scorePrevu?: string;
}

export interface ChatComposerProps {
  match?: ChatMatchContext;
  cooldownSeconds?: number;
  maxRequests?: number;
  onSendPrompt?: (prompt: string, tab: string) => Promise<ChatSectionData[] | void>;
  className?: string;
}

function Section({
  label,
  sub,
  time,
  body,
  resolving,
}: ChatSectionData) {
  return (
    <div
      className="flex w-full flex-col gap-1.5 transition-[opacity,filter,transform] duration-400"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        width: "100%",
        opacity: resolving ? 0.6 : 1,
        filter: resolving ? "blur(0.5px)" : "blur(0)",
        transform: resolving ? "scale(0.985)" : "scale(1)",
        transformOrigin: "top left",
        transition: "all 400ms cubic-bezier(0.23, 1, 0.32, 1)",
        animation: "fade-up 400ms cubic-bezier(0.23,1,0.32,1) both",
      }}
    >
      <div
        className="flex items-center gap-1.5 text-[12px] leading-[1.3]"
        style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", lineHeight: "1.3" }}
      >
        <span style={{ fontWeight: 600, color: "var(--ink)" }}>{label}</span>
        <span style={{ color: "var(--ink-2)", fontSize: "11px" }}>• {sub}</span>
        <span style={{ color: "var(--ink-3)", marginLeft: "auto", fontSize: "11px" }}>{time}</span>
      </div>
      <p
        className="text-[13px] leading-relaxed text-ink"
        style={{
          margin: 0,
          fontSize: "13px",
          lineHeight: "1.45",
          color: "var(--ink)",
        }}
      >
        {body}
      </p>
    </div>
  );
}

export default function ChatComposer({
  match,
  onSendPrompt,
  className = "",
}: ChatComposerProps) {
  const dom = match?.domicile || "Real Madrid";
  const ext = match?.exterieur || "Man City";

  const {
    creditsLeft,
    maxDailyCredits,
    cooldownRemaining,
    isCoolingDown,
    isQuotaExceeded,
    consumeCredit,
    timeUntilReset,
    resetToMaxForTesting,
  } = useAiCredits();

  const [phase, setPhase] = useState<Phase>("done");
  const [draft, setDraft] = useState("");
  const [submitted, setSubmitted] = useState(`Analyse l'impact du pressing de ${dom} face à ${ext}`);
  const [tab, setTab] = useState("Tactique");
  const [tabs] = useState(["Tactique", "Stats xG", "Pronos"]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Réponses dynamiques générées
  const [sections, setSections] = useState<ChatSectionData[]>([
    {
      label: "Analyse Tactique",
      sub: "Bloc & Pressing",
      time: "1s",
      body: `${dom} affiche 62% de possession moyenne à domicile mais concède 1.4 contre-attaque dangereuse par match face aux blocs bas.`,
    },
    {
      label: "Vulnérabilité xG",
      sub: "Modèle Apex · Gemini Flash",
      time: "2s",
      body: `${ext} surperforme ses xGA de +18% sur phases arrêtées. Avantage léger aux transitions rapides.`,
    },
  ]);

  // Simulation de la séquence de streaming de l'IA
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    if (phase === "sent") {
      t = setTimeout(() => setPhase("reply1"), 600);
    } else if (phase === "reply1") {
      t = setTimeout(() => setPhase("reply2"), 1400);
    } else if (phase === "reply2") {
      t = setTimeout(() => setPhase("done"), 1100);
    }
    return () => clearTimeout(t);
  }, [phase]);

  const canSend = draft.trim().length > 0 && !isCoolingDown && !isQuotaExceeded && phase !== "sent";

  const send = async () => {
    if (!canSend) return;
    const ok = consumeCredit();
    if (!ok) return;

    const promptText = draft.trim();
    setSubmitted(promptText);
    setDraft("");
    setPhase("sent");

    if (onSendPrompt) {
      try {
        const result = await onSendPrompt(promptText, tab);
        if (result && result.length) {
          setSections(result);
        }
      } catch {
        // En cas d'erreur API, on garde la simulation de secours
      }
    } else {
      // Réponses de synthèse selon le prompt
      setSections([
        {
          label: tab === "Tactique" ? "Rapport Tactique" : tab === "Stats xG" ? "Métriques Clés" : "Prédiction Apex",
          sub: "Synthèse Gemini 2.5 Flash",
          time: "0.8s",
          body: `Analyse de "${promptText}" : Sur les 5 dernières confrontations, l'indice d'intensité défensive est de 84/100 avec un tempo de jeu modéré.`,
        },
        {
          label: "Indicateur Clé",
          sub: "Apex Engine",
          time: "1.8s",
          body: `Facteur décisif : taux de conversion de 14.2% sur tirs cadrés. Le modèle préconise une prudence sur les totaux de buts élevés.`,
        },
      ]);
    }
  };

  return (
    <div
      className={`apex-chat-dark flex flex-col overflow-hidden ${className}`}
      style={{
        display: "flex",
        flexDirection: "column",
        height: "320px",
        width: "100%",
        maxWidth: "380px",
        borderRadius: "var(--radius-card, 12px)",
        background: "var(--surface)",
        color: "var(--ink)",
        boxShadow: "var(--shadow-card)",
        border: "1px solid var(--line)",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* HEADER — Onglets + Quota restant + Actions */}
      <div
        className="flex shrink-0 items-center justify-between border-b p-2"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid var(--line)",
          padding: "8px 12px",
          background: "var(--inset)",
        }}
      >
        {/* Onglets thématiques de football */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          {tabs.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={tab === item}
              onClick={() => setTab(item)}
              style={{
                border: "none",
                cursor: "pointer",
                borderRadius: "6px",
                padding: "3px 8px",
                fontSize: "12px",
                fontWeight: tab === item ? 600 : 400,
                color: tab === item ? "var(--ink)" : "var(--ink-2)",
                background: tab === item ? "var(--field)" : "transparent",
                transition: "all 150ms ease",
              }}
            >
              {item}
            </button>
          ))}
        </div>

        {/* Badge de quota restant (Style Claude) */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            title={`Analyses gratuites restantes aujourd'hui. Recharge dans ${timeUntilReset}.`}
            style={{
              fontSize: "11px",
              padding: "2px 6px",
              borderRadius: "10px",
              background: creditsLeft > 1 ? "rgba(46, 230, 160, 0.15)" : "rgba(239, 114, 12, 0.15)",
              color: creditsLeft > 1 ? "var(--green)" : "var(--orange)",
              fontWeight: 500,
            }}
          >
            ⚡ {creditsLeft}/{maxDailyCredits} aujourd'hui
          </span>

          {/* Action icon : reset / refresh */}
          <button
            type="button"
            aria-label="Nouvelle question"
            title="Réinitialiser la discussion"
            onClick={() => {
              setPhase("idle");
              setSubmitted("");
            }}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--ink-3)",
              cursor: "pointer",
              padding: "3px",
              borderRadius: "4px",
              display: "flex",
              alignItems: "center",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
              <path d="M3 21v-5h5" />
            </svg>
          </button>
        </div>
      </div>

      {/* ZONE DE CONVERSATION */}
      <div
        style={{
          display: "flex",
          flex: 1,
          flexDirection: "column",
          gap: "10px",
          overflowY: "auto",
          padding: "10px 12px 6px",
          minHeight: 0,
        }}
      >
        {/* Bulle de question de l'utilisateur */}
        {submitted && (
          <div style={{ display: "flex", justifyContent: "flex-end", paddingLeft: "32px" }}>
            <div
              style={{
                borderRadius: "10px",
                background: "var(--field)",
                color: "var(--ink)",
                padding: "6px 10px",
                fontSize: "12.5px",
                lineHeight: "1.4",
                border: "1px solid var(--line)",
                maxWidth: "90%",
                wordBreak: "break-word",
              }}
            >
              {submitted}
            </div>
          </div>
        )}

        {/* Réponses structurées WhoScored / Gemini */}
        {(phase === "reply1" || phase === "reply2" || phase === "done") && sections[0] && (
          <Section {...sections[0]} />
        )}

        {(phase === "reply2" || phase === "done") && sections[1] && (
          <Section {...sections[1]} resolving={phase === "reply2"} />
        )}

        {phase === "sent" && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "12px",
              color: "var(--ink-2)",
              padding: "6px 0",
            }}
          >
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "var(--accent)",
                animation: "pulse-subtle 1.2s infinite ease-in-out",
              }}
            />
            <span>Analyse Gemini en cours...</span>
          </div>
        )}
      </div>

      {/* BANNIÈRE DE COOLDOWN / RATE LIMIT (Style Claude) */}
      {isCoolingDown && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "rgba(239, 114, 12, 0.12)",
            color: "var(--orange)",
            borderTop: "1px solid rgba(239, 114, 12, 0.2)",
            padding: "4px 12px",
            fontSize: "11px",
            fontWeight: 500,
          }}
        >
          <span>⏳ Pause anti-spam active</span>
          <span>Prêt dans {cooldownRemaining}s</span>
        </div>
      )}

      {isQuotaExceeded && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "rgba(255, 120, 120, 0.15)",
            color: "var(--red)",
            borderTop: "1px solid var(--line)",
            padding: "5px 12px",
            fontSize: "11px",
            fontWeight: 500,
          }}
        >
          <span>🚫 Quota journalier atteint (recharge dans {timeUntilReset})</span>
          <button
            type="button"
            onClick={resetToMaxForTesting}
            style={{
              background: "transparent",
              border: "1px solid var(--red)",
              color: "var(--red)",
              borderRadius: "4px",
              padding: "1px 6px",
              fontSize: "10px",
              cursor: "pointer",
            }}
          >
            Recharger (test)
          </button>
        </div>
      )}

      {/* COMPOSER / CHAMP DE SAISIE */}
      <div style={{ marginTop: "auto", padding: "8px 10px", background: "var(--surface)" }}>
        <div
          role="presentation"
          onClick={() => inputRef.current?.focus()}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            borderRadius: "var(--radius-control, 8px)",
            border: isCoolingDown ? "1px dashed var(--line-strong)" : "1px solid var(--line)",
            background: isCoolingDown ? "var(--inset)" : "var(--field)",
            padding: "8px 10px",
            transition: "border-color 150ms ease",
          }}
        >
          <input
            ref={inputRef}
            value={draft}
            disabled={isCoolingDown || isQuotaExceeded}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") send();
            }}
            placeholder={
              isQuotaExceeded
                ? "Quota atteint (réinitialisation au prochain match)"
                : isCoolingDown
                ? `Veuillez patienter encore ${cooldownRemaining}s...`
                : `Demander une stat ou analyse sur ${dom}...`
            }
            aria-label="Prompt d'analyse football"
            style={{
              background: "transparent",
              border: "none",
              outline: "none",
              color: "var(--ink)",
              fontSize: "12.5px",
              width: "100%",
            }}
          />

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "10px", color: "var(--ink-3)" }}>
              Gemini 2.5 Flash · WhoScored AI
            </span>

            <button
              type="button"
              aria-label="Envoyer"
              disabled={!canSend}
              onClick={send}
              style={{
                width: "26px",
                height: "26px",
                borderRadius: "6px",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: canSend ? "pointer" : "not-allowed",
                background: canSend ? "var(--accent)" : "var(--line)",
                color: canSend ? "#000000" : "var(--ink-3)",
                transition: "all 150ms ease",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
