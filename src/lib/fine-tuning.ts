import { OpenAI } from "openai";
import { PrismaClient } from "@prisma/client";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Validate OpenAI API key
if (!process.env.OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY is not set in environment variables");
}

console.log(
  "OpenAI API key configured:",
  process.env.OPENAI_API_KEY ? "Yes (key exists)" : "No (missing key)"
);

// Initialize Prisma client
const prisma = new PrismaClient();

/**
 * Format training examples for OpenAI fine-tuning
 */
export function formatTrainingData(examples: any[]) {
  return examples.map((example) => {
    // Parse the messages JSON string
    const messages =
      typeof example.messages === "string"
        ? JSON.parse(example.messages)
        : example.messages;

    // Ensure messages are in the correct format
    return {
      messages: messages.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      })),
    };
  });
}

/**
 * Generate high-quality training examples from knowledge sources
 *
 * This function implements best practices for creating training examples:
 * 1. Properly chunks content into meaningful segments
 * 2. Creates diverse question types
 * 3. Ensures examples follow OpenAI's fine-tuning format
 * 4. Balances examples across knowledge sources
 */
async function generateExamplesFromKnowledgeSources(
  knowledgeSources: any[],
  agent: any
) {
  const examples = [];
  const agentName = agent?.name || "AI Assistant";
  const agentDescription = agent?.description || "";

  // Get tone rules from persona
  const toneRules = agent?.persona?.toneRules
    ? typeof agent.persona.toneRules === "string"
      ? agent.persona.toneRules
      : JSON.stringify(agent.persona.toneRules)
    : "";

  // Create system message
  const systemMessage = {
    role: "system",
    content: `You are ${agentName}. ${agentDescription} ${toneRules}`,
  };

  // Define question templates for diversity
  const questionTemplates = [
    (topic: string) => `Can you explain about ${topic}?`,
    (topic: string) => `What can you tell me about ${topic}?`,
    (topic: string) =>
      `I'm interested in learning more about ${topic}. What can you share?`,
    (topic: string) => `What are the key points about ${topic}?`,
    (topic: string) => `How would you summarize information about ${topic}?`,
    (topic: string) => `Tell me about ${topic}.`,
  ];

  // Define maximum examples per source to ensure balance
  const MAX_EXAMPLES_PER_SOURCE = 3;

  // Define maximum total examples to avoid exceeding OpenAI limits
  // OpenAI recommends 50-100 examples for most use cases
  const MAX_TOTAL_EXAMPLES = 50;

  // Track how many examples we've created
  let exampleCount = 0;

  // Process each knowledge source
  for (const source of knowledgeSources) {
    if (!source.content || source.content.trim() === "") continue;

    console.log(`Processing knowledge source: ${source.name}`);

    // Split content into meaningful chunks (paragraphs or sections)
    // Use a smaller chunk size (1000 chars) to ensure quality examples
    const chunks = splitContentIntoChunks(source.content, 1000);
    console.log(`Split into ${chunks.length} chunks`);

    // Limit chunks per source to ensure balance
    const sourceChunks = chunks.slice(0, MAX_EXAMPLES_PER_SOURCE);

    // Create examples from each chunk
    for (const chunk of sourceChunks) {
      // Stop if we've reached the maximum total examples
      if (exampleCount >= MAX_TOTAL_EXAMPLES) {
        console.log(`Reached maximum total examples (${MAX_TOTAL_EXAMPLES})`);
        break;
      }

      // Extract a meaningful topic from the chunk
      const topic = extractTopicFromChunk(chunk, source.name);

      // Select a random question template
      const questionTemplate =
        questionTemplates[Math.floor(Math.random() * questionTemplates.length)];
      const question = questionTemplate(topic);

      // Create a high-quality answer based on the chunk
      const answer = createAnswerFromChunk(chunk, topic);

      // Add the example
      examples.push({
        messages: [
          systemMessage,
          { role: "user", content: question },
          { role: "assistant", content: answer },
        ],
      });

      exampleCount++;
    }

    // Stop if we've reached the maximum total examples
    if (exampleCount >= MAX_TOTAL_EXAMPLES) {
      break;
    }
  }

  console.log(
    `Generated ${examples.length} high-quality examples from knowledge sources`
  );

  // If we couldn't generate any examples, create a few generic ones
  if (examples.length === 0) {
    console.log(
      "No examples generated from knowledge sources, creating generic examples"
    );
    examples.push({
      messages: [
        systemMessage,
        { role: "user", content: "Hello, how can you help me?" },
        {
          role: "assistant",
          content: `Hello! I'm ${agentName}, and I'm here to assist you. ${agentDescription} How can I help you today?`,
        },
      ],
    });

    examples.push({
      messages: [
        systemMessage,
        { role: "user", content: "What can you do?" },
        {
          role: "assistant",
          content: `As ${agentName}, I can ${agentDescription} I'm designed to be helpful, harmless, and honest in my interactions. What would you like to know?`,
        },
      ],
    });
  }

  return examples;
}

/**
 * Extract a meaningful topic from a content chunk
 */
