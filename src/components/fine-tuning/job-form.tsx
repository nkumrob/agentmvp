"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle, Zap } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { WordCountProgressSimplified } from "@/components/word-count-progress-simplified";

interface JobFormProps {
  modelConfigId: string;
  agentId: string;
  onSubmit: (data: {
    modelConfigId: string;
    baseModel: string;
    trainingExampleIds: string[];
    validationExampleIds: string[];
    hyperparameters: any;
  }) => Promise<void>;
  onCancel?: () => void;
  trainingExampleIds: string[];
  validationExampleIds?: string[];
}

export function JobForm({
  modelConfigId,
  agentId,
  onSubmit,
  onCancel,
  trainingExampleIds,
  validationExampleIds = [],
}: JobFormProps) {
  const [baseModel, setBaseModel] = useState<string>("gpt-3.5-turbo");
  const [epochs, setEpochs] = useState<number>(3);
  const [batchSize, setBatchSize] = useState<number>(4);
  const [learningRate, setLearningRate] = useState<string>("auto");
  const [useValidation, setUseValidation] = useState<boolean>(
    validationExampleIds.length > 0
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState<boolean>(true);
  const [knowledgeMetrics, setKnowledgeMetrics] = useState<any>(null);
  const [hasSufficientWords, setHasSufficientWords] = useState<boolean>(false);

  // Fetch knowledge metrics when component mounts
  useEffect(() => {
    const fetchKnowledgeMetrics = async () => {
      if (!agentId) return;

      setIsLoadingMetrics(true);
      try {
        const response = await fetch(`/api/agents/${agentId}/knowledge-status`);
        if (response.ok) {
          const data = await response.json();
          setKnowledgeMetrics(data);

          // Check if word count meets the threshold
          const wordCount = data.metrics.wordCount || 0;
          const threshold =
            data.thresholds.WORD_THRESHOLDS.FINE_TUNING || 10000;

          // Set sufficient if word count is at least the threshold
          setHasSufficientWords(wordCount >= threshold);

          console.log(
            `Word count: ${wordCount}, Threshold: ${threshold}, Sufficient: ${
              wordCount >= threshold
            }`
          );
        } else {
          console.error("Failed to fetch knowledge metrics");
        }
      } catch (err) {
        console.error("Error fetching knowledge metrics:", err);
      } finally {
        setIsLoadingMetrics(false);
      }
    };

    fetchKnowledgeMetrics();
  }, [agentId]);

  const handleSubmit = async () => {
    // Training examples are optional - we'll use knowledge sources if none are provided

    if (!hasSufficientWords) {
      setError(
        "Insufficient knowledge for fine-tuning. Add more knowledge sources to meet the minimum word count requirement."
      );
      return;
    }

    // Clear any previous errors
    setError("");

    setIsSubmitting(true);

    // Set a timeout to detect if the job creation is taking too long
    const timeoutId = setTimeout(() => {
      // If we're still submitting after 60 seconds, show a message but keep trying
      if (isSubmitting) {
        setError(
          "Job creation is taking longer than expected. This might be due to processing large files or API delays. The job will continue to process in the background. You can check the status later."
        );
      }
    }, 60000); // 60 seconds

    try {
      const hyperparameters: any = {
        n_epochs: epochs,
      };

      if (batchSize !== 4) {
        hyperparameters.batch_size = batchSize;
      }

      if (learningRate !== "auto") {
        hyperparameters.learning_rate_multiplier = parseFloat(learningRate);
      }

      // Submit the job
      await onSubmit({
        modelConfigId,
        baseModel,
        trainingExampleIds,
        validationExampleIds: useValidation ? validationExampleIds : [],
        hyperparameters,
      });

      // Clear the timeout if the job was created successfully
      clearTimeout(timeoutId);
    } catch (err) {
      // Clear the timeout if there was an error
      clearTimeout(timeoutId);

      console.error("Error creating fine-tuning job:", err);
      setError(
        err instanceof Error && err.message
          ? err.message
          : "Failed to create fine-tuning job. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="base-model">Base Model</Label>
          <Select value={baseModel} onValueChange={setBaseModel}>
            <SelectTrigger id="base-model">
              <SelectValue placeholder="Select a model" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
              <SelectItem value="gpt-4">GPT-4 (Limited Access)</SelectItem>
              <SelectItem value="babbage-002">Babbage 002</SelectItem>
              <SelectItem value="davinci-002">Davinci 002</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-neutral-500">
            The base model to fine-tune. Different models have different
            capabilities and price points.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="epochs">Number of Epochs</Label>
          <div className="flex items-center space-x-2">
            <Slider
              id="epochs"
              min={1}
              max={10}
              step={1}
              value={[epochs]}
              onValueChange={(value) => setEpochs(value[0])}
              className="flex-1"
            />
            <span className="w-12 text-center">{epochs}</span>
          </div>
          <p className="text-xs text-neutral-500">
            Number of training epochs. More epochs may improve quality but
            increase training time and cost.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="batch-size">Batch Size</Label>
          <div className="flex items-center space-x-2">
            <Slider
              id="batch-size"
              min={1}
              max={16}
              step={1}
              value={[batchSize]}
              onValueChange={(value) => setBatchSize(value[0])}
              className="flex-1"
            />
            <span className="w-12 text-center">{batchSize}</span>
          </div>
          <p className="text-xs text-neutral-500">
            Number of examples processed together. Larger batch sizes may speed
            up training but require more memory.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="learning-rate">Learning Rate</Label>
          <Select value={learningRate} onValueChange={setLearningRate}>
            <SelectTrigger id="learning-rate">
              <SelectValue placeholder="Select learning rate" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto (Recommended)</SelectItem>
              <SelectItem value="0.05">0.05 (Low)</SelectItem>
              <SelectItem value="0.1">0.1 (Medium)</SelectItem>
              <SelectItem value="0.2">0.2 (High)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-neutral-500">
            Controls how quickly the model adapts to the training data. Auto is
            recommended for most cases.
          </p>
        </div>

        {validationExampleIds.length > 0 && (
          <div className="flex items-center space-x-2 pt-2">
            <Switch
              id="use-validation"
              checked={useValidation}
              onCheckedChange={setUseValidation}
            />
            <Label htmlFor="use-validation">
              Use validation set ({validationExampleIds.length} examples)
            </Label>
          </div>
        )}

        {/* Knowledge Word Count */}
        <div className="pt-2">
          <div className="p-4 border rounded-md">
            <h4 className="font-medium mb-2">Knowledge Source Status</h4>
            {isLoadingMetrics ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Loading knowledge metrics...</span>
              </div>
            ) : knowledgeMetrics ? (
              <div className="space-y-3">
                <WordCountProgressSimplified
                  currentCount={knowledgeMetrics.metrics.wordCount || 0}
                  showStrength={true}
                  showLabels={true}
                />

                {!hasSufficientWords && (
                  <Alert variant="destructive" className="mt-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Insufficient Knowledge</AlertTitle>
                    <AlertDescription>
                      Your agent needs at least{" "}
                      {knowledgeMetrics.thresholds.WORD_THRESHOLDS.FINE_TUNING.toLocaleString()}{" "}
                      words of knowledge for fine-tuning. Current count:{" "}
                      {knowledgeMetrics.metrics.wordCount.toLocaleString()}{" "}
                      words.
                    </AlertDescription>
                  </Alert>
                )}

                {hasSufficientWords && (
                  <Alert className="mt-2">
                    {knowledgeMetrics.metrics.wordCount >=
                    knowledgeMetrics.thresholds.WORD_THRESHOLDS
                      .EXCELLENT_FINE_TUNING ? (
                      <Zap className="h-4 w-4 text-indigo-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-green-500" />
                    )}
                    <AlertTitle>
                      {knowledgeMetrics.metrics.wordCount >=
                      knowledgeMetrics.thresholds.WORD_THRESHOLDS
                        .EXCELLENT_FINE_TUNING
                        ? "Excellent Fine-tuning Potential"
                        : "Ready for Fine-tuning"}
                    </AlertTitle>
                    <AlertDescription>
                      {knowledgeMetrics.metrics.wordCount >=
                      knowledgeMetrics.thresholds.WORD_THRESHOLDS
                        .EXCELLENT_FINE_TUNING ? (
                        <>
                          Your agent has an excellent word count of{" "}
                          {knowledgeMetrics.metrics.wordCount.toLocaleString()}{" "}
                          words.
                          <span className="block mt-1 text-indigo-600 font-medium">
                            This will produce high-quality fine-tuning results
                            with better understanding and responses.
                          </span>
                        </>
                      ) : knowledgeMetrics.metrics.wordCount >=
                        knowledgeMetrics.thresholds.FINE_TUNING * 1.2 ? (
                        <>
                          Your agent has a strong word count of{" "}
                          {knowledgeMetrics.metrics.wordCount.toLocaleString()}{" "}
                          words.
                          <span className="block mt-1 text-green-600 font-medium">
                            This will produce good fine-tuning results. Adding
                            more content would further improve quality.
                          </span>
                        </>
                      ) : (
                        <>
                          Your agent has sufficient knowledge for fine-tuning
                          with{" "}
                          {knowledgeMetrics.metrics.wordCount.toLocaleString()}{" "}
                          words.
                          <span className="block mt-1 text-yellow-600 font-medium">
                            Consider adding more content to improve fine-tuning
                            quality.
                          </span>
                        </>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            ) : (
              <p className="text-sm text-neutral-500">
                Unable to load knowledge metrics.
              </p>
            )}
          </div>
        </div>

        <div className="pt-2">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md text-sm">
            <p className="font-medium text-blue-800 dark:text-blue-300">
              Training Summary
            </p>
            <ul className="mt-2 space-y-1 text-blue-700 dark:text-blue-400">
              <li>• Knowledge sources will be used for fine-tuning</li>
              {trainingExampleIds.length > 0 && (
                <li>
                  • {trainingExampleIds.length} additional training examples
                </li>
              )}
              {useValidation && validationExampleIds.length > 0 && (
                <li>• {validationExampleIds.length} validation examples</li>
              )}
              <li>• Base model: {baseModel}</li>
              <li>• {epochs} training epochs</li>
            </ul>
          </div>
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
              Creating Job...
            </>
          ) : (
            "Create Fine-tuning Job"
          )}
        </Button>
      </div>
    </div>
  );
}
