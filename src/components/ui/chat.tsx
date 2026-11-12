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
  date_heure?: string;
  score_actuel?: string;
  statut?: string;
  buts_attendus?: { domicile: number; exterieur: number };
  stats?: {
    domicile?: { matchs: number; buts_marques: number; buts_encaisses: number; plus_2_5: number; sans_encaisser: number; derniers: string[] };
    exterieur?: { matchs: number; buts_marques: number; buts_encaisses: number; plus_2_5: number; sans_encaisser: number; derniers: string[] };
  };
  forme?: { domicile: string[]; exterieur: string[] };
  pronostics?: {
    issue?: { selection: string; probabilite: number; cote?: number; justification?: string };
    buts?: { selection: string; probabilite: number; cote?: number; justification?: string };
    bonus?: { categorie: string; selection: string; valeur_observee?: number; moyenne_ligue?: number; justification?: string };
    scores?: Array<{ score: string; probabilite: number }>;
  };
}

export interface ChatComposerProps {
  match?: ChatMatchContext;
  cooldownSeconds?: number;
  maxRequests?: number;
  onSendPrompt?: (prompt: string, tab: string, history: string[]) => Promise<ChatSectionData[] | void>;
  className?: string;
}

function normalizePrompt(value: string) {
  return value
    .toLocaleLowerCase("fr-FR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function getFallbackResponse(
  prompt: string,
  tab: string,
  match?: ChatMatchContext,
) {
  const normalized = normalizePrompt(prompt);

  if (/^(salut|bonjour|bonsoir|hello|coucou|hey)[ !,.?]*$/.test(normalized)) {
    return {
      conversational: true,
      sections: [{
        label: "Bonjour !",
        sub: "Apex Football IA",
        time: "À l’instant",
        body: match?.domicile
          ? `Salut ! Que souhaites-tu analyser sur ${match.domicile} – ${match.exterieur} (forme, xG, pronostics, tactique) ?`
          : "Salut ! Je suis l'analyste football d'Apex. Pose-moi une question sur un match, un club, les statistiques avancées (xG, Poisson) ou la tactique !",
      }],
    };
  }

  if (/^(merci|thanks|thx|super|parfait)[ !,.?]*$/.test(normalized)) {
    return {
      conversational: true,
      sections: [{
        label: "Avec plaisir !",
        sub: "Apex Football IA",
        time: "À l’instant",
        body: match?.domicile
          ? `N'hésite pas si tu as d'autres questions sur ${match.domicile} vs ${match.exterieur} ou sur un autre match.`
          : "N'hésite pas si tu souhaites explorer d'autres statistiques ou tactiques !",
      }],
    };
  }

  if (/^(aide|help|que peux-tu faire|comment ca marche|comment fonctionne)/.test(normalized)) {
    return {
      conversational: true,
      sections: [{
        label: "Guide de l'assistant",
        sub: "Apex Football IA",
        time: "Info",
        body: match?.domicile
          ? `Tu peux me poser des questions sur les xG attendus de ${match.domicile} et ${match.exterieur}, les tendances Over/Under 2.5 buts, les probabilités 1N2 du modèle Apex, ou la valeur des cotes.`
          : "Tu peux me poser des questions sur les modèles statistiques (xG, Poisson), la tactique (pressing haut, bloc médian, transitions), les règles du jeu, ou me demander une analyse libre sur n'importe quel championnat.",
      }],
    };
  }

  const label = tab === "Stats" ? "Statistiques" : tab === "Pronos" ? "Pronostics" : tab === "Tactique" ? "Tactique" : "Analyse Apex";
  const body = match?.domicile
    ? `Analyse pour ${match.domicile} - ${match.exterieur} : « ${prompt} ». Pour recevoir l'analyse complète de Gemini en direct, assurez-vous que GEMINI_API_KEY est configuré.`
    : `Analyse football : « ${prompt} ». Pour recevoir l'analyse complète de Gemini en direct, assurez-vous que GEMINI_API_KEY est configuré.`;

  return {
    conversational: false,
    sections: [{
      label,
      sub: "Apex Football IA",
      time: "À l’instant",
      body,
    }],
  };
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
  const dom = match?.domicile;
  const ext = match?.exterieur;

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

  const [phase, setPhase] = useState<Phase>("idle");
  const [draft, setDraft] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  
  const tabs = match?.domicile ? ["Match", "Stats", "Pronos"] : ["Général", "Tactique", "Statistiques"];
  const [tab, setTab] = useState(tabs[0]);
  const inputRef = useRef<HTMLInputElement>(null);

  const initialSections = (): ChatSectionData[] => {
    if (dom && ext) {
      const xgD = match?.buts_attendus?.domicile !== undefined ? match.buts_attendus.domicile.toFixed(1) : undefined;
      const xgE = match?.buts_attendus?.exterieur !== undefined ? match.buts_attendus.exterieur.toFixed(1) : undefined;
      return [
        {
          label: `Contexte · ${dom} vs ${ext}`,
          sub: match?.competition || "Compétition officielle",
          time: "Direct",
          body: xgD && xgE
            ? `Rencontre analysée par le modèle Apex (xG attendus : ${dom} ${xgD} – ${xgE} ${ext}). Posez votre question sur les statistiques, les scénarios de buts ou les cotes.`
            : `Rencontre prête pour analyse. Posez une question sur les statistiques, la forme, la tactique ou les pronostics de ce match.`,
        },
      ];
    }
    return [
      {
        label: "Apex Football IA",
        sub: "Analyste & Stratège",
        time: "Prêt",
        body: "Bonjour ! Je suis l'analyste football d'Apex. Posez vos questions sur n'importe quel match, club, joueur, concept tactique (pressing, transitions, 4-3-3) ou statistique (xG, loi de Poisson, value bets).",
      },
    ];
  };

  const [sections, setSections] = useState<ChatSectionData[]>(initialSections);

  useEffect(() => {
    if (phase === "idle" && !submitted) {
      setSections(initialSections());
      setTab(tabs[0]);
    }
  }, [match?.domicile, match?.exterieur]);

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
    const promptText = draft.trim();
    const fallback = getFallbackResponse(promptText, tab, match);

    // Les salutations et demandes d'aide restent gratuites : elles ne déclenchent pas d'appel IA.
    if (!fallback.conversational) {
      const ok = consumeCredit();
      if (!ok) return;
    }

    setSubmitted(promptText);
    setDraft("");
    const nextHistory = [...history, promptText].slice(-8);
    setHistory(nextHistory);

    if (fallback.conversational) {
      setSections(fallback.sections);
      setPhase("done");
      return;
    }

    setPhase("sent");

    if (onSendPrompt) {
      try {
        const result = await onSendPrompt(promptText, tab, nextHistory);
        if (result && result.length) {
          setSections(result);
        }
      } catch {
        setSections(fallback.sections);
      }
    } else {
      setSections(fallback.sections);
    }
  };

  return (
    <div
      className={`apex-chat-dark flex flex-col overflow-hidden ${className}`}
      style={{
        display: "flex",
        flexDirection: "column",
        height: "340px",
        width: "100%",
        maxWidth: "480px",
        borderRadius: "var(--radius-card, 14px)",
        background: "#ffffff",
        color: "var(--ink)",
        boxShadow: "0 2px 10px rgba(27, 44, 63, 0.06)",
        border: "1px solid var(--ln)",
        fontFamily: "var(--font, 'Manrope', system-ui, sans-serif)",
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
            {creditsLeft}/{maxDailyCredits} crédits
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
        {(phase === "reply1" || phase === "reply2" || phase === "done") &&
          sections.map((sec, idx) => (
            <Section
              key={idx}
              {...sec}
              resolving={phase === "reply1" && idx > 0}
            />
          ))}

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
            <span>Analyse en cours...</span>
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
          <span>Pause anti-spam active</span>
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
          <span>Quota atteint · recharge dans {timeUntilReset}</span>
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
                : dom && ext
                ? `Statistique ou question sur ${dom} vs ${ext}...`
                : dom
                ? `Demander une stat ou analyse sur ${dom}...`
                : `Posez une question foot, tactique ou statistique...`
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
              Réponse Apex IA
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