function extractTopicFromChunk(chunk: string, defaultName: string): string {
  // Try to identify a topic from the first sentence
  const firstSentence = chunk.split(/[.!?](\s|$)/)[0];

  // Look for nouns or key phrases (simplified approach)
  const words = firstSentence.split(/\s+/);
  const longWords = words.filter((word) => word.length > 5);

  if (longWords.length > 0) {
    // Use a random long word as the topic
    return longWords[Math.floor(Math.random() * longWords.length)];
  }

  // Fall back to the source name if we can't extract a topic
  return defaultName;
}

/**
 * Create a high-quality answer from a content chunk
 */
function createAnswerFromChunk(chunk: string, topic: string): string {
  // Format the chunk into a coherent answer
  // Limit to 1000 characters to ensure it's not too long
  const MAX_ANSWER_LENGTH = 1000;

  // Clean up the chunk
  let cleanedChunk = chunk.trim();

  // Truncate if necessary
  if (cleanedChunk.length > MAX_ANSWER_LENGTH) {
    cleanedChunk = cleanedChunk.substring(0, MAX_ANSWER_LENGTH) + "...";
  }

  // Add an introduction and conclusion
  const introduction = `Here's what I know about ${topic}:`;
  const conclusion =
    "I hope this information is helpful. Let me know if you have any other questions!";

  return `${introduction}\n\n${cleanedChunk}\n\n${conclusion}`;
}

/**
 * Split content into manageable chunks
 */
function splitContentIntoChunks(content: string, maxChunkSize: number) {
  // Use a smaller chunk size to ensure we don't exceed limits
  const actualMaxChunkSize = Math.min(maxChunkSize, 1000);

  const chunks = [];
  let currentChunk = "";

  // Split by paragraphs
  const paragraphs = content.split(/\n\s*\n/);

  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length > actualMaxChunkSize) {
      if (currentChunk) {
        chunks.push(currentChunk);
        currentChunk = "";
      }

      // If a single paragraph is too long, split it further
      if (paragraph.length > actualMaxChunkSize) {
        const sentences = paragraph.split(/[.!?]\s+/);
        for (const sentence of sentences) {
          if (currentChunk.length + sentence.length > actualMaxChunkSize) {
            if (currentChunk) {
              chunks.push(currentChunk);
              currentChunk = "";
            }
            // If a single sentence is still too long, split it into smaller parts
            if (sentence.length > actualMaxChunkSize) {
              // Split by words and create chunks of words
              const words = sentence.split(/\s+/);
              let wordChunk = "";

              for (const word of words) {
                if (wordChunk.length + word.length + 1 > actualMaxChunkSize) {
                  if (wordChunk) {
                    chunks.push(wordChunk);
                    wordChunk = "";
                  }
                }
                wordChunk += (wordChunk ? " " : "") + word;
              }

              if (wordChunk) {
                chunks.push(wordChunk);
              }
            } else {
              currentChunk = sentence;
            }
          } else {
            currentChunk += (currentChunk ? " " : "") + sentence;
          }
        }
      } else {
        currentChunk = paragraph;
      }
    } else {
      currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  // Limit the total number of chunks to avoid exceeding size limits
  const MAX_CHUNKS = 50;
  if (chunks.length > MAX_CHUNKS) {
    console.log(`Limiting chunks from ${chunks.length} to ${MAX_CHUNKS}`);
    return chunks.slice(0, MAX_CHUNKS);
  }

  return chunks;
}

/**
 * Generate a question from content
 */
function generateQuestionFromContent(content: string, sourceName: string) {
  // Extract a topic from the content
  const words = content.split(/\s+/).filter((word) => word.length > 4);
  const randomWord =
    words[Math.floor(Math.random() * words.length)] || "this topic";

  // Create different question templates
  const questions = [
    `Can you explain about ${randomWord}?`,
    `What can you tell me about ${sourceName}?`,
    `I'm interested in learning more about ${randomWord}. What can you share?`,
    `What are the key points about ${sourceName}?`,
    `How would you summarize the information about ${randomWord}?`,
    `Can you provide details on ${randomWord}?`,
    `What should I know about ${sourceName}?`,
    `Tell me about ${randomWord}.`,
    `I need information on ${randomWord}. Can you help?`,
    `What's important to understand about ${sourceName}?`,
  ];

  return questions[Math.floor(Math.random() * questions.length)];
}

/**
 * Generate an answer from content
 */
