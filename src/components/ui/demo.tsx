import ChatComposer from "@/components/ui/chat";

export default function Default() {
  return (
    <div
      className="flex min-h-[360px] w-full items-center justify-center rounded-window bg-canvas p-6"
      style={{
        display: "flex",
        minHeight: "360px",
        width: "100%",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "var(--radius-window, 14px)",
        background: "var(--canvas)",
        padding: "24px",
      }}
    >
      <ChatComposer
        match={{
          domicile: "Paris SG",
          exterieur: "Marseille",
          competition: "Ligue 1",
        }}
        cooldownSeconds={25}
        maxRequests={4}
      />
    </div>
  );
}
