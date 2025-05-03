"use client";

import { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UserButton } from "@clerk/nextjs";
import { ThumbsUp, ThumbsDown, Star } from "lucide-react";
import { TypingIndicator } from "@/components/ui/typing-indicator";
import { StreamingMessage } from "@/components/streaming-message";
import { Message, Chat, Agent } from "@/types/chat";
import { safeJsonParse, isClient } from "@/utils/hydration";

export default function AgentChatPage() {
  const params = useParams();
  const router = useRouter();
  const agentId = params.id as string;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [agent, setAgent] = useState<Agent | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<Message | null>(null);
  const [feedbackRating, setFeedbackRating] = useState<number>(0);
  const [feedbackComment, setFeedbackComment] = useState<string>("");
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState<boolean>(false);
  const [submittingFeedback, setSubmittingFeedback] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Fetch agent details
  useEffect(() => {
    const fetchAgent = async () => {
      try {
        const response = await fetch(`/api/agents/${agentId}`);
        if (response.ok) {
          const data = await response.json();
          setAgent(data);
        } else {
          console.error("Failed to fetch agent");
        }
      } catch (error) {
        console.error("Error fetching agent:", error);
      }
    };

    fetchAgent();
  }, [agentId]);

  // Fetch chats
  useEffect(() => {
    const fetchChats = async () => {
      try {
        const response = await fetch(`/api/agents/${agentId}/chats`);
        if (response.ok) {
          const data = await response.json();
          setChats(data);
        } else {
          console.error("Failed to fetch chats");
        }
      } catch (error) {
        console.error("Error fetching chats:", error);
      }
    };

    fetchChats();
  }, [agentId]);

  // Function to fetch messages
  const fetchMessages = async () => {
    if (!currentChatId) return;

    try {
      const response = await fetch(`/api/chats/${currentChatId}/messages`);
      if (response.ok) {
        const data = await response.json();

        // Process messages to parse metadata and citations
        const processedMessages = data.map((message: any) => {
          // Handle metadata which may contain citations
          if (message.metadata && typeof message.metadata === "string") {
            const metadata = safeJsonParse(message.metadata, {});
            if (metadata.citations) {
              message.citations = metadata.citations;
            }
          }

          // For backward compatibility, also handle direct citations
          if (message.citations && typeof message.citations === "string") {
            message.citations = safeJsonParse(message.citations, []);
          }

          return message;
        });

        setMessages(processedMessages);
      } else {
        console.error("Failed to fetch messages");
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  // Fetch messages when chat is selected
  useEffect(() => {
    fetchMessages();
  }, [currentChatId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Create a new chat
  const createNewChat = async () => {
    try {
      const response = await fetch(`/api/agents/${agentId}/chats`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: `Chat with ${
            agent?.name || "Agent"
          } - ${new Date().toLocaleString()}`,
        }),
      });

      if (response.ok) {
        const newChat = await response.json();
        setChats((prev) => [newChat, ...prev]);
        setCurrentChatId(newChat.id);
        setMessages([]);
      } else {
        console.error("Failed to create chat");
      }
    } catch (error) {
      console.error("Error creating chat:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    // If no active chat, create one
    if (!currentChatId) {
      await createNewChat();
      return;
    }

    // Add user message to UI immediately
    const tempUserMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, tempUserMessage]);
    const userInput = input; // Store input before clearing
    setInput("");
    setIsLoading(true);
    setIsStreaming(true);
    setStreamingContent("");

    // Close any existing EventSource
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    try {
      // First, send the user message to the API
      const userMessageResponse = await fetch(
        `/api/chats/${currentChatId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content: userInput,
            role: "user",
          }),
        }
      );

      if (!userMessageResponse.ok) {
        throw new Error("Failed to send user message");
      }

      // Add a temporary assistant message for streaming
      const tempAssistantMessage: Message = {
        id: `temp-${Date.now().toString()}`,
        role: "assistant",
        content: "",
      };

      setMessages((prev) => [...prev, tempAssistantMessage]);

      // Now set up streaming for the assistant's response
      const streamUrl = `/api/chats/${currentChatId}/messages/stream`;

      // Add a timestamp to prevent caching and a unique ID for debugging
      const uniqueId = Math.random().toString(36).substring(2, 15);
      const eventSourceUrl = `${streamUrl}?t=${Date.now()}&id=${uniqueId}`;

      // Create the EventSource with credentials
      let eventSource: EventSource;
      let connectionTimeout: NodeJS.Timeout;

      try {
        // Set a timeout to detect connection issues
        connectionTimeout = setTimeout(() => {
          console.warn(
            "EventSource connection timeout - falling back to regular API"
          );
          if (eventSource) {
            eventSource.close();
          }
          // Fallback to regular fetch
          fetchMessages();
        }, 10000); // 10 seconds timeout

        // Create the EventSource
        eventSource = new EventSource(eventSourceUrl, {
          withCredentials: true,
        });

        // Add a connection open handler to clear the timeout
        eventSource.onopen = () => {
          clearTimeout(connectionTimeout);
          console.log("EventSource connection established");
        };
      } catch (error) {
        console.error("Failed to create EventSource:", error);
        clearTimeout(connectionTimeout);
        // Fallback to regular fetch
        fetchMessages();
        throw new Error("Failed to initialize streaming");
      }

      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.error) {
            console.error("Streaming error:", data.error);
            eventSource.close();
            setIsStreaming(false);
            setIsLoading(false);
            return;
          }

          if (data.done) {
            // Streaming is complete
            eventSource.close();
            setIsStreaming(false);
            setIsLoading(false);

            // Fetch the complete message with its ID to update the UI
            fetchMessages();
            return;
          }

          if (data.content) {
            // Update the streaming content
            setStreamingContent((prev) => prev + data.content);

            // Update the temporary message in the messages array
            setMessages((prev) => {
              const newMessages = [...prev];
              const lastIndex = newMessages.length - 1;

              if (
                lastIndex >= 0 &&
                newMessages[lastIndex].role === "assistant"
              ) {
                newMessages[lastIndex] = {
                  ...newMessages[lastIndex],
                  content:
                    (newMessages[lastIndex].content || "") + data.content,
                };
              }

              return newMessages;
            });
          }
        } catch (error) {
          console.error("Error parsing streaming data:", error);
        }
      };

      // Track connection attempts
      let connectionAttempts = 0;
      const MAX_RECONNECT_ATTEMPTS = 3;

      eventSource.onerror = (error) => {
        // The error object from EventSource doesn't contain useful information
        connectionAttempts++;

        if (connectionAttempts <= MAX_RECONNECT_ATTEMPTS) {
          console.warn(
            `EventSource connection error (attempt ${connectionAttempts}/${MAX_RECONNECT_ATTEMPTS}) - will retry`
          );
          // EventSource will automatically try to reconnect
          return;
        }

        // After max attempts, fall back to regular API
        console.error(
          "EventSource connection failed after multiple attempts - falling back to regular API"
        );

        // Clean up the event source
        eventSource.close();
        clearTimeout(connectionTimeout);

        // Reset UI state
        setIsStreaming(false);
        setIsLoading(false);

        // Add a fallback message if we don't have any content yet
        if (!streamingContent && messages.length > 0) {
          const lastMessage = messages[messages.length - 1];
          if (
            lastMessage &&
            lastMessage.role === "assistant" &&
            !lastMessage.content
          ) {
            // Update the last message with a fallback response
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...updated[updated.length - 1],
                content:
                  "I'm sorry, there was an error with the streaming connection. Falling back to standard response mode.",
              };
              return updated;
            });
          }
        }

        // Fetch messages to ensure we have the latest state
        fetchMessages();
      };

      // Send the request to start streaming
      const streamResponse = await fetch(streamUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: userInput,
          role: "user",
        }),
      });

      if (!streamResponse.ok) {
        throw new Error("Failed to initiate streaming");
      }
    } catch (error) {
      console.error("Error in streaming message flow:", error);
      setIsStreaming(false);
      setIsLoading(false);

      // Fallback to regular fetch if streaming fails
      fetchMessages();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSendMessage();
    }
  };

  const selectChat = (chatId: string) => {
    setCurrentChatId(chatId);
  };

  const openFeedbackDialog = (message: Message) => {
    setFeedbackMessage(message);
    setFeedbackRating(message.feedback || 0);
    setFeedbackComment(message.feedbackComment || "");
    setFeedbackDialogOpen(true);
  };

  const submitFeedback = async () => {
    if (!feedbackMessage || feedbackRating === 0) return;

    setSubmittingFeedback(true);

    try {
      const response = await fetch(
        `/api/messages/${feedbackMessage.id}/feedback`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            feedback: feedbackRating,
            feedbackComment,
          }),
        }
      );

      if (response.ok) {
        const updatedMessage = await response.json();

        // Update the message in the UI
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === updatedMessage.id
              ? {
                  ...msg,
                  feedback: updatedMessage.feedback,
                  feedbackComment: updatedMessage.feedbackComment,
                }
              : msg
          )
        );

        setFeedbackDialogOpen(false);
      } else {
        console.error("Failed to submit feedback");
      }
    } catch (error) {
      console.error("Error submitting feedback:", error);
    } finally {
      setSubmittingFeedback(false);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <header className="border-b border-neutral-200 dark:border-neutral-800">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Link href="/">
              <h1 className="text-2xl font-bold">Agennt</h1>
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <Link href={`/agents/${agentId}/edit`}>
              <Button variant="outline">Edit Agent</Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="ghost">Dashboard</Button>
            </Link>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 border-r border-neutral-200 dark:border-neutral-800 flex flex-col">
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
            <Button className="w-full" onClick={createNewChat}>
              New Chat
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {chats?.map((chat) => (
              <div
                key={chat.id}
                className={`p-3 rounded-md cursor-pointer mb-2 ${
                  currentChatId === chat.id
                    ? "bg-neutral-100 dark:bg-neutral-800"
                    : "hover:bg-neutral-50 dark:hover:bg-neutral-900"
                }`}
                onClick={() => selectChat(chat.id)}
              >
                <h3 className="text-sm font-medium truncate">{chat.title}</h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {new Date(chat.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center">
            <h2 className="text-xl font-bold">{agent?.name || "Agent"}</h2>
            {agent?.persona && (
              <span className="ml-2 text-sm bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full">
                {agent.persona.name}
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <h3 className="text-lg font-medium mb-2">
                    Start a conversation
                  </h3>
                  <p className="text-neutral-600 dark:text-neutral-400">
                    Ask a question to begin chatting with{" "}
                    {agent?.name || "the agent"}
                  </p>
                </div>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <div key={message.id}>
                    {message.role === "user" ? (
                      <div className="flex justify-end py-4">
                        <div className="max-w-[80%] bg-blue-500 text-white rounded-lg p-4">
                          <p>{message.content}</p>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <StreamingMessage
                          message={message}
                          agentName={agent?.name || "Agent"}
                          agentImageUrl={agent?.imageUrl}
                          isStreaming={
                            isStreaming &&
                            messages[messages.length - 1]?.id === message.id
                          }
                          streamContent={
                            isStreaming &&
                            messages[messages.length - 1]?.id === message.id
                              ? streamingContent
                              : message.content
                          }
                        />

                        {/* Feedback UI for assistant messages */}
                        <div className="ml-14 -mt-2 mb-4">
                          <div className="flex items-center space-x-1">
                            {message.feedback ? (
                              <div className="flex items-center text-xs">
                                <div className="flex">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <Star
                                      key={i}
                                      className={`h-3 w-3 ${
                                        i < (message.feedback || 0)
                                          ? "text-yellow-500 fill-yellow-500"
                                          : "text-neutral-400"
                                      }`}
                                    />
                                  ))}
                                </div>
                                <span className="ml-1 text-neutral-500">
                                  {message.feedbackComment
                                    ? "Thanks for your feedback!"
                                    : ""}
                                </span>
                              </div>
                            ) : (
                              <button
                                onClick={() => openFeedbackDialog(message)}
                                className="text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 flex items-center"
                              >
                                Rate this response
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {isStreaming && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] rounded-lg p-4 bg-neutral-100 dark:bg-neutral-800">
                      <TypingIndicator />
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-neutral-200 dark:border-neutral-800">
            <div className="flex space-x-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                onClick={() => void handleSendMessage()}
                disabled={isLoading || !input.trim()}
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Thinking...
                  </span>
                ) : (
                  "Send"
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Dialog */}
      <Dialog open={feedbackDialogOpen} onOpenChange={setFeedbackDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rate this response</DialogTitle>
            <DialogDescription>
              Your feedback helps us improve the quality of responses.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="flex justify-center space-x-2 mb-6">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  onClick={() => setFeedbackRating(rating)}
                  className={`p-2 rounded-full transition-all ${
                    feedbackRating >= rating
                      ? "text-yellow-500 bg-yellow-100 dark:bg-yellow-900/20"
                      : "text-neutral-400 hover:text-yellow-500"
                  }`}
                >
                  <Star
                    className={`h-8 w-8 ${
                      feedbackRating >= rating ? "fill-yellow-500" : ""
                    }`}
                  />
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <label htmlFor="feedback-comment" className="text-sm font-medium">
                Additional comments (optional)
              </label>
              <Textarea
                id="feedback-comment"
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
                placeholder="What did you like or dislike about this response?"
                className="w-full"
                rows={4}
              />
            </div>
          </div>

          <DialogFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setFeedbackDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={submitFeedback}
              disabled={feedbackRating === 0 || submittingFeedback}
            >
              {submittingFeedback ? "Submitting..." : "Submit Feedback"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
