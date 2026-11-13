// Google AI Studio's Gemini API, called only on the server. No SDK is needed for
// this single request; the key is sent in a header, never in the request URL.
const DEFAULT_MODEL = "gemini-3.6-flash";
const SYSTEM = `You write a helpful quick overview of the figures in a bank conduct risk team's morning briefing.
You receive synthetic monitoring facts as JSON. Write at most three plain-language sentences for a busy conduct risk analyst: what changed, a possible cause, and what a human should check.
Use only the facts given and do not invent numbers or claim that correlation proves causation. Return plain text without headings, bullet points, colons or semicolons.`;

function failure(reason, model) {
  return { text: null, reason, model };
}

async function aiSummary(facts) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
  if (!apiKey) return failure("Live AI summaries are not configured.", model);
  if (!/^[a-zA-Z0-9._-]+$/.test(model))
    return failure("The configured AI model name is invalid.", model);

  // Explicitly select aggregate facts. Employee names, account references, report
  // messages and reviewer notes must never be sent to the model.
  const cause = facts.cause;
  const aggregate = {
    newHighCount: facts.newHigh.length,
    newMediumCount: facts.newMedium.length,
    overdueReviews: facts.overdue.length,
    risingBranches: facts.rising.map(
      ({ code, index, previous, level, previousLevel }) => ({
        branch: code,
        pressureIndex: index,
        previousPressureIndex: previous,
        level,
        previousLevel,
      }),
    ),
    cause: cause
      ? {
          branch: cause.branch,
          unusedBefore: cause.unusedBefore,
          unusedAfter: cause.unusedAfter,
          targetFrom: cause.targetFrom,
          targetTo: cause.targetTo,
          pctMissing: cause.pctMissing,
        }
      : null,
    pressureFlagged: facts.pressureFlagged.map(({ code, index }) => ({
      branch: code,
      index,
    })),
  };

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM }] },
          contents: [
            { role: "user", parts: [{ text: JSON.stringify(aggregate) }] },
          ],
          generationConfig: {
            maxOutputTokens: 4096,
            ...(model.startsWith("gemini-2.5-flash")
              ? { thinkingConfig: { thinkingBudget: 0 } }
              : model.startsWith("gemini-3")
                ? { thinkingConfig: { thinkingLevel: "low" } }
                : {}),
          },
        }),
        signal: AbortSignal.timeout(75000),
        cache: "no-store",
      },
    );
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      // Never return the provider's raw errors, which can contain request details.
      if (
        [401, 403].includes(response.status) ||
        data?.error?.details?.some((d) => d.reason === "API_KEY_INVALID")
      )
        return failure(
          "Rejected the credentials or denied access. Check the server API key and permissions.",
          model,
        );
      if (response.status === 404)
        return failure(
          "The configured AI model is unavailable. Check the server model setting.",
          model,
        );
      if (response.status === 429)
        return failure(
          "Quota or rate limit reached. Try again later or check the project quota.",
          model,
        );
      if (response.status === 402)
        return failure(
          "Requires billing to be enabled for this project.",
          model,
        );
      if (response.status === 400)
        return failure(
          "Request rejected. Check the model setting and project availability.",
          model,
        );
      return failure(
        "AI summary is temporarily unavailable. Try generating again.",
        model,
      );
    }
    if (!data)
      return failure(
        "AI summary contains an unreadable response. Try generating again.",
        model,
      );
    if (data.promptFeedback?.blockReason)
      return failure("Model declined to generate this summary.", model);
    const candidate = data.candidates?.[0];
    if (candidate?.finishReason === "MAX_TOKENS")
      return failure(
        "Model reached its output limit before completing the summary.",
        model,
      );
    if (candidate?.finishReason && candidate.finishReason !== "STOP")
      return failure(
        "Model declined or could not complete this summary.",
        model,
      );
    const text = (candidate?.content?.parts || [])
      .filter((part) => !part.thought && typeof part.text === "string")
      .map((part) => part.text)
      .join("")
      .trim();
    return text
      ? { text, model }
      : failure("Model returned no summary text.", model);
  } catch (error) {
    if (["TimeoutError", "AbortError"].includes(error.name))
      return failure(
        "AI Summary request timed out. Try generating again.",
        model,
      );
    return failure(
      "Could not reach AI service provider. Try generating again.",
      model,
    );
  }
}

module.exports = { aiSummary };
