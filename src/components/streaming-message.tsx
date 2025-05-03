"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { ClientOnly } from "./client-only";
import { safeJsonParse, isClient } from "@/utils/hydration";
import { Message } from "@/types/chat";

// Dynamically import ReactMarkdown with SSR disabled to prevent hydration errors
const ReactMarkdown = dynamic(() => import("react-markdown"), { ssr: false });

// We'll handle remarkGfm in the component itself to avoid import issues
// This approach prevents build errors with ESM/CJS module conflicts

interface StreamingMessageProps {
  message: Message;
  agentName: string;
  agentImageUrl?: string;
  isStreaming: boolean;
  streamContent: string;
}

export function StreamingMessage({
  message,
  agentName,
  agentImageUrl,
  isStreaming,
  streamContent,
}: StreamingMessageProps) {
  const [displayContent, setDisplayContent] = useState(message.content);
  const messageRef = useRef<HTMLDivElement>(null);

  // Update display content when streaming or message content changes
  useEffect(() => {
    if (isStreaming) {
      setDisplayContent(streamContent);
    } else {
      setDisplayContent(message.content);
    }
  }, [isStreaming, streamContent, message.content]);

  // Auto-scroll to bottom of message when content changes
  useEffect(() => {
    if (messageRef.current && isStreaming) {
      messageRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [displayContent, isStreaming]);

  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  // Format citations if available
  const formatCitations = () => {
    if (!message.metadata) return null;

    // Use safe JSON parsing to prevent hydration errors
    const metadata = safeJsonParse(message.metadata, { citations: [] });
    if (!metadata.citations || metadata.citations.length === 0) return null;

    return (
      <div className="mt-4 border-t border-neutral-200 dark:border-neutral-800 pt-2">
        <h4 className="text-sm font-medium mb-1">Sources</h4>
        <ul className="text-xs text-neutral-600 dark:text-neutral-400 space-y-1">
          {metadata.citations.map((citation: any, index: number) => (
            <li key={index}>
              <span className="font-medium">[{index + 1}]</span>{" "}
              {citation.source}: <span className="italic">{citation.text}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="flex items-start gap-4 py-4" ref={messageRef}>
      <Avatar className="h-10 w-10">
        {agentImageUrl ? (
          <AvatarImage src={agentImageUrl} alt={agentName} />
        ) : null}
        <AvatarFallback>{getInitials(agentName)}</AvatarFallback>
      </Avatar>
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <div className="font-medium">{agentName}</div>
          {isStreaming && (
            <Loader2 className="h-3 w-3 animate-spin text-neutral-500" />
          )}
        </div>
        <Card className="p-4 bg-neutral-50 dark:bg-neutral-900 overflow-hidden">
          <div className="prose prose-neutral dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:p-2">
            <div className="whitespace-pre-wrap">{displayContent || " "}</div>
          </div>
          {formatCitations()}
        </Card>
      </div>
    </div>
  );
}
