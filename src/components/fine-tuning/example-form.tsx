"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Trash } from "lucide-react";

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ExampleFormProps {
  onSubmit: (example: {
    messages: Message[];
    tags: string[];
    source: string;
  }) => Promise<void>;
  onCancel?: () => void;
  initialMessages?: Message[];
  initialTags?: string[];
  initialSource?: string;
}

export function ExampleForm({
  onSubmit,
  onCancel,
  initialMessages = [
    { role: "system", content: "" },
    { role: "user", content: "" },
    { role: "assistant", content: "" },
  ],
  initialTags = [],
  initialSource = "manual",
}: ExampleFormProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [source, setSource] = useState<string>(initialSource);
  const [tagInput, setTagInput] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddMessage = (role: "system" | "user" | "assistant") => {
    setMessages([...messages, { role, content: "" }]);
  };

  const handleRemoveMessage = (index: number) => {
    const newMessages = [...messages];
    newMessages.splice(index, 1);
    setMessages(newMessages);
  };

  const handleMessageChange = (
    index: number,
    field: keyof Message,
    value: string
  ) => {
    const newMessages = [...messages];
    newMessages[index] = { ...newMessages[index], [field]: value };
    setMessages(newMessages);
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSubmit = async () => {
    // Validate messages
    const validMessages = messages.filter(
      (msg) => msg.role && msg.content.trim()
    );

    if (validMessages.length < 2) {
      setError("At least one user message and one assistant message are required");
      return;
    }

    // Check if there's at least one user and one assistant message
    const hasUser = validMessages.some((msg) => msg.role === "user");
    const hasAssistant = validMessages.some((msg) => msg.role === "assistant");

    if (!hasUser || !hasAssistant) {
      setError("At least one user message and one assistant message are required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        messages: validMessages,
        tags,
        source,
      });
    } catch (err) {
      console.error("Error submitting example:", err);
      setError("Failed to submit example. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Training Example</h3>
          <div className="flex space-x-2">
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual Entry</SelectItem>
                <SelectItem value="chat">From Chat</SelectItem>
                <SelectItem value="imported">Imported</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-4">
          {messages.map((message, index) => (
            <div key={index} className="space-y-2">
              <div className="flex justify-between items-center">
                <Select
                  value={message.role}
                  onValueChange={(value: "system" | "user" | "assistant") =>
                    handleMessageChange(index, "role", value)
                  }
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">System</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="assistant">Assistant</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveMessage(index)}
                  disabled={messages.length <= 2}
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </div>
              <Textarea
                value={message.content}
                onChange={(e) =>
                  handleMessageChange(index, "content", e.target.value)
                }
                placeholder={`${message.role} message`}
                rows={4}
              />
            </div>
          ))}
        </div>

        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAddMessage("user")}
          >
            <Plus className="h-4 w-4 mr-1" /> User Message
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAddMessage("assistant")}
          >
            <Plus className="h-4 w-4 mr-1" /> Assistant Message
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAddMessage("system")}
          >
            <Plus className="h-4 w-4 mr-1" /> System Message
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-medium">Tags</h4>
        <div className="flex flex-wrap gap-2 mb-2">
          {tags.map((tag) => (
            <div
              key={tag}
              className="bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded-md text-sm flex items-center"
            >
              {tag}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 ml-1 p-0"
                onClick={() => handleRemoveTag(tag)}
              >
                <Trash className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
        <div className="flex space-x-2">
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder="Add a tag"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddTag();
              }
            }}
          />
          <Button onClick={handleAddTag} disabled={!tagInput.trim()}>
            Add
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="flex justify-end space-x-2">
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            "Save Example"
          )}
        </Button>
      </div>
    </div>
  );
}