function generateAnswerFromContent(content: string, sourceName: string) {
  // Create intro phrases
  const intros = [
    "Based on my knowledge,",
    "According to the information I have,",
    "From what I understand,",
    "Here's what I know about this topic:",
    "I can share the following information:",
    "Let me explain this for you:",
    "Here's an explanation:",
    "I'd be happy to help with that.",
    "Great question!",
    "That's an interesting topic.",
  ];

  // Create conclusion phrases
  const conclusions = [
    `This information comes from ${sourceName}.`,
    `I found this in ${sourceName}.`,
    `The source for this is ${sourceName}.`,
    `This is based on content from ${sourceName}.`,
    `Hope this helps! The information is from ${sourceName}.`,
    `Let me know if you need more details. This comes from ${sourceName}.`,
    `Is there anything specific about this you'd like me to elaborate on? (Source: ${sourceName})`,
    `I can provide more details if needed. This information is from ${sourceName}.`,
  ];

  // Select random intro and conclusion
  const intro = intros[Math.floor(Math.random() * intros.length)];
  const conclusion =
    conclusions[Math.floor(Math.random() * conclusions.length)];

  // Format the content - limit to a maximum length to avoid exceeding size limits
  const MAX_CONTENT_LENGTH = 500;
  let formattedContent = content.trim();

  if (formattedContent.length > MAX_CONTENT_LENGTH) {
    // Truncate the content
    formattedContent =
      formattedContent.substring(0, MAX_CONTENT_LENGTH) + "...";
  }

  if (formattedContent.length > 200) {
    // Try to break into paragraphs
    const sentences = formattedContent.split(/[.!?]\s+/);
    if (sentences.length > 3) {
      // Limit the number of sentences
      const maxSentences = Math.min(sentences.length, 10);
      const paragraphSize = Math.ceil(maxSentences / 3);
      formattedContent = "";
      for (let i = 0; i < maxSentences; i++) {
        formattedContent += sentences[i] + ". ";
        if ((i + 1) % paragraphSize === 0 && i < maxSentences - 1) {
          formattedContent += "\n\n";
        }
      }
    }
  }

  return `${intro}\n\n${formattedContent}\n\n${conclusion}`;
}

/**
 * Create a fine-tuning job
 */
