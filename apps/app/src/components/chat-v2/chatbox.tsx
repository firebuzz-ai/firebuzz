"use client";

import { ChatInput } from "./input/chat-input";

const DUMMY_MESSAGES = [
  {
    id: "1",
    role: "user",
    content: "Hello! Can you help me create a landing page?",
    timestamp: new Date("2024-01-01T10:00:00"),
  },
  {
    id: "2",
    role: "assistant",
    content:
      "Of course! I'd be happy to help you create a landing page. What kind of landing page are you looking to build? What's the purpose and who is your target audience?",
    timestamp: new Date("2024-01-01T10:00:05"),
  },
  {
    id: "3",
    role: "user",
    content:
      "I need a landing page for a SaaS product that helps teams collaborate better.",
    timestamp: new Date("2024-01-01T10:00:15"),
  },
  {
    id: "4",
    role: "assistant",
    content:
      "Great! I'll help you create a professional landing page for your SaaS collaboration tool. Let me start by creating a modern, conversion-focused design with the following sections:\n\n1. Hero section with clear value proposition\n2. Key features showcase\n3. Social proof/testimonials\n4. Pricing section\n5. Call-to-action\n\nWould you like me to proceed with this structure?",
    timestamp: new Date("2024-01-01T10:00:20"),
  },
  {
    id: "5",
    role: "user",
    content: "Yes, that sounds perfect! Please go ahead.",
    timestamp: new Date("2024-01-01T10:00:30"),
  },
  {
    id: "6",
    role: "assistant",
    content:
      "Excellent! I'll create the landing page now. This will include:\n\n- A compelling hero section with headline and CTA\n- Feature cards highlighting your collaboration tools\n- A testimonials section for social proof\n- A clean pricing table\n- Footer with links and contact info\n\nLet me generate this for you...",
    timestamp: new Date("2024-01-01T10:00:35"),
  },
];

export const Chatbox = () => {
  return (
    <div className="flex relative flex-col h-full">
      {/* Messages Container */}
      <div className="overflow-y-auto flex-1 px-4 pt-4 pb-32">
        <div className="mx-auto space-y-4 max-w-3xl">
          {DUMMY_MESSAGES.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-3 ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                <p className="text-sm">{message.content}</p>
                <span className="block mt-1 text-xs opacity-70 text-muted-foreground">
                  {message.timestamp.toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Input*/}
      {/* Input Container */}
      <div className="relative px-4 pt-4 pb-4">
        <div className="mx-auto max-w-3xl">
          <ChatInput />
        </div>
      </div>
    </div>
  );
};
