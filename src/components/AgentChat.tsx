import { useState } from "react";
import { Bot, Send, Sparkles, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface AgentMessage {
  from: "agent" | "user";
  text: string;
}

export function AgentChat({
  title,
  intro,
  suggestions,
  answer,
}: {
  title: string;
  intro: string;
  suggestions: string[];
  answer: (question: string) => string;
}) {
  const [messages, setMessages] = useState<AgentMessage[]>([{ from: "agent", text: intro }]);
  const [input, setInput] = useState("");

  const ask = (q: string) => {
    if (!q.trim()) return;
    setMessages((m) => [...m, { from: "user", text: q }, { from: "agent", text: answer(q) }]);
    setInput("");
  };

  return (
    <Card className="shadow-none">
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary">
            <Bot className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-medium">{title}</p>
            <p className="text-xs text-muted-foreground">Réponses simulées à partir des données de démonstration</p>
          </div>
        </div>

        <div className="max-h-80 space-y-3 overflow-y-auto rounded-lg border bg-muted/40 p-3">
          {messages.map((m, i) => (
            <div key={i} className={cn("flex gap-2", m.from === "user" && "flex-row-reverse")}>
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-card">
                {m.from === "agent" ? <Sparkles className="h-3.5 w-3.5 text-primary" /> : <User className="h-3.5 w-3.5" />}
              </span>
              <p
                className={cn(
                  "max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-line",
                  m.from === "agent" ? "bg-card" : "bg-primary text-primary-foreground",
                )}
              >
                {m.text}
              </p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => ask(s)}
              className="rounded-full border px-3 py-1.5 text-xs transition-colors hover:border-primary/40 hover:bg-accent"
            >
              {s}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ask(input)}
            placeholder="Posez votre question…"
          />
          <Button onClick={() => ask(input)}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function AgentCard({
  name,
  description,
  features,
  icon: Icon,
  active = true,
}: {
  name: string;
  description: string;
  features: string[];
  icon: React.ComponentType<{ className?: string }>;
  active?: boolean;
}) {
  return (
    <Card className="shadow-none transition-all hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </span>
          <span
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-xs",
              active ? "border-success/25 bg-success/10 text-success" : "text-muted-foreground",
            )}
          >
            {active ? "Actif" : "Bientôt"}
          </span>
        </div>
        <div>
          <p className="font-medium">{name}</p>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <ul className="space-y-1 text-sm text-muted-foreground">
          {features.map((f) => (
            <li key={f} className="flex gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
              {f}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
