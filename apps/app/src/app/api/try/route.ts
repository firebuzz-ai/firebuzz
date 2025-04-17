import { google } from "@/lib/ai/google";

import { generateText } from "ai";

export async function POST() {
  console.log("Hello, how are you?");
  try {
    const response = await generateText({
      model: google("gemini-2.5-pro-exp-03-25"),
      messages: [
        {
          role: "user",
          content: "Hello, how are you?",
        },
      ],
    });

    return new Response(response.text);
  } catch (error) {
    console.error(error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
