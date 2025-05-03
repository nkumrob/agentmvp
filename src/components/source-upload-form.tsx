"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertCircle,
  FileText,
  Link as LinkIcon,
  Youtube,
  Upload,
  Loader2,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
// Import the function directly from the module to avoid importing the entire content-extractors
// which might include Node.js specific code
import { detectSourceTypeFromFile } from "@/lib/content-extractors/utils";

interface SourceUploadFormProps {
  agentId: string;
  onSuccess?: () => void;
}

export function SourceUploadForm({
  agentId,
  onSuccess,
}: SourceUploadFormProps) {
  const [activeTab, setActiveTab] = useState("text");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Form states
  const [textName, setTextName] = useState("");
  const [textContent, setTextContent] = useState("");

  const [urlName, setUrlName] = useState("");
  const [urlContent, setUrlContent] = useState("");

  const [youtubeName, setYoutubeName] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");

  const [fileName, setFileName] = useState("");
  const [fileData, setFileData] = useState<File | null>(null);

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textContent) {
      setError("Content is required");
      return;
    }

    await uploadSource({
      name: textName || `Text (${new Date().toLocaleDateString()})`, // Use default name if not provided
      sourceType: "text",
      content: textContent,
    });
  };

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlContent) {
      setError("URL is required");
      return;
    }

    await uploadSource({
      name: urlName || urlContent, // Use URL as name if not provided
      sourceType: "url",
      sourceUrl: urlContent,
    });
  };

  const handleYoutubeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!youtubeUrl) {
      setError("YouTube URL is required");
      return;
    }

    await uploadSource({
      name: youtubeName || youtubeUrl, // Use URL as name if not provided
      sourceType: "youtube",
      sourceUrl: youtubeUrl,
    });
  };

  const handleFileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileData) {
      setError("Please select a file");
      return;
    }

    const name = fileName || fileData.name;
    const sourceType = detectSourceTypeFromFile(fileData.name, fileData.type);

    // Read file as base64
    const reader = new FileReader();
    reader.onload = async (event) => {
      if (event.target?.result) {
        const base64Content = (event.target.result as string).split(",")[1];

        await uploadSource({
          name,
          sourceType,
          content: base64Content,
        });
      }
    };
    reader.onerror = () => {
      setError("Error reading file");
    };

    reader.readAsDataURL(fileData);
  };

  const uploadSource = async (data: any) => {
    setIsUploading(true);
    setError(null);

    try {
      const response = await fetch(`/api/agents/${agentId}/sources`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to upload source");
      }

      // Reset form
      setTextName("");
      setTextContent("");
      setUrlName("");
      setUrlContent("");
      setYoutubeName("");
      setYoutubeUrl("");
      setFileName("");
      setFileData(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      toast({
        title: "Source uploaded successfully",
        description: "Your knowledge source is being processed.",
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error uploading source:", error);
      setError(error.message || "Failed to upload source");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileData(file);
      if (!fileName) {
        setFileName(file.name);
      }
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Add Knowledge Source</CardTitle>
        <CardDescription>
          Add content to your agent's knowledge base
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="text">
              <FileText className="h-4 w-4 mr-2" />
              Text
            </TabsTrigger>
            <TabsTrigger value="url">
              <LinkIcon className="h-4 w-4 mr-2" />
              Website
            </TabsTrigger>
            <TabsTrigger value="youtube">
              <Youtube className="h-4 w-4 mr-2" />
              YouTube
            </TabsTrigger>
            <TabsTrigger value="file">
              <Upload className="h-4 w-4 mr-2" />
              File
            </TabsTrigger>
          </TabsList>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <TabsContent value="text">
            <form onSubmit={handleTextSubmit}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="text-name">Name (Optional)</Label>
                  <Input
                    id="text-name"
                    placeholder="Document name"
                    value={textName}
                    onChange={(e) => setTextName(e.target.value)}
                  />
                  <p className="text-sm text-neutral-500 mt-1">
                    Leave blank to use a default name
                  </p>
                </div>
                <div>
                  <Label htmlFor="text-content">Content</Label>
                  <Textarea
                    id="text-content"
                    placeholder="Enter text content..."
                    rows={10}
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" disabled={isUploading}>
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    "Add Text"
                  )}
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="url">
            <form onSubmit={handleUrlSubmit}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="url-name">Name (Optional)</Label>
                  <Input
                    id="url-name"
                    placeholder="Website name"
                    value={urlName}
                    onChange={(e) => setUrlName(e.target.value)}
                  />
                  <p className="text-sm text-neutral-500 mt-1">
                    Leave blank to use the URL as the name
                  </p>
                </div>
                <div>
                  <Label htmlFor="url-content">URL</Label>
                  <Input
                    id="url-content"
                    placeholder="https://example.com"
                    type="url"
                    value={urlContent}
                    onChange={(e) => {
                      setUrlContent(e.target.value);
                      // Auto-populate name with domain if URL is valid and name is empty
                      if (e.target.value && !urlName) {
                        try {
                          const url = new URL(e.target.value);
                          const domain = url.hostname.replace("www.", "");
                          setUrlName(domain);
                        } catch (err) {
                          // Invalid URL, do nothing
                        }
                      }
                    }}
                    required
                  />
                </div>
                <Button type="submit" disabled={isUploading}>
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    "Add Website"
                  )}
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="youtube">
            <form onSubmit={handleYoutubeSubmit}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="youtube-name">Name (Optional)</Label>
                  <Input
                    id="youtube-name"
                    placeholder="Video name"
                    value={youtubeName}
                    onChange={(e) => setYoutubeName(e.target.value)}
                  />
                  <p className="text-sm text-neutral-500 mt-1">
                    Leave blank to use the video title (auto-detected)
                  </p>
                </div>
                <div>
                  <Label htmlFor="youtube-url">YouTube URL</Label>
                  <Input
                    id="youtube-url"
                    placeholder="https://www.youtube.com/watch?v=..."
                    type="url"
                    value={youtubeUrl}
                    onChange={(e) => {
                      setYoutubeUrl(e.target.value);
                      // Auto-fetch YouTube title if URL is valid
                      if (
                        (e.target.value &&
                          e.target.value.includes("youtube.com/watch?v=")) ||
                        e.target.value.includes("youtu.be/")
                      ) {
                        // Extract video ID
                        let videoId = "";
                        if (e.target.value.includes("youtube.com/watch?v=")) {
                          const urlParams = new URLSearchParams(
                            e.target.value.split("?")[1]
                          );
                          videoId = urlParams.get("v") || "";
                        } else if (e.target.value.includes("youtu.be/")) {
                          videoId = e.target.value
                            .split("youtu.be/")[1]
                            .split("?")[0];
                        }

                        if (videoId && !youtubeName) {
                          // Fetch video title using oEmbed API
                          fetch(
                            `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
                          )
                            .then((response) => response.json())
                            .then((data) => {
                              if (data.title) {
                                setYoutubeName(data.title);
                              }
                            })
                            .catch((err) => {
                              console.error(
                                "Error fetching YouTube title:",
                                err
                              );
                            });
                        }
                      }
                    }}
                    required
                  />
                </div>
                <Button type="submit" disabled={isUploading}>
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Extracting transcript...
                    </>
                  ) : (
                    "Add YouTube Video"
                  )}
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="file">
            <form onSubmit={handleFileSubmit}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="file-name">Name (Optional)</Label>
                  <Input
                    id="file-name"
                    placeholder="Custom file name"
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                  />
                  <p className="text-sm text-neutral-500 mt-1">
                    Leave blank to use the file name
                  </p>
                </div>
                <div>
                  <Label htmlFor="file-upload">File</Label>
                  <Input
                    id="file-upload"
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".pdf,.txt,.jpg,.jpeg,.png,.mp3,.wav,.ogg"
                    required
                  />
                  <p className="text-sm text-neutral-500 mt-1">
                    Supported formats: PDF, TXT, JPG, PNG, MP3, WAV, OGG
                  </p>
                </div>
                <Button type="submit" disabled={isUploading}>
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    "Upload File"
                  )}
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between border-t pt-4">
        <p className="text-sm text-neutral-500">
          Content will be processed and added to your agent's knowledge base.
        </p>
      </CardFooter>
    </Card>
  );
}