export async function createFineTuningJob(
  userId: string,
  modelConfigId: string,
  baseModel: string,
  trainingExamples: any[] = [],
  validationExamples: any[] = [],
  hyperparameters: any = {},
  knowledgeSources: any[] = [],
  agent: any = null
) {
  try {
    // Create a new fine-tuning job in the database
    const fineTuningJob = await prisma.fineTuningJob.create({
      data: {
        status: "pending",
        model: baseModel,
        hyperparameters: JSON.stringify(hyperparameters),
        modelConfigId,
        userId,
      },
    });

    // Generate high-quality examples from knowledge sources
    let allTrainingExamples = [...trainingExamples];

    if (knowledgeSources && knowledgeSources.length > 0 && agent) {
      console.log(
        `Generating examples from ${knowledgeSources.length} knowledge sources`
      );

      try {
        const knowledgeExamples = await generateExamplesFromKnowledgeSources(
          knowledgeSources,
          agent
        );

        console.log(
          `Generated ${knowledgeExamples.length} examples from knowledge sources`
        );

        // Add knowledge examples to training examples
        allTrainingExamples = [...allTrainingExamples, ...knowledgeExamples];
      } catch (error) {
        console.error(
          "Error generating examples from knowledge sources:",
          error
        );
        // Continue with any existing training examples
      }
    }

    // If we don't have any examples, create some generic ones
    if (allTrainingExamples.length === 0) {
      console.log("No training examples available, creating generic examples");

      const systemContent = agent?.name
        ? `You are ${agent.name}. ${agent?.description || ""}`
        : "You are a helpful assistant.";

      allTrainingExamples = [
        {
          messages: [
            { role: "system", content: systemContent },
            { role: "user", content: "Hello, how can you help me?" },
            {
              role: "assistant",
              content: `Hello! I'm here to assist you. How can I help you today?`,
            },
          ],
        },
        {
          messages: [
            { role: "system", content: systemContent },
            { role: "user", content: "What can you do?" },
            {
              role: "assistant",
              content:
                "I can provide information, answer questions, assist with various tasks, and engage in conversations on a wide range of topics. I'm designed to be helpful, informative, and supportive. What would you like to know or discuss today?",
            },
          ],
        },
      ];
    }

    console.log(`Total training examples: ${allTrainingExamples.length}`);

    // Format training data according to OpenAI's requirements
    const formattedTrainingData = formatTrainingData(allTrainingExamples);
    console.log(`Formatted ${formattedTrainingData.length} training examples`);

    // Implement proper batching strategy for large datasets
    // OpenAI recommends 50-100 examples for most fine-tuning cases
    const RECOMMENDED_BATCH_SIZE = 100;

    // If we have more examples than recommended, select a diverse subset
    let batchedTrainingData = formattedTrainingData;
    if (formattedTrainingData.length > RECOMMENDED_BATCH_SIZE) {
      console.log(
        `Selecting ${RECOMMENDED_BATCH_SIZE} diverse examples from ${formattedTrainingData.length} total examples`
      );

      // Simple strategy: take examples evenly distributed across the dataset
      batchedTrainingData = [];
      const step = formattedTrainingData.length / RECOMMENDED_BATCH_SIZE;

      for (let i = 0; i < RECOMMENDED_BATCH_SIZE; i++) {
        const index = Math.min(
          Math.floor(i * step),
          formattedTrainingData.length - 1
        );
        batchedTrainingData.push(formattedTrainingData[index]);
      }
    }

    console.log(`Using ${batchedTrainingData.length} examples for fine-tuning`);

    // Convert to JSONL format (one JSON object per line)
    const jsonlContent = batchedTrainingData
      .map((example) => JSON.stringify(example))
      .join("\n");

    // Check the size of the training data
    const buffer = Buffer.from(jsonlContent, "utf-8");
    const sizeInKB = buffer.length / 1024;
    const sizeInMB = sizeInKB / 1024;

    console.log(
      `Training data size: ${sizeInKB.toFixed(2)} KB (${sizeInMB.toFixed(
        2
      )} MB)`
    );

    // OpenAI has a limit of ~100MB for training files, but we'll use a lower limit to be safe
    const MAX_TRAINING_DATA_SIZE_MB = 80;

    if (sizeInMB > MAX_TRAINING_DATA_SIZE_MB) {
      console.error(
        `Training data size (${sizeInMB.toFixed(
          2
        )} MB) exceeds the maximum allowed size (${MAX_TRAINING_DATA_SIZE_MB} MB)`
      );

      // Update the job status to failed
      await prisma.fineTuningJob.update({
        where: { id: fineTuningJob.id },
        data: {
          status: "failed",
          completedAt: new Date(),
        },
      });

      throw new Error(
        `Training data is too large (${sizeInMB.toFixed(
          2
        )} MB). Please reduce the amount of knowledge sources or training examples.`
      );
    }

    // Create a file with the training data
    let trainingFile;
    try {
      console.log("Creating training file with OpenAI...");

      // Create a File object from the buffer with proper metadata
      const file = new File([buffer], "training_data.jsonl", {
        type: "application/json",
      });

      // Create the file with OpenAI
      trainingFile = await openai.files.create({
        file: file,
        purpose: "fine-tune",
      });

      console.log(`Successfully created training file: ${trainingFile.id}`);

      // Wait for the file to be processed by OpenAI
      console.log("Waiting for file to be processed by OpenAI...");

      // Implement a more robust polling mechanism with exponential backoff
      let fileStatus = "processing";
      let attempts = 0;
      const MAX_ATTEMPTS = 12; // More attempts with longer total wait time
      const BASE_DELAY = 5000; // Start with 5 seconds

      while (fileStatus === "processing" && attempts < MAX_ATTEMPTS) {
        attempts++;

        // Calculate delay with exponential backoff (5s, 10s, 20s, etc.)
        const delay = BASE_DELAY * Math.pow(2, attempts - 1);
        console.log(
          `Waiting ${
            delay / 1000
          } seconds before checking file status (attempt ${attempts}/${MAX_ATTEMPTS})...`
        );

        // Wait before checking
        await new Promise((resolve) => setTimeout(resolve, delay));

        // Check file status
        try {
          const fileInfo = await openai.files.retrieve(trainingFile.id);

          // The status property is deprecated, but we can check if the file exists
          console.log(
            `File check (attempt ${attempts}): File exists with ID ${fileInfo.id}`
          );

          // If we can retrieve the file without error, consider it ready after a few attempts
          // This is a workaround since the status property is deprecated
          if (attempts >= 3) {
            fileStatus = "ready";
            console.log(
              `File is considered ready after ${attempts} successful checks`
            );
            break;
          }

          // If we've reached the maximum attempts but the file is still processing,
          // we'll continue anyway and rely on the retry logic during job creation
          if (attempts >= MAX_ATTEMPTS) {
            console.log(
              "Maximum attempts reached, continuing with job creation anyway"
            );
            break;
          }
        } catch (error) {
          console.error(
            `Error checking file status (attempt ${attempts}):`,
            error
          );

          // If we can't retrieve the file after multiple attempts, there might be an issue
          if (attempts >= MAX_ATTEMPTS / 2) {
            console.error(
              "Multiple failures retrieving file, there might be an issue with the file"
            );
          }
        }
      }

      // Add a final safety delay before proceeding
      console.log(
        "Adding a final safety delay of 10 seconds before job creation..."
      );
      await new Promise((resolve) => setTimeout(resolve, 10000));
    } catch (error: any) {
      console.error("Error creating training file:", error);

      // Update the job status to failed
      await prisma.fineTuningJob.update({
        where: { id: fineTuningJob.id },
        data: {
          status: "failed",
          completedAt: new Date(),
        },
      });

      const errorMessage = error?.message || String(error);

      if (errorMessage.includes("API key")) {
        throw new Error(
          "Invalid OpenAI API key. Please check your configuration."
        );
      } else if (errorMessage.includes("exceeds the capacity limit")) {
        throw new Error(
          `Training data is too large. Please reduce the amount of knowledge sources or training examples.`
        );
      } else {
        throw new Error(`Failed to create training file: ${errorMessage}`);
      }
    }

    // Create a validation file if we have enough examples
    // OpenAI recommends using a validation file to evaluate model performance
    let validationFile = null;

    // Only create a validation file if we have enough examples
    // We'll use 10% of the examples for validation, with a minimum of 5 examples
    if (batchedTrainingData.length >= 50) {
      try {
        console.log("Creating validation file with OpenAI...");

        // Select 10% of examples for validation
        const validationCount = Math.max(
          5,
          Math.floor(batchedTrainingData.length * 0.1)
        );
        const validationData = batchedTrainingData.slice(0, validationCount);

        console.log(`Using ${validationData.length} examples for validation`);

        // Convert to JSONL format
        const validationJsonl = validationData
          .map((example) => JSON.stringify(example))
          .join("\n");

        // Create validation file
        const validationBuffer = Buffer.from(validationJsonl, "utf-8");
        const validationFileObj = new File(
          [validationBuffer],
          "validation_data.jsonl",
          {
            type: "application/json",
          }
        );

        // Upload validation file
        validationFile = await openai.files.create({
          file: validationFileObj,
          purpose: "fine-tune",
        });

        console.log(
          `Successfully created validation file: ${validationFile.id}`
        );

        // Wait for validation file processing
        console.log("Validation file uploaded to OpenAI.");

        // Use the same robust polling mechanism for validation file
        let validationFileStatus = "processing";
        let validationAttempts = 0;
        const VALIDATION_MAX_ATTEMPTS = 8; // Fewer attempts for validation file
        const VALIDATION_BASE_DELAY = 5000; // 5 seconds base delay

        while (
          validationFileStatus === "processing" &&
          validationAttempts < VALIDATION_MAX_ATTEMPTS
        ) {
          validationAttempts++;

          // Calculate delay with exponential backoff
          const delay =
            VALIDATION_BASE_DELAY * Math.pow(1.5, validationAttempts - 1); // Slightly less aggressive backoff
          console.log(
            `Waiting ${
              delay / 1000
            } seconds before checking validation file (attempt ${validationAttempts}/${VALIDATION_MAX_ATTEMPTS})...`
          );

          // Wait before checking
          await new Promise((resolve) => setTimeout(resolve, delay));

          // Check validation file
          try {
            const fileInfo = await openai.files.retrieve(validationFile.id);
            console.log(
              `Validation file check (attempt ${validationAttempts}): File exists with ID ${fileInfo.id}`
            );

            // Consider it ready after a few successful checks
            if (validationAttempts >= 2) {
              validationFileStatus = "ready";
              console.log(
                `Validation file is considered ready after ${validationAttempts} successful checks`
              );
              break;
            }
          } catch (error) {
            console.error(
              `Error checking validation file (attempt ${validationAttempts}):`,
              error
            );

            // If we can't retrieve the file after multiple attempts, skip using it
            if (validationAttempts >= VALIDATION_MAX_ATTEMPTS / 2) {
              console.error(
                "Multiple failures retrieving validation file, will continue without it"
              );
              validationFile = null;
              break;
            }
          }
        }

        // If we still have a validation file, add a final safety delay
        if (validationFile) {
          console.log(
            "Adding a final safety delay of 5 seconds for validation file..."
          );
          await new Promise((resolve) => setTimeout(resolve, 5000));
        } else {
          console.log("Continuing without validation file");
        }
      } catch (error) {
        console.error("Error creating validation file:", error);
        console.log("Continuing without validation file");
        validationFile = null;
      }
    } else {
      console.log(
        "Not enough examples for validation, skipping validation file"
      );
    }

    console.log(
      `Creating OpenAI fine-tuning job with training file: ${trainingFile.id}`
    );
    console.log(`Base model: ${baseModel}`);
    if (validationFile) {
      console.log(`Using validation file: ${validationFile.id}`);
    } else {
      console.log("No validation file will be used");
    }

    // Create the fine-tuning job with OpenAI
    try {
      // Prepare job creation parameters
      const jobParams: any = {
        training_file: trainingFile.id,
        model: baseModel,
        hyperparameters,
      };

      // Add validation file if available
      if (validationFile) {
        jobParams.validation_file = validationFile.id;
      }

      // Create the job with improved retry logic
      let openaiJob;
      let retryCount = 0;
      const maxRetries = 8; // Increase max retries even more

      // More aggressive exponential backoff delays (in ms)
      // Starting with 10s and going up to 2 minutes
      const JOB_BASE_DELAY = 10000; // 10 seconds

      console.log(
        "Starting fine-tuning job creation with enhanced retry logic"
      );
      console.log(`Maximum ${maxRetries} attempts with exponential backoff`);

      while (retryCount < maxRetries) {
        try {
          retryCount++;

          // Calculate delay with exponential backoff
          const delay =
            retryCount === 1 ? 0 : JOB_BASE_DELAY * Math.pow(2, retryCount - 2);

          if (retryCount > 1) {
            console.log(
              `Waiting ${delay / 1000} seconds before attempt ${retryCount}...`
            );
            await new Promise((resolve) => setTimeout(resolve, delay));
          }

          console.log(
            `Attempt ${retryCount}/${maxRetries} to create fine-tuning job...`
          );
          console.log(`Using training file: ${jobParams.training_file}`);
          if (jobParams.validation_file) {
            console.log(`Using validation file: ${jobParams.validation_file}`);
          }

          // Create the fine-tuning job
          openaiJob = await openai.fineTuning.jobs.create(jobParams);

          console.log(
            `Successfully created OpenAI fine-tuning job: ${openaiJob.id}`
          );

          // Update the job in the database with the OpenAI job ID immediately after creation
          // This ensures we don't lose the job ID if something fails later
          await prisma.fineTuningJob.update({
            where: { id: fineTuningJob.id },
            data: {
              jobId: openaiJob.id,
              status: "running", // Update status to running since it's been created
            },
          });

          console.log(`Updated database record with job ID: ${openaiJob.id}`);
          break;
        } catch (jobError: any) {
          const errorMessage = jobError?.message || String(jobError);
          console.error(
            `Error creating job (attempt ${retryCount}/${maxRetries}):`,
            errorMessage
          );

          // Enhanced error handling with specific actions for different error types
          if (
            errorMessage.includes("file") &&
            errorMessage.includes("not found")
          ) {
            console.error(
              "File not found error. The file ID may be invalid or the file was deleted."
            );

            // Check if the file still exists
            try {
              await openai.files.retrieve(jobParams.training_file);
              console.log(
                "Training file still exists, will retry with longer delay"
              );
            } catch (fileError) {
              console.error(
                "Training file no longer exists or is inaccessible"
              );
              throw new Error(
                "Training file is no longer accessible. Please try creating a new fine-tuning job."
              );
            }
          } else if (errorMessage.includes("still being processed")) {
            console.log(
              "File is still being processed by OpenAI. Will retry with longer delay."
            );
          } else if (errorMessage.includes("rate limit")) {
            console.log("Rate limit exceeded. Will retry with longer delay.");
          } else if (
            errorMessage.includes("internal error") ||
            errorMessage.includes("server error")
          ) {
            console.log("OpenAI server error. Will retry with longer delay.");
          }

          // If we've reached max retries, rethrow the error
          if (retryCount >= maxRetries) {
            console.error("Max retries reached, giving up.");

            // Update the job status to failed in the database
            await prisma.fineTuningJob.update({
              where: { id: fineTuningJob.id },
              data: {
                status: "failed",
                completedAt: new Date(),
                resultMetrics: JSON.stringify({ error: errorMessage }),
              },
            });

            throw new Error(
              `Failed to create fine-tuning job after ${maxRetries} attempts: ${errorMessage}`
            );
          }
        }
      }

      // Make sure we have a valid job before updating the database
      if (!openaiJob) {
        throw new Error(
          "Failed to create fine-tuning job after multiple attempts"
        );
      }

      // Update the job in the database with additional information
      await prisma.fineTuningJob.update({
        where: { id: fineTuningJob.id },
        data: {
          trainingFile: trainingFile.id,
          validationFile: validationFile?.id || null,
          // Store hyperparameters as JSON string
          hyperparameters: JSON.stringify(hyperparameters || {}),
        },
      });

      // Associate training examples with the job
      for (const example of trainingExamples) {
        await prisma.trainingExample.update({
          where: { id: example.id },
          data: { fineTuningJobId: fineTuningJob.id },
        });
      }

      return { fineTuningJob, openaiJob };
    } catch (error: any) {
      console.error("Error creating OpenAI fine-tuning job:", error);

      // Update the job status to failed
      await prisma.fineTuningJob.update({
        where: { id: fineTuningJob.id },
        data: {
          status: "failed",
          completedAt: new Date(),
        },
      });

      const errorMessage = error?.message || String(error);
      throw new Error(
        `Failed to create OpenAI fine-tuning job: ${errorMessage}`
      );
    }
  } catch (error) {
    console.error("Error creating fine-tuning job:", error);
    throw error;
  }
}

