"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, Edit, Trash, Eye } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

interface TrainingExample {
  id: string;
  messages: Message[] | string; // Can be a string (JSON) or already parsed array
  tags: string[] | string; // Can be a string (comma-separated) or already parsed array
  source: string;
  createdAt: string;
  updatedAt: string;
}

interface ExampleListProps {
  examples: TrainingExample[];
  onDelete: (id: string) => Promise<void>;
  onSelect?: (ids: string[]) => void;
  selectable?: boolean;
  selectedIds?: string[];
}

export function ExampleList({
  examples,
  onDelete,
  onSelect,
  selectable = false,
  selectedIds = [],
}: ExampleListProps) {
  const [selectedExampleIds, setSelectedExampleIds] =
    useState<string[]>(selectedIds);
  const [viewExample, setViewExample] = useState<TrainingExample | null>(null);
  const [deleteExample, setDeleteExample] = useState<TrainingExample | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const handleToggleSelect = (id: string) => {
    const newSelectedIds = selectedExampleIds.includes(id)
      ? selectedExampleIds.filter((selectedId) => selectedId !== id)
      : [...selectedExampleIds, id];

    setSelectedExampleIds(newSelectedIds);

    if (onSelect) {
      onSelect(newSelectedIds);
    }
  };

  const handleSelectAll = () => {
    const allIds = examples.map((example) => example.id);
    const newSelectedIds =
      selectedExampleIds.length === examples.length ? [] : allIds;

    setSelectedExampleIds(newSelectedIds);

    if (onSelect) {
      onSelect(newSelectedIds);
    }
  };

  const handleDelete = async () => {
    if (!deleteExample) return;

    setIsDeleting(true);

    try {
      await onDelete(deleteExample.id);

      // Remove from selected IDs if it was selected
      if (selectedExampleIds.includes(deleteExample.id)) {
        const newSelectedIds = selectedExampleIds.filter(
          (id) => id !== deleteExample.id
        );
        setSelectedExampleIds(newSelectedIds);

        if (onSelect) {
          onSelect(newSelectedIds);
        }
      }
    } catch (error) {
      console.error("Error deleting example:", error);
    } finally {
      setIsDeleting(false);
      setDeleteExample(null);
    }
  };

  // Helper function to parse messages if they're a string
  const parseMessages = (messages: Message[] | string): Message[] => {
    if (typeof messages === "string") {
      try {
        return JSON.parse(messages);
      } catch (error) {
        console.error("Error parsing messages:", error);
        return [];
      }
    }
    return messages;
  };

  // Helper function to parse tags if they're a string
  const parseTags = (tags: string[] | string): string[] => {
    if (typeof tags === "string") {
      return tags.split(",").filter((tag) => tag.trim());
    }
    return tags || [];
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "system":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
      case "user":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "assistant":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      default:
        return "bg-neutral-100 text-neutral-800 dark:bg-neutral-900 dark:text-neutral-300";
    }
  };

  if (examples.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-500">
        <p>No training examples found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {selectable && (
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="select-all"
              checked={
                selectedExampleIds.length === examples.length &&
                examples.length > 0
              }
              onCheckedChange={handleSelectAll}
            />
            <label htmlFor="select-all" className="text-sm">
              {selectedExampleIds.length === examples.length &&
              examples.length > 0
                ? "Deselect All"
                : "Select All"}
            </label>
          </div>
          <div className="text-sm text-neutral-500">
            {selectedExampleIds.length} of {examples.length} selected
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {examples.map((example) => (
          <Card key={example.id} className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-base">
                    {(() => {
                      const parsedMessages = parseMessages(example.messages);
                      if (parsedMessages.length > 0) {
                        const userMessage = parsedMessages.find(
                          (m) => m.role === "user"
                        );
                        if (userMessage) {
                          return userMessage.content.substring(0, 30) + "...";
                        }
                      }
                      return "Example " + example.id;
                    })()}
                  </CardTitle>
                  <CardDescription>
                    {formatDistanceToNow(new Date(example.createdAt), {
                      addSuffix: true,
                    })}
                    {example.source && (
                      <span className="ml-2">
                        Source:{" "}
                        <span className="font-medium">{example.source}</span>
                      </span>
                    )}
                  </CardDescription>
                </div>
                {selectable && (
                  <Checkbox
                    checked={selectedExampleIds.includes(example.id)}
                    onCheckedChange={() => handleToggleSelect(example.id)}
                  />
                )}
              </div>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="space-y-2">
                {(() => {
                  const parsedMessages = parseMessages(example.messages);
                  if (parsedMessages.length > 0) {
                    return (
                      <>
                        {parsedMessages
                          .filter((message) => message.role !== "system")
                          .slice(0, 2)
                          .map((message, index) => (
                            <div
                              key={index}
                              className="flex items-start space-x-2"
                            >
                              <div
                                className={`px-2 py-1 rounded text-xs ${getRoleColor(
                                  message.role
                                )}`}
                              >
                                {message.role}
                              </div>
                              <div className="text-sm line-clamp-1 flex-1">
                                {message.content}
                              </div>
                            </div>
                          ))}
                        {parsedMessages.filter(
                          (message) => message.role !== "system"
                        ).length > 2 && (
                          <div className="text-xs text-neutral-500">
                            +
                            {parsedMessages.filter(
                              (message) => message.role !== "system"
                            ).length - 2}{" "}
                            more messages
                          </div>
                        )}
                      </>
                    );
                  } else {
                    return (
                      <div className="text-sm text-neutral-500">
                        Messages data is not available in the correct format
                      </div>
                    );
                  }
                })()}
              </div>
              {(() => {
                const parsedTags = parseTags(example.tags);
                if (parsedTags.length > 0) {
                  return (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {parsedTags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  );
                }
                return null;
              })()}
            </CardContent>
            <CardFooter className="pt-2">
              <div className="flex space-x-2 ml-auto">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewExample(example)}
                >
                  <Eye className="h-4 w-4 mr-1" /> View
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteExample(example)}
                >
                  <Trash className="h-4 w-4 mr-1" /> Delete
                </Button>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* View Example Dialog */}
      <Dialog
        open={!!viewExample}
        onOpenChange={(open) => !open && setViewExample(null)}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Training Example</DialogTitle>
            <DialogDescription>
              Created{" "}
              {viewExample &&
                formatDistanceToNow(new Date(viewExample.createdAt), {
                  addSuffix: true,
                })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {viewExample &&
              (() => {
                const parsedMessages = parseMessages(viewExample.messages);
                if (parsedMessages.length > 0) {
                  // Find system message if it exists
                  const systemMessage = parsedMessages.find(
                    (m) => m.role === "system"
                  );

                  // Get non-system messages
                  const nonSystemMessages = parsedMessages.filter(
                    (m) => m.role !== "system"
                  );

                  return (
                    <>
                      {/* Display system message in a special format if it exists */}
                      {systemMessage && (
                        <div className="mb-4 border border-purple-200 dark:border-purple-900 rounded-md p-3 bg-purple-50 dark:bg-purple-950">
                          <div className="flex items-center mb-2">
                            <div className="px-2 py-1 rounded text-xs inline-block bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300 mr-2">
                              system
                            </div>
                            <div className="text-xs text-purple-600 dark:text-purple-400">
                              Instructions for the AI (not shown to user)
                            </div>
                          </div>
                          <div className="whitespace-pre-wrap text-sm">
                            {systemMessage.content}
                          </div>
                        </div>
                      )}

                      {/* Display conversation messages */}
                      {nonSystemMessages.map((message, index) => (
                        <div key={index} className="space-y-1">
                          <div
                            className={`px-2 py-1 rounded text-xs inline-block ${getRoleColor(
                              message.role
                            )}`}
                          >
                            {message.role}
                          </div>
                          <div className="p-3 bg-neutral-50 dark:bg-neutral-900 rounded-md whitespace-pre-wrap">
                            {message.content}
                          </div>
                        </div>
                      ))}
                    </>
                  );
                } else {
                  return (
                    <div className="text-sm text-neutral-500">
                      Messages data is not available in the correct format
                    </div>
                  );
                }
              })()}

            {viewExample &&
              (() => {
                const parsedTags = parseTags(viewExample.tags);
                if (parsedTags.length > 0) {
                  return (
                    <div className="pt-2">
                      <h4 className="text-sm font-medium mb-1">Tags</h4>
                      <div className="flex flex-wrap gap-1">
                        {parsedTags.map((tag) => (
                          <Badge key={tag} variant="outline">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewExample(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteExample}
        onOpenChange={(open) => !open && setDeleteExample(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Training Example</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this training example? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteExample(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
