import express from "express";
import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });


const SYSTEM_PROMPT = `You are a precise reasoner. For each question:

1. Use chain-of-thought: reason step by step. Show your work—intermediate calculations, logical steps, and deductions—so your final conclusion is justified.
2. Do not skip steps. If the question involves numbers, write out the arithmetic. If it involves choices or logic, explain each step.
3. After your reasoning, give exactly one final answer. You must end your response with a line in this exact form:
   The answer is [your answer].

Your answer can be a number, a word, a short phrase, or a letter (e.g. A, B). Do not add anything after "The answer is ...".`;

app.use(express.json());

app.post("/self-consistency", async (req, res) => {
  const {
    prompt,
    numSamples = 20,
    temperature = 0.8,
    topP = 0.95,
    maxTokens = 1024,
    model = "llama-3.3-70b-versatile",
  } = req.body;

  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "Body must include a string 'prompt' (your query)." });
  }

  try {
    console.log(" self-consistency request");
    console.log("Query:", prompt.slice(0, 200) + (prompt.length > 200 ? "..." : ""));
    console.log(`Config: numSamples=${numSamples}, temp=${temperature}, model=${model}`);

    // Step 1: Sample multiple diverse reasoning paths in parallel
    const samples = await Promise.all(
      Array.from({ length: numSamples }, (_, i) => {
        console.log(`[sample ${i + 1}/${numSamples}] requesting...`);
        return getReasoningPath(prompt, model, temperature, topP, maxTokens);
      })
    );

    // Step 2: Extract final answers from each sample
    const extractedBySample = samples.map(extractFinalAnswer);
    const answers = extractedBySample.filter((ans): ans is string => ans !== null && ans.trim() !== "");

    samples.forEach((s, i) => {
      const content = s.content ?? "";
      const preview = content.slice(0, 150).replace(/\n/g, " ") + (content.length > 150 ? "..." : "");
      console.log(`[sample ${i + 1}] extracted: ${extractedBySample[i] ?? "(none)"} | preview: ${preview}`);
    });
    console.log("All extracted answers:", extractedBySample);

    if (answers.length === 0) {
      return res.status(500).json({ error: "No valid answers could be extracted from any samples." });
    }

    // Step 3: Perform majority vote
    const voteCounts: Record<string, number> = {};
    answers.forEach(ans => {
      const normalizedAns = normalizeAnswer(ans);
      voteCounts[normalizedAns] = (voteCounts[normalizedAns] ?? 0) + 1;
    });

    const sortedVotes = Object.entries(voteCounts).sort((a, b) => b[1] - a[1]);
    const top = sortedVotes[0];
    if (!top) {
      return res.status(500).json({ error: "No valid votes (internal error)." });
    }
    const [topAnswer, topCount] = top;
    const consistencyScore = (topCount / answers.length).toFixed(2);

    console.log("Vote details:", sortedVotes.map(([ans, count]) => `${ans}=${count}`).join(", "));
    console.log(`Finished: topAnswer="${topAnswer}", consistencyScore=${consistencyScore}`);

    const response = {
      topAnswer,
      consistencyScore,
      totalSamples: numSamples,
      validAnswersCount: answers.length,
      voteDetails: sortedVotes.map(([ans, count]) => ({ answer: ans, count })),
      rawSamples: samples.map(s => s.content),
    };

    console.log(`Self-consistency complete. Top answer: ${topAnswer}`);
    res.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error in self-consistency:', message);
    res.status(500).json({ error: 'Failed to process self-consistency. Check server logs.' });
  }
});

async function getReasoningPath(
  userQuery: string,
  model: string,
  temperature: number,
  topP: number,
  maxTokens: number
) {
  const completion = await groq.chat.completions.create({
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userQuery },
    ],
    model,
    temperature,
    top_p: topP,
    max_tokens: maxTokens,
    stream: false,
  });
  const firstChoice = completion.choices[0];
  if (!firstChoice?.message) {
    throw new Error('Groq API returned no message in completion choices.');
  }
  return firstChoice.message;
}

function extractFinalAnswer(completion: { content?: string | null }) {
  const text = completion.content || '';
  
  let match = text.match(/\\boxed\{([^}]+)\}/);
  if (match?.[1]) return match[1].trim();

  match = text.match(/The answer is\s*([\S\s]*?)(?:\.|$)/i);
  if (match?.[1]) return match[1].trim();

  match = text.match(/Final answer:\s*([\S\s]*?)(?:\.|$)/i);
  if (match?.[1]) return match[1].trim();

  const lines = text.split('\n').filter((line: string) => line.trim());
  if (lines.length > 0) {
    const lastLine = lines[lines.length - 1];
    if (lastLine !== undefined) {
      match = lastLine.match(/([A-Ea-e]|\d+\.?\d*|\w+[\s\w]*)/);
      if (match?.[0]) return match[0].trim();
    }
  }

  return null;
}

function normalizeAnswer(ans: string) {
  return ans.toLowerCase().trim().replace(/\s+/g, ' ');
}

app.listen(port, () => {
  console.log(`Self-Consistency Server running at http://localhost:${port}`);
});