"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, RefreshCw, Loader2 } from "lucide-react";

export function ApiStatus() {
  const [status, setStatus] = useState<"loading" | "valid" | "invalid" | "warning">("loading");
  const [message, setMessage] = useState<string>("");
  const [details, setDetails] = useState<string>("");
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [models, setModels] = useState<string[]>([]);

  const checkApiStatus = async () => {
    setIsChecking(true);
    setStatus("loading");
    
    try {
      const response = await fetch("/api/openai/verify-key");
      const data = await response.json();
      
      if (data.valid) {
        setStatus("valid");
        setMessage(data.message || "OpenAI API key is valid");
        setDetails(data.details || "");
        if (data.models) {
          setModels(data.models);
        }
      } else if (data.warning) {
        setStatus("warning");
        setMessage(data.warning);
        setDetails(data.details || "");
      } else {
        setStatus("invalid");
        setMessage(data.error || "OpenAI API key is invalid");
        setDetails(data.details || "");
      }
    } catch (error) {
      setStatus("invalid");
      setMessage("Error checking API key");
      setDetails("There was an error communicating with the server");
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkApiStatus();
  }, []);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-base">OpenAI API Status</CardTitle>
          <Badge
            className={
              status === "valid"
                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                : status === "warning"
                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                : status === "invalid"
                ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                : "bg-neutral-100 text-neutral-800 dark:bg-neutral-900 dark:text-neutral-300"
            }
          >
            <span className="flex items-center">
              {status === "valid" ? (
                <CheckCircle className="h-3 w-3 mr-1" />
              ) : status === "invalid" ? (
                <AlertCircle className="h-3 w-3 mr-1" />
              ) : status === "loading" ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <AlertCircle className="h-3 w-3 mr-1" />
              )}
              {status === "loading" ? "Checking..." : status}
            </span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-sm">
          {message && <p className="mb-1">{message}</p>}
          {details && <p className="text-xs text-neutral-500">{details}</p>}
          
          {status === "valid" && models.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium mb-1">Available fine-tuning models:</p>
              <div className="flex flex-wrap gap-1">
                {models.map((model) => (
                  <Badge key={model} variant="outline" className="text-xs">
                    {model}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {status === "invalid" && (
            <div className="mt-2 text-xs text-red-600">
              <p>Fine-tuning requires a valid OpenAI API key with fine-tuning permissions.</p>
            </div>
          )}
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={checkApiStatus}
          disabled={isChecking}
          className="mt-2"
        >
          {isChecking ? (
            <>
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Checking...
            </>
          ) : (
            <>
              <RefreshCw className="h-3 w-3 mr-1" />
              Check Again
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
