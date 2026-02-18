import { useState } from "react";
import { MessageSquarePlus, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const currentPage = window.location.pathname + window.location.hash;

  const handleSubmit = async () => {
    const trimmed = message.trim();
    if (!trimmed) return;

    setSending(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page: currentPage, message: trimmed }),
      });

      if (res.ok) {
        toast({ title: "Thanks for your feedback!", description: "We'll review it soon." });
        setMessage("");
        setOpen(false);
      } else {
        toast({ title: "Failed to send", description: "Please try again.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Failed to send", description: "Please try again.", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  if (!open) {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-50 gap-1.5 bg-stone-900/90 border-stone-700 text-stone-300 shadow-lg backdrop-blur-sm"
        data-testid="button-open-feedback"
      >
        <MessageSquarePlus className="w-4 h-4" />
        <span className="hidden sm:inline">Submit Feedback</span>
      </Button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 max-w-[calc(100vw-2rem)] bg-stone-900 border border-stone-700 rounded-md shadow-xl" data-testid="feedback-panel">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-stone-700">
        <span className="text-sm font-medium text-stone-200">Submit Feedback</span>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setOpen(false)}
          className="text-stone-400"
          data-testid="button-close-feedback"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
      <div className="p-3 space-y-2">
        <p className="text-xs text-stone-400">Page: {currentPage}</p>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell us what you think, report a bug, or suggest an improvement..."
          className="w-full h-24 px-3 py-2 text-sm bg-stone-800 border border-stone-600 rounded-md text-stone-200 placeholder:text-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500 resize-none"
          data-testid="input-feedback-message"
        />
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!message.trim() || sending}
          className="w-full gap-1.5"
          data-testid="button-submit-feedback"
        >
          <Send className="w-3.5 h-3.5" />
          {sending ? "Sending..." : "Send Feedback"}
        </Button>
      </div>
    </div>
  );
}