/**
 * Check the status of a fine-tuning job with enhanced progress tracking
 * and direct OpenAI status mapping
 */
export async function checkFineTuningStatus(jobId: string) {
  try {
    console.log(`Checking status for job ID: ${jobId}`);

    // Get the fine-tuning job from the database
    const fineTuningJob = await prisma.fineTuningJob.findUnique({
      where: { id: jobId },
      include: {
        modelConfig: {
          include: {
            agent: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!fineTuningJob) {
      throw new Error("Fine-tuning job not found in database");
    }

    if (!fineTuningJob.jobId) {
      throw new Error("Fine-tuning job doesn't have an OpenAI job ID");
    }

    console.log(`Found job in database with OpenAI ID: ${fineTuningJob.jobId}`);

    // Check the status with OpenAI with retry logic
    let openaiJob: any;
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        console.log(
          `Retrieving job from OpenAI (attempt ${
            retryCount + 1
          }/${maxRetries})...`
        );
        openaiJob = await openai.fineTuning.jobs.retrieve(fineTuningJob.jobId);
        console.log(
          `Successfully retrieved job from OpenAI with status: ${openaiJob.status}`
        );
        break;
      } catch (error: any) {
        retryCount++;
        console.error(
          `Error retrieving job from OpenAI (attempt ${retryCount}/${maxRetries}):`,
          error.message
        );

        if (retryCount >= maxRetries) {
          throw error;
        }

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, 2000 * retryCount));
      }
    }

    // Make sure we have a valid job
    if (!openaiJob) {
      throw new Error(
        `Failed to retrieve job from OpenAI after ${maxRetries} attempts`
      );
    }

    // Map OpenAI status to our application status
    // This ensures consistent status mapping across the application
    const mappedStatus = mapOpenAIStatusToAppStatus(openaiJob.status);

    console.log(
      `Mapped OpenAI status "${openaiJob.status}" to app status "${mappedStatus}"`
    );

    // Get detailed progress information
    let progressDetails: any = {
      openaiStatus: openaiJob.status,
      appStatus: mappedStatus,
      lastChecked: new Date().toISOString(),
    };

    // If the job is running, get more detailed progress information
    if (openaiJob.status === "running") {
      try {
        // Get events for the job to track progress
        const events = await openai.fineTuning.jobs.listEvents(
          fineTuningJob.jobId,
          { limit: 10 }
        );

        // Extract progress information from events
        if (events.data && events.data.length > 0) {
          // Store the latest events for reference
          progressDetails.latestEvents = events.data.slice(0, 3).map((e) => ({
            message: e.message,
            timestamp: e.created_at,
          }));

          // Look for training progress events
          const progressEvents = events.data.filter(
            (event) =>
              event.message.includes("step") ||
              event.message.includes("epoch") ||
              event.message.includes("processed")
          );

          if (progressEvents.length > 0) {
            // Get the latest progress event
            const latestEvent = progressEvents[0];

            // Try to extract progress percentage
            const percentMatch = latestEvent.message.match(/(\d+)%/);
            const stepMatch = latestEvent.message.match(/step (\d+)\/(\d+)/);
            const epochMatch = latestEvent.message.match(/epoch (\d+)\/(\d+)/);

            if (percentMatch) {
              progressDetails.percent = parseInt(percentMatch[1]);
            }

            if (stepMatch) {
              progressDetails.currentStep = parseInt(stepMatch[1]);
              progressDetails.totalSteps = parseInt(stepMatch[2]);
              progressDetails.stepPercent = Math.round(
                (parseInt(stepMatch[1]) / parseInt(stepMatch[2])) * 100
              );
            }

            if (epochMatch) {
              progressDetails.currentEpoch = parseInt(epochMatch[1]);
              progressDetails.totalEpochs = parseInt(epochMatch[2]);
              progressDetails.epochPercent = Math.round(
                (parseInt(epochMatch[1]) / parseInt(epochMatch[2])) * 100
              );
            }
          }
        }
      } catch (error) {
        console.error("Error getting job events:", error);
        // Continue without detailed progress
        progressDetails.eventsError = "Failed to retrieve job events";
      }
    }

    // For completed jobs, get the result metrics
    if (
      openaiJob.status === "succeeded" &&
      openaiJob.result_files?.length > 0
    ) {
      try {
        const metrics = await getJobMetrics(openaiJob.result_files[0]);
        if (metrics) {
          progressDetails.metrics = metrics;
        }
      } catch (error) {
        console.error("Error getting job metrics:", error);
        progressDetails.metricsError = "Failed to retrieve job metrics";
      }
    }

    // For failed jobs, capture the error information
    if (openaiJob.status === "failed") {
      progressDetails.error = openaiJob.error || "Unknown error";
      progressDetails.failedAt = openaiJob.finished_at;
    }

    // Check if the job status has changed
    const statusChanged = fineTuningJob.status !== mappedStatus;
    const modelAdded =
      !fineTuningJob.fineTunedModel && openaiJob.fine_tuned_model;

    // Update the job status in the database with enhanced progress information
    let updatedJob = fineTuningJob;

    if (
      statusChanged ||
      modelAdded ||
      Object.keys(progressDetails).length > 2
    ) {
      console.log(
        `Job status changed from ${fineTuningJob.status} to ${mappedStatus}`
      );
      if (modelAdded) {
        console.log(`Fine-tuned model ID added: ${openaiJob.fine_tuned_model}`);
      }

      // Update the job in the database
      updatedJob = await prisma.fineTuningJob.update({
        where: { id: jobId },
        data: {
          status: mappedStatus,
          fineTunedModel: openaiJob.fine_tuned_model,
          resultMetrics: JSON.stringify(progressDetails),
          completedAt: ["succeeded", "failed", "cancelled"].includes(
            mappedStatus
          )
            ? new Date()
            : null,
        },
        include: {
          modelConfig: {
            include: {
              agent: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      console.log(`Updated job in database with status: ${updatedJob.status}`);

      // If the job succeeded, update the model config with the fine-tuned model
      if (
        mappedStatus === "succeeded" &&
        openaiJob.fine_tuned_model &&
        updatedJob.modelConfigId
      ) {
        console.log(
          `Job succeeded, updating model config with fine-tuned model: ${openaiJob.fine_tuned_model}`
        );

        // Get the current checkpoints from the model config
        const modelConfig = await prisma.modelConfig.findUnique({
          where: { id: updatedJob.modelConfigId },
        });

        if (modelConfig) {
          // Parse existing checkpoints or create an empty array
          const existingCheckpoints = modelConfig.checkpoints
            ? JSON.parse(modelConfig.checkpoints as string)
            : [];

          // Add the new checkpoint
          const updatedCheckpoints = [
            ...existingCheckpoints,
            {
              model: openaiJob.fine_tuned_model,
              createdAt: new Date().toISOString(),
              jobId: updatedJob.jobId,
            },
          ];

          // Update the model config
          await prisma.modelConfig.update({
            where: { id: updatedJob.modelConfigId },
            data: {
              status: "completed",
              checkpoints: JSON.stringify(updatedCheckpoints),
              activeModelId: openaiJob.fine_tuned_model, // Set as active model
            },
          });

          console.log(
            `Updated model config with fine-tuned model: ${openaiJob.fine_tuned_model}`
          );
        }
      }
    } else {
      console.log(
        `No changes detected for job ${fineTuningJob.id}, status remains: ${fineTuningJob.status}`
      );
    }

    return { fineTuningJob: updatedJob, openaiJob };
  } catch (error) {
    console.error("Error checking fine-tuning status:", error);
    throw error;
  }
}

/**
 * Map OpenAI status to our application status
 * This ensures consistent status mapping across the application
 */
function mapOpenAIStatusToAppStatus(openaiStatus: string): string {
  switch (openaiStatus) {
    case "validating_files":
    case "queued":
    case "preparing":
      return "pending";
    case "running":
      return "running";
    case "succeeded":
      return "succeeded";
    case "failed":
      return "failed";
    case "cancelled":
      return "cancelled";
    default:
      console.warn(
        `Unknown OpenAI status: ${openaiStatus}, defaulting to "pending"`
      );
      return "pending";
  }
}

/**
 * Get metrics for a fine-tuning job
 */
async function getJobMetrics(resultFileId: string) {
  try {
    const response = await openai.files.content(resultFileId);
    const content = await response.text();
    return JSON.parse(content);
  } catch (error) {
    console.error("Error getting job metrics:", error);
    return null;
  }
}

/**
 * Cancel a fine-tuning job
 */
export async function cancelFineTuningJob(jobId: string) {
  try {
    // Get the fine-tuning job from the database
    const fineTuningJob = await prisma.fineTuningJob.findUnique({
      where: { id: jobId },
    });

    if (!fineTuningJob || !fineTuningJob.jobId) {
      throw new Error("Fine-tuning job not found");
    }

    // Cancel the job with OpenAI
    const openaiJob = await openai.fineTuning.jobs.cancel(fineTuningJob.jobId);

    // Update the job status in the database
    const updatedJob = await prisma.fineTuningJob.update({
      where: { id: jobId },
      data: {
        status: openaiJob.status,
        completedAt: new Date(),
      },
    });

    return { fineTuningJob: updatedJob, openaiJob };
  } catch (error) {
    console.error("Error cancelling fine-tuning job:", error);
    throw error;
  }
}

/**
 * Create a training example
 */
export async function createTrainingExample(
  userId: string,
  messages: any[],
  source: string = "manual",
  tags: string[] = []
) {
  try {
    // Create a new training example
    const trainingExample = await prisma.trainingExample.create({
      data: {
        messages: JSON.stringify(messages),
        userId,
        source,
        tags: tags.join(","),
      },
    });

    return trainingExample;
  } catch (error) {
    console.error("Error creating training example:", error);
    throw error;
  }
}

/**
 * Get training examples for a user
 */
export async function getTrainingExamples(userId: string, filters: any = {}) {
  try {
    // Build the query
    const query: any = {
      where: { userId },
    };

    // Add filters
    if (filters.source) {
      query.where.source = filters.source;
    }

    if (filters.tags) {
      // Filter by any of the provided tags
      const tagList = Array.isArray(filters.tags)
        ? filters.tags
        : [filters.tags];
      query.where.OR = tagList.map((tag: string) => ({
        tags: { contains: tag },
      }));
    }

    // Add pagination
    if (filters.limit) {
      query.take = parseInt(filters.limit);
    }

    if (filters.offset) {
      query.skip = parseInt(filters.offset);
    }

    // Add sorting
    if (filters.sortBy) {
      query.orderBy = { [filters.sortBy]: filters.sortDirection || "desc" };
    } else {
      query.orderBy = { createdAt: "desc" };
    }

    // Get the examples
    const examples = await prisma.trainingExample.findMany(query);

    // Parse the messages
    return examples.map((example) => ({
      ...example,
      messages: JSON.parse(example.messages),
      tags: example.tags ? example.tags.split(",") : [],
    }));
  } catch (error) {
    console.error("Error getting training examples:", error);
    throw error;
  }
}

/**
 * Delete a training example
 */
export async function deleteTrainingExample(id: string, userId: string) {
  try {
    // Check if the example exists and belongs to the user
    const example = await prisma.trainingExample.findUnique({
      where: { id },
    });

    if (!example) {
      throw new Error("Training example not found");
    }

    if (example.userId !== userId) {
      throw new Error("Unauthorized");
    }

    // Delete the example
    await prisma.trainingExample.delete({
      where: { id },
    });

    return { success: true };
  } catch (error) {
    console.error("Error deleting training example:", error);
    throw error;
  }
}

/**
 * Set the active model for an agent
 */
export async function setActiveModel(
  modelConfigId: string,
  fineTunedModelId: string | null
) {
  try {
    // Update the model config
    const modelConfig = await prisma.modelConfig.update({
      where: { id: modelConfigId },
      data: {
        activeModelId: fineTunedModelId,
      },
    });

    return modelConfig;
  } catch (error) {
    console.error("Error setting active model:", error);
    throw error;
  }
}
