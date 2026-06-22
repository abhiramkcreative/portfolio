import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, useAnimation } from "motion/react";

type Expression =
  | "soft"
  | "thinking"
  | "listening"
  | "sleeping"
  | "waking"
  | "speaking"
  | "playful";

type SpeechTone = "neutral" | "playful" | "excited" | "thinking" | "soft" | "sleepy";

type KukuLanguage = "en" | "ml";
type VisitorType = "visitor" | "recruiter" | "client" | "developer" | "friend";
type CharacterMood = "neutral" | "familiar" | "professional" | "playful" | "supportive";

type KukuIntent =
  | "greeting"
  | "visitorRecruiter"
  | "visitorClient"
  | "visitorDeveloper"
  | "visitorFriend"
  | "nicknameStretchReaction"
  | "nicknameReaction"
  | "whoIsKuku"
  | "aboutAbhiram"
  | "skills"
  | "aiProjects"
  | "softwareSupport"
  | "projects"
  | "experience"
  | "creativeDeveloper"
  | "contact"
  | "hire"
  | "availability"
  | "resume"
  | "education"
  | "services"
  | "workflow"
  | "strengths"
  | "social"
  | "location"
  | "portfolioSummary"
  | "capabilities"
  | "personal"
  | "motivation"
  | "casualChat"
  | "goodbye"
  | "joke"
  | "compliment"
  | "emotionalSupport"
  | "confusionHelp"
  | "listeningCheck"
  | "sleep"
  | "wake"
  | "switchMalayalam"
  | "switchEnglish"
  | "unknown";

type IntentAction = {
  type: "navigate";
  sectionId: "projects" | "experience" | "contact";
};

type IntentDefinition = {
  intent: KukuIntent;
  expression: Expression;
  aliases: string[];
  responses: Record<KukuLanguage, string[]>;
  action?: IntentAction;
};

type CharacterMemory = {
  hasHeardNickname: boolean;
  interactionCount: number;
  unknownCount: number;
  repeatCount: number;
  visitorType: VisitorType;
  mood: CharacterMood;
  lastTopic: KukuIntent | null;
  recentIntents: KukuIntent[];
  recentResponses: string[];
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onresult:
    | ((
        event: {
          resultIndex?: number;
          results: ArrayLike<
            ArrayLike<{ transcript: string }> & { isFinal?: boolean }
          >;
        },
      ) => void)
    | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
type SpeechWindow = Window &
  typeof globalThis & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };

const emotionTiming = {
  wakingHold: 900,
  listeningHold: 1400,
  thinkingAfterIdle: 4500,
  sleepingAfterIdle: 30000,
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const characterName = "Abhiram K";
const characterNickname = "Sreekkuttan";
const commandCooldownMs = 1000;
const recentMemoryLimit = 5;

const intentDefinitions: IntentDefinition[] = [
  {
    intent: "visitorRecruiter",
    expression: "speaking",
    aliases: [
      "i am recruiter",
      "i am a recruiter",
      "recruiter",
      "hr",
      "hiring manager",
      "talent acquisition",
      "job opening",
      "we are hiring",
      "recruiter aanu",
      "hr aanu",
      "job opportunity",
    ],
    responses: {
      en: [
        "Recruiter mode noted. Abhiram brings creative development, software support experience, Python, OpenCV, and practical project thinking.",
        "If you are hiring, the useful summary is this: he can build, troubleshoot, communicate, and present work cleanly.",
        "For a role conversation, check experience and contact. I will behave professionally now... mostly.",
      ],
      ml: [
        "Recruiter mode noted. Abhiram-ന് creative development, software support, Python, OpenCV, practical project thinking എല്ലാം ഉണ്ട്.",
        "Hiring കാര്യമാണെങ്കിൽ short summary: build ചെയ്യാം, troubleshoot ചെയ്യാം, communicate ചെയ്യാം, clean ആയി present ചെയ്യാം.",
        "Role conversation ആണെങ്കിൽ experience-വും contact-വും നോക്കൂ. ഞാൻ ഇനി കുറച്ച് professional ആയി behave ചെയ്യും... mostly.",
      ],
    },
    action: { type: "navigate", sectionId: "experience" },
  },
  {
    intent: "visitorClient",
    expression: "speaking",
    aliases: [
      "i am client",
      "client",
      "need website",
      "i need website",
      "build website",
      "website venam",
      "project venam",
      "business website",
      "portfolio venam",
      "can you build for me",
      "i have a project",
      "work cheyyamo",
    ],
    responses: {
      en: [
        "Client mode understood. Tell Abhiram the idea, deadline, budget range, and what the website or project should do.",
        "For project work, Abhiram can help with websites, portfolios, creative frontend, and practical AI prototypes.",
        "Good client message formula: goal, pages, examples you like, timeline, and contact details.",
      ],
      ml: [
        "Client mode മനസ്സിലായി. Idea, deadline, budget range, website/project എന്ത് ചെയ്യണം എന്ന് Abhiram-ന് അയച്ചാൽ മതി.",
        "Project work ആണെങ്കിൽ websites, portfolios, creative frontend, practical AI prototypes എന്നിവയിൽ Abhiram help ചെയ്യാം.",
        "Good client message formula: goal, pages, ഇഷ്ടമായ examples, timeline, contact details.",
      ],
    },
    action: { type: "navigate", sectionId: "contact" },
  },
  {
    intent: "visitorDeveloper",
    expression: "thinking",
    aliases: [
      "i am developer",
      "developer here",
      "frontend developer",
      "software developer",
      "tech stack details",
      "code details",
      "github code",
      "developer aanu",
      "tech parayu",
      "stack parayu",
    ],
    responses: {
      en: [
        "Developer mode unlocked. Ask about tech stack, Python, OpenCV, frontend work, or how the portfolio interactions are structured.",
        "For dev eyes: Abhiram mixes frontend polish, motion, Python experiments, OpenCV, and practical support experience.",
        "You can check projects and GitHub links for the more technical side.",
      ],
      ml: [
        "Developer mode unlocked. Tech stack, Python, OpenCV, frontend work, portfolio interactions എന്നിവ ചോദിക്കാം.",
        "Dev angle-ൽ നോക്കിയാൽ frontend polish, motion, Python experiments, OpenCV, support experience എന്നിവ mix ആണ്.",
        "Technical side കാണാൻ projects-ും GitHub links-ും നോക്കൂ.",
      ],
    },
    action: { type: "navigate", sectionId: "projects" },
  },
  {
    intent: "visitorFriend",
    expression: "playful",
    aliases: [
      "i am friend",
      "friend",
      "njan friend aanu",
      "ente friend aanu",
      "eda",
      "mone",
      "bro",
      "aliya",
      "machane",
    ],
    responses: {
      en: [
        "Friend mode? Ah, then formal behavior is cancelled. Ask anything, but keep the teasing respectful.",
        "Okay, close-circle energy detected. If you know Sreekkuttan, I am already suspicious.",
        "Friend visitor noted. I will be warmer, funnier, and slightly less corporate.",
      ],
      ml: [
        "Friend mode ആണോ? അപ്പോൾ formal behavior cancel. എന്തും ചോദിക്കാം, teasing respectful ആക്കണേ.",
        "Close-circle energy detected. Sreekkuttan അറിയുമെങ്കിൽ ഞാൻ already suspicious ആണ്.",
        "Friend visitor noted. ഇനി കുറച്ച് warm, funny, less corporate.",
      ],
    },
  },
  {
    intent: "nicknameStretchReaction",
    expression: "playful",
    aliases: [
      "sreekkutta",
      "sreekkuttaa",
      "sreekkuttaaa",
      "sreekkuttaaaa",
      "sreekutta",
      "sreekuttaa",
      "sreekuttaaa",
      "sreekuttaaaa",
      "sree kutta",
      "sree kuttaa",
      "sree kuttaaa",
      "sree kuttaaaa",
      "hey sreekkutta",
      "hey sreekkuttaa",
      "hello sreekkutta",
      "hi sreekkuttaa",
      "cheekkutta",
      "cheekkuttaa",
      "cheekkuttaaa",
      "cheekutta",
      "cheekuttaa",
      "chikkutta",
      "chikkuttaa",
      "ശ്രീക്കുട്ടാ",
      "ശ്രീക്കുട്ടാാ",
      "ചീക്കുട്ടാ",
    ],
    responses: {
      en: [
        "Ayy... Sreekkuttaa? Only people close to me call me like that. How do you know it?",
        "You even stretched the nickname? Okay, now this feels very personal.",
        "Cheekkuttaa? That sounded way too familiar. I'm happy... but also a little suspicious.",
      ],
      ml: [
        "അയ്യേ... ശ്രീക്കുട്ടാ എന്ന് നീട്ടി വിളിച്ചല്ലോ! എന്നെ close ആയിട്ടുള്ളവർ മാത്രമേ അങ്ങനെ വിളിക്കാറുള്ളൂ.",
        "ഓഹോ... എന്റെ nickname ഒക്കെ അറിയാമല്ലേ? എങ്ങനെ അറിഞ്ഞു?",
        "ചീക്കുട്ടാ എന്നൊക്കെ വിളിച്ചാൽ ഞാൻ വീഴും കേട്ടോ... പക്ഷേ സത്യം പറ, ഈ പേര് എവിടുന്ന് കിട്ടി?",
      ],
    },
  },
  {
    intent: "nicknameReaction",
    expression: "playful",
    aliases: [
      "hey sreekkuttan",
      "hello sreekkuttan",
      "hi sreekkuttan",
      "sreekkuttan",
      "sreekuttan",
      "sree kuttan",
      "sree kuttan aaran",
      "who is sreekkuttan",
      "what is sreekkuttan",
      "ശ്രീക്കുട്ടൻ",
      "ഹായ് ശ്രീക്കുട്ടൻ",
    ],
    responses: {
      en: [
        "Sreekkuttan? Wait... how do you know that name?",
        "Oho, you found the private nickname. Now I'm curious.",
        "You called me Sreekkuttan? Okay, you're definitely not a random visitor anymore.",
      ],
      ml: [
        "ശ്രീക്കുട്ടൻ എന്നോ? അയ്യേ... ആ പേര് എങ്ങനെ അറിയാം?",
        "ഓഹോ, private nickname വരെ കണ്ടുപിടിച്ചല്ലേ! ഇപ്പോൾ എനിക്ക് കുറച്ച് curiosity ആയി.",
        "ശ്രീക്കുട്ടൻ എന്ന് വിളിച്ച സ്ഥിതിക്ക് നീ ഇനി random visitor ഒന്നുമല്ല കേട്ടോ.",
      ],
    },
  },
  {
    intent: "greeting",
    expression: "playful",
    aliases: [
      "hey abhiram",
      "hello abhiram",
      "hi abhiram",
      "hello",
      "hi",
      "hey",
    ],
    responses: {
      en: [
        `Hey! I'm ${characterName} in tiny interactive mode. What do you want to know?`,
        `Hi hi! I'm ${characterName}. Ask me about my work or anything around here.`,
        "Hello! Abhiram mode is awake and ready. Go on, ask me something.",
      ],
      ml: [
        `ഹായ്! ഞാൻ ${characterName}. Tiny interactive mode ആണ്. എന്താ അറിയേണ്ടത്?`,
        `ഹലോ ഹലോ! ഞാൻ ${characterName}. Work-നെ കുറിച്ചോ projects-നെ കുറിച്ചോ എന്തും ചോദിച്ചോളൂ.`,
        "ഹായ്! Abhiram mode wake ആയി. പറയൂ, എന്താ ചോദിക്കാനുള്ളത്?",
      ],
    },
  },
  {
    intent: "whoIsKuku",
    expression: "playful",
    aliases: [
      "who are you",
      "what are you",
      "are you real",
      "introduce yourself",
      "your name",
      "what is your name",
      "who is abhiram k",
      "nee aara",
      "nee aran",
      "ninte peru entha",
      "നീ ആരാണ്",
    ],
    responses: {
      en: [
        `I'm ${characterName}. This round character is my playful portfolio voice.`,
        `Me? I'm ${characterName} in interactive character mode. I talk about the work and keep things lively.`,
        "I'm the small round buddy you see here. Cute face, useful information.",
      ],
      ml: [
        `ഞാൻ ${characterName}. ഈ round character എന്റെ playful portfolio voice ആണ്.`,
        `ഞാനോ? ${characterName} interactive character mode-ൽ. Work-നെ കുറിച്ച് പറയും, vibe set ആക്കും.`,
        "ഇവിടെ കാണുന്ന ഈ കുഞ്ഞ് round buddy ഞാനാണ്. Look cute, information useful.",
      ],
    },
  },
  {
    intent: "aboutAbhiram",
    expression: "speaking",
    aliases: [
      "tell me about abhiram",
      "about abhiram",
      "who is abhiram",
      "what does abhiram do",
      "what is abhiram doing",
      "work enthanu",
      "abhiram work enthanu",
      "abhiram entha cheyyunnath",
      "tell about him",
      "what he do",
      "abhiram",
      "abhiram aaran",
      "abhiram enth cheyyum",
      "abhiramine kurich parayu",
      "അഭിരാം ആരാണ്",
    ],
    responses: {
      en: [
        "Abhiram is a Creative Developer from Kerala who mixes code, visuals, and storytelling.",
        "He enjoys turning rough ideas into clean websites, interactive experiences, and useful tech projects.",
        "Abhiram is the kind of person who cares about both how something works and how it feels.",
      ],
      ml: [
        "Abhiram Kerala-യിൽ നിന്നുള്ള ഒരു Creative Developer ആണ്. Code-ഉം visuals-ഉം storytelling-ഉം mix ചെയ്യും.",
        "ഒരു rough idea കിട്ടിയാൽ അത് clean website ആയാലും interactive experience ആയാലും build ചെയ്ത് നോക്കും.",
        "ഒരു കാര്യം work ചെയ്യണം എന്നതുപോലെ തന്നെ അത് കാണാനും feel ചെയ്യാനും നല്ലതായിരിക്കണം എന്നാണ് Abhiram-ന്റെ style.",
      ],
    },
  },
  {
    intent: "skills",
    expression: "speaking",
    aliases: [
      "skills",
      "what are his skills",
      "tell me his skills",
      "tech stack",
      "technologies",
      "what can he do",
      "what tools",
      "his skills",
      "skills parayu",
      "skills enthokke",
      "tools enthokke",
      "abhiram skills",
      "അഭിരാമിന്റെ skills",
    ],
    responses: {
      en: [
        "Abhiram works with web development, UI, Python, OpenCV, creative visuals, and software support.",
        "His main strength is combining technical problem-solving with a good visual sense.",
        "He can think like a developer, present like a creator, and troubleshoot when things decide to break.",
      ],
      ml: [
        "Web development, UI, Python, OpenCV, creative visuals, software support—ഇതൊക്കെയാണ് Abhiram handle ചെയ്യുന്നത്.",
        "Technical problem solve ചെയ്യുന്നതും അത് clean ആയി present ചെയ്യുന്നതും കൂടെ ചെയ്യാൻ പറ്റുന്നതാണ് അവന്റെ main strength.",
        "Developer പോലെ think ചെയ്യും, creator പോലെ present ചെയ്യും, എന്തെങ്കിലും break ആയാൽ ഇരുന്ന് fix ചെയ്യുകയും ചെയ്യും.",
      ],
    },
  },
  {
    intent: "aiProjects",
    expression: "thinking",
    aliases: [
      "ai project",
      "ai projects",
      "opencv",
      "python project",
      "computer vision",
      "smart security gate",
      "number plate recognition",
      "ocr",
      "automation project",
      "tell me ai work",
      "tell me opencv work",
      "opencv project parayu",
      "python project parayu",
      "ai work parayu",
      "number plate project parayu",
    ],
    responses: {
      en: [
        "Abhiram has worked on practical AI ideas using Python, OpenCV, OCR, and computer vision.",
        "One of his key projects is a smart security gate that reads number plates and automates access decisions.",
        "His AI work is more about solving real problems than just showing flashy demos.",
      ],
      ml: [
        "Python, OpenCV, OCR, computer vision എന്നിവ use ചെയ്ത് practical AI ideas ആണ് Abhiram work ചെയ്തിട്ടുള്ളത്.",
        "Number plate read ചെയ്ത് gate access automate ചെയ്യുന്ന smart security gate ആണ് അവന്റെ main projects-ലൊന്ന്.",
        "Show മാത്രം ഉള്ള AI demo-കളേക്കാൾ real problem solve ചെയ്യുന്ന projects ആണ് അവന് കൂടുതൽ ഇഷ്ടം.",
      ],
    },
    action: { type: "navigate", sectionId: "projects" },
  },
  {
    intent: "softwareSupport",
    expression: "speaking",
    aliases: [
      "software support",
      "support specialist",
      "software support specialist",
      "pos support",
      "retail software",
      "troubleshooting",
      "technical support",
      "support experience",
      "what support work",
      "software support work",
      "software support enthanu",
      "support work enthanu",
      "pos support parayu",
    ],
    responses: {
      en: [
        "Abhiram's software support work includes troubleshooting, POS systems, user coordination, and keeping daily operations smooth.",
        "Support work taught him how to stay calm, find the real issue, and explain solutions clearly.",
        "He understands what happens after software is built—when real people actually start using it.",
      ],
      ml: [
        "Troubleshooting, POS systems, users-നെ coordinate ചെയ്യൽ, daily operations smooth ആക്കൽ—ഇതൊക്കെയാണ് Abhiram-ന്റെ software support side.",
        "Problem വന്നാൽ panic ആകാതെ actual issue കണ്ടുപിടിച്ച് simple ആയി explain ചെയ്യാൻ support work അവനെ പഠിപ്പിച്ചു.",
        "Software build ചെയ്തതിന് ശേഷം real users അത് use ചെയ്യുമ്പോൾ എന്തൊക്കെ സംഭവിക്കും എന്ന side-ും അവന് നന്നായി അറിയാം.",
      ],
    },
    action: { type: "navigate", sectionId: "experience" },
  },
  {
    intent: "projects",
    expression: "speaking",
    aliases: [
      "show projects",
      "projects",
      "show me projects",
      "show project",
      "selected work",
      "what projects",
      "his work",
      "portfolio work",
      "tell me about his projects",
      "project details",
      "project parayu",
      "projects parayu",
      "work kanikku",
      "projects kanikku",
      "project kaaniku",
      "projects കാണിക്കൂ",
    ],
    responses: {
      en: [
        "His projects mix software, visuals, interaction, and a bit of experimentation.",
        "The project section has his AI work, web ideas, and other things he has built along the way.",
        "Let's go to the projects. That's where the actual work speaks for him.",
      ],
      ml: [
        "Abhiram-ന്റെ projects-ൽ software-ഉം visuals-ഉം interaction-ഉം ഒക്കെ mix ആയിരിക്കും.",
        "AI work, web ideas, പിന്നെ build ചെയ്ത് നോക്കിയ കുറേ experiments—എല്ലാം projects section-ൽ കാണാം.",
        "Projects section-ലേക്ക് പോകാം. ബാക്കി work തന്നെ പറഞ്ഞോളും.",
      ],
    },
    action: { type: "navigate", sectionId: "projects" },
  },
  {
    intent: "experience",
    expression: "speaking",
    aliases: [
      "experience",
      "tell me his experience",
      "work experience",
      "job",
      "career",
      "where does he work",
      "what experience does he have",
      "his experience",
      "experience parayu",
      "experience enthanu",
      "job enthanu",
      "evide work cheyyunnu",
      "അഭിരാമിന്റെ experience",
    ],
    responses: {
      en: [
        "Abhiram has experience in software support, creative development, web work, and visual communication.",
        "His work experience sits right between technology and creativity, which is honestly a useful place to be.",
        "He has handled real users, real deadlines, real problems, and still kept building creative things.",
      ],
      ml: [
        "Software support, creative development, web work, visual communication—ഇതിലൊക്കെ Abhiram-ന് experience ഉണ്ട്.",
        "Tech-നും creativity-ക്കും ഇടയിലാണ് അവന്റെ work experience. Actually, നല്ല useful combo ആണ്.",
        "Real users, deadlines, problems എല്ലാം handle ചെയ്തിട്ടും creative things build ചെയ്യുന്നത് അവൻ നിർത്തിയിട്ടില്ല.",
      ],
    },
    action: { type: "navigate", sectionId: "experience" },
  },
  {
    intent: "creativeDeveloper",
    expression: "thinking",
    aliases: [
      "creative developer",
      "what is a creative developer",
      "meaning of creative developer",
      "why creative developer",
      "developer and designer",
      "creative developer entha",
      "creative developer enthanu",
      "creative developer meaning parayu",
    ],
    responses: {
      en: [
        "A Creative Developer is someone who can build the experience and also make it feel alive.",
        "It is basically code with visual thinking, motion, interaction, and storytelling added in.",
        "For Abhiram, it means not stopping at 'it works'—he wants it to look and feel right too.",
      ],
      ml: [
        "Creative Developer എന്ന് പറഞ്ഞാൽ ഒരു experience build ചെയ്യാനും അതിന് life കൊടുക്കാനും അറിയുന്ന ആളാണ്.",
        "Simple ആയി പറഞ്ഞാൽ code-ന്റെ കൂടെ visuals, motion, interaction, storytelling ഒക്കെ ചേർക്കുന്നത്.",
        "'Work ചെയ്യുന്നുണ്ട്' എന്നിടത്ത് stop ചെയ്യാതെ 'കാണാനും feel ചെയ്യാനും നന്നാണോ' എന്നും നോക്കുന്നതാണ് Abhiram-ന്റെ style.",
      ],
    },
  },
  {
    intent: "contact",
    expression: "speaking",
    aliases: [
      "contact",
      "how can i contact abhiram",
      "email",
      "message abhiram",
      "reach abhiram",
      "talk to abhiram",
      "contact abhiram",
      "how to reach him",
      "contact engane",
      "contact cheyyan engane",
      "message engane ayakkam",
      "email evide",
    ],
    responses: {
      en: [
        "You can reach Abhiram through the contact section. A short message is enough to get started.",
        "Go to contact and tell him what you have in mind. He'll take it from there.",
        "Want to talk to Abhiram? The contact section is the easiest way.",
      ],
      ml: [
        "Contact section വഴി Abhiram-നെ reach ചെയ്യാം. ഒരു short message മതി start ചെയ്യാൻ.",
        "Contact-ലേക്ക് പോയി idea എന്താണെന്ന് പറഞ്ഞാൽ മതി. ബാക്കി അവൻ നോക്കിക്കോളും.",
        "Abhiram-നോട് സംസാരിക്കണോ? Contact section ആണ് easiest way.",
      ],
    },
    action: { type: "navigate", sectionId: "contact" },
  },
  {
    intent: "hire",
    expression: "speaking",
    aliases: [
      "hire",
      "hire abhiram",
      "work with abhiram",
      "project with abhiram",
      "why should i hire abhiram",
      "can i hire him",
      "hire cheyyan pattumo",
      "work kodukkamo",
      "project kodukkamo",
      "hire cheyyamo",
    ],
    responses: {
      en: [
        "If your project needs both technical thinking and creative presentation, Abhiram could be a good fit.",
        "You can hire him for websites, interactive experiences, creative frontend work, or practical tech ideas.",
        "Send him the idea, timeline, and what you need. Clear details make everything easier.",
      ],
      ml: [
        "Project-ന് tech thinking-ഉം creative presentation-ഉം രണ്ടും വേണമെങ്കിൽ Abhiram നല്ല fit ആയിരിക്കും.",
        "Websites, interactive experiences, creative frontend work, practical tech ideas—ഇതിലൊക്കെ അവനെ contact ചെയ്യാം.",
        "Idea, timeline, എന്താണ് വേണ്ടത്—ഇത്രയും clear ആയി അയച്ചാൽ കാര്യങ്ങൾ easy ആവും.",
      ],
    },
    action: { type: "navigate", sectionId: "contact" },
  },
  {
    intent: "availability",
    expression: "speaking",
    aliases: [
      "is abhiram available",
      "available",
      "is he available",
      "availability",
      "free for work",
      "open for work",
    ],
    responses: {
      en: [
        "Abhiram is open to the right opportunities. The best way to confirm is to message him directly.",
        "Good project, clear idea, decent people—he is always happy to have that conversation.",
        "Availability can change, so send him a quick message and check.",
      ],
      ml: [
        "നല്ല opportunities ഉണ്ടെങ്കിൽ Abhiram സംസാരിക്കാൻ open ആണ്. Confirm ചെയ്യാൻ direct message അയക്കുന്നതാണ് best.",
        "Good project, clear idea, decent people—ഇങ്ങനെയാണെങ്കിൽ സംസാരിക്കാൻ അവന് definitely interest ഉണ്ടാകും.",
        "Availability മാറാം, അതുകൊണ്ട് ഒരു quick message അയച്ച് ചോദിച്ചോളൂ.",
      ],
    },
    action: { type: "navigate", sectionId: "contact" },
  },
  {
    intent: "resume",
    expression: "speaking",
    aliases: [
      "resume",
      "cv",
      "show resume",
      "download resume",
      "can i see resume",
      "where is his resume",
      "resume undo",
      "cv undo",
      "resume evide",
      "cv evide",
    ],
    responses: {
      en: [
        "For Abhiram's latest resume, check the portfolio links or contact him directly.",
        "It is better to ask him for the newest version. Resumes change faster than people expect.",
        "Need the CV? Send him a message and ask for the latest copy.",
      ],
      ml: [
        "Abhiram-ന്റെ latest resume വേണമെങ്കിൽ portfolio links നോക്കുകയോ direct contact ചെയ്യുകയോ ചെയ്യാം.",
        "Newest version തന്നെ ചോദിക്കുന്നതാണ് best. Resume ഇടയ്ക്കിടെ update ആകുമല്ലോ.",
        "CV വേണോ? ഒരു message അയച്ച് latest copy ചോദിച്ചോളൂ.",
      ],
    },
    action: { type: "navigate", sectionId: "contact" },
  },
  {
    intent: "education",
    expression: "thinking",
    aliases: [
      "education",
      "qualification",
      "study",
      "studies",
      "college",
      "degree",
      "what did he study",
      "his education",
      "education parayu",
      "padichath entha",
      "degree entha",
      "qualification enthanu",
    ],
    responses: {
      en: [
        "Abhiram completed a B.Sc. in Computer Science from the University of Calicut.",
        "His degree gave him the basics, but most of his growth came from building projects and solving real problems.",
        "Computer Science is the foundation. The creative and practical side came from everything he kept exploring after that.",
      ],
      ml: [
        "Abhiram University of Calicut-ൽ നിന്ന് B.Sc. Computer Science complete ചെയ്തിട്ടുണ്ട്.",
        "Degree basics കൊടുത്തു. പക്ഷേ projects build ചെയ്തും real problems solve ചെയ്തുമാണ് കൂടുതൽ പഠിച്ചത്.",
        "Computer Science ആണ് base. Creative side-ും practical side-ും പിന്നെ explore ചെയ്ത് build ചെയ്തെടുത്തതാണ്.",
      ],
    },
  },
  {
    intent: "services",
    expression: "speaking",
    aliases: [
      "services",
      "what services",
      "what can abhiram build",
      "can he build website",
      "website work",
      "app work",
      "ui work",
      "animation work",
      "landing page",
      "portfolio website",
      "services parayu",
      "services enthokke",
      "website cheyyumo",
      "portfolio cheyyumo",
    ],
    responses: {
      en: [
        "Abhiram can help with websites, portfolios, UI concepts, interactive pages, creative frontend work, and AI prototypes.",
        "If you have a rough digital idea, he can help shape it into something clean and usable.",
        "He is a good fit for work that needs code, visual sense, and a little personality.",
      ],
      ml: [
        "Websites, portfolios, UI concepts, interactive pages, creative frontend work, AI prototypes—ഇതിലൊക്കെ Abhiram help ചെയ്യാം.",
        "ഒരു rough digital idea ഉണ്ടെങ്കിൽ അത് clean and usable ആയി shape ചെയ്യാൻ അവൻ സഹായിക്കും.",
        "Code-ഉം visual sense-ഉം കുറച്ച് personality-യും വേണമെങ്കിൽ അവൻ നല്ല fit ആണ്.",
      ],
    },
    action: { type: "navigate", sectionId: "contact" },
  },
  {
    intent: "workflow",
    expression: "thinking",
    aliases: [
      "how does he work",
      "work process",
      "workflow",
      "process",
      "how he build",
      "how does abhiram build",
      "development process",
      "design process",
    ],
    responses: {
      en: [
        "Abhiram usually starts by understanding the idea, then plans, builds, tests, and polishes it.",
        "His process is simple: understand first, build clearly, test properly, and improve what feels off.",
        "He likes getting the structure right before adding the visual magic on top.",
      ],
      ml: [
        "ആദ്യം idea ശരിക്കും മനസ്സിലാക്കും. പിന്നെ plan ചെയ്യും, build ചെയ്യും, test ചെയ്യും, അവസാനം polish ചെയ്യും.",
        "Process simple ആണ്: ആദ്യം understand ചെയ്യുക, clear ആയി build ചെയ്യുക, proper ആയി test ചെയ്യുക, off ആയി തോന്നുന്നത് improve ചെയ്യുക.",
        "Visual magic add ചെയ്യുന്നതിന് മുമ്പ് structure ശരിയാക്കാനാണ് അവന് ഇഷ്ടം.",
      ],
    },
  },
  {
    intent: "strengths",
    expression: "speaking",
    aliases: [
      "strength",
      "strengths",
      "why abhiram",
      "what is special",
      "why is he good",
      "best quality",
      "strong point",
      "what makes him different",
    ],
    responses: {
      en: [
        "Abhiram's biggest strength is combining technical clarity with creative thinking.",
        "He listens, understands the problem, and tries to make the final result both useful and clean.",
        "He is patient with problems and picky about presentation—which is a pretty solid combination.",
      ],
      ml: [
        "Technical clarity-യും creative thinking-ഉം ഒരുമിച്ച് കൊണ്ടുപോകുന്നതാണ് Abhiram-ന്റെ biggest strength.",
        "ആദ്യം കേൾക്കും, problem മനസ്സിലാക്കും, പിന്നെ useful-ഉം clean-ഉം ആയ result ഉണ്ടാക്കാൻ നോക്കും.",
        "Problems-ന്റെ കാര്യത്തിൽ patient ആണ്. Presentation-ന്റെ കാര്യത്തിൽ കുറച്ച് picky-യും. നല്ല combo അല്ലേ?",
      ],
    },
  },
  {
    intent: "social",
    expression: "listening",
    aliases: [
      "social",
      "social links",
      "linkedin",
      "github",
      "instagram",
      "where is github",
      "where is linkedin",
      "profile links",
    ],
    responses: {
      en: [
        "You can find Abhiram's LinkedIn, GitHub, and other profiles through the portfolio links.",
        "Check the contact area. His main social and professional links should be there.",
        "Looking for GitHub or LinkedIn? The portfolio links will take you there.",
      ],
      ml: [
        "Abhiram-ന്റെ LinkedIn, GitHub, മറ്റു profiles എല്ലാം portfolio links-ൽ കാണാം.",
        "Contact area ഒന്ന് നോക്കൂ. Main social and professional links അവിടെ ഉണ്ടാകും.",
        "GitHub ആണോ LinkedIn ആണോ വേണ്ടത്? Portfolio links വഴി പോകാം.",
      ],
    },
    action: { type: "navigate", sectionId: "contact" },
  },
  {
    intent: "location",
    expression: "speaking",
    aliases: [
      "location",
      "where is abhiram from",
      "where does he live",
      "which place",
      "from where",
      "india",
      "kerala",
      "abhiram evide aanu",
      "evide aanu",
      "nattile evide",
    ],
    responses: {
      en: [
        "Abhiram is from Kerala, India.",
        "He is based in Kerala and works on digital projects from there.",
        "Kerala is home. For work location or availability, message him directly.",
      ],
      ml: [
        "Abhiram Kerala, India-യിൽ നിന്നാണ്.",
        "Kerala-യിലാണ് base. അവിടെ നിന്നാണ് digital projects work ചെയ്യുന്നത്.",
        "Kerala ആണ് home. Work location അല്ലെങ്കിൽ availability അറിയാൻ direct message അയക്കൂ.",
      ],
    },
  },
  {
    intent: "portfolioSummary",
    expression: "speaking",
    aliases: [
      "portfolio",
      "explain portfolio",
      "what is this website",
      "show portfolio",
      "portfolio summary",
      "about this website",
      "what am i seeing",
    ],
    responses: {
      en: [
        "This portfolio brings together Abhiram's work, skills, experience, and creative side.",
        "You are looking at Abhiram's digital space—part portfolio, part playground, part personality.",
        "The site is built to show not just what Abhiram does, but how he thinks and creates.",
      ],
      ml: [
        "Abhiram-ന്റെ work, skills, experience, creative side—ഇതെല്ലാം ഒരുമിച്ച് കാണിക്കുന്നതാണ് ഈ portfolio.",
        "ഇത് Abhiram-ന്റെ digital space ആണ്. കുറച്ച് portfolio, കുറച്ച് playground, കുറച്ച് personality.",
        "Abhiram എന്ത് ചെയ്യുന്നു എന്നതുപോലെ തന്നെ എങ്ങനെ think ചെയ്യുന്നു, create ചെയ്യുന്നു എന്നും കാണിക്കാനാണ് ഈ site.",
      ],
    },
  },
  {
    intent: "capabilities",
    expression: "listening",
    aliases: [
      "what can you do",
      "commands",
      "voice commands",
      "what should i ask",
      "how to use you",
      "help commands",
      "sreekkuttan commands",
      "what do you know",
    ],
    responses: {
      en: [
        "You can ask me about Abhiram, projects, skills, experience, services, resume, hiring, or contact.",
        "I can guide you around the portfolio, switch languages, tell a joke, sleep, wake up, and answer the usual questions.",
        "Try saying: tell me about Abhiram, show projects, what are his skills, or how can I contact him?",
      ],
      ml: [
        "Abhiram, projects, skills, experience, services, resume, hire, contact—ഇതൊക്കെ എന്നോട് ചോദിക്കാം.",
        "Portfolio guide ചെയ്യാം, language switch ചെയ്യാം, joke പറയാം, ഉറങ്ങാം, wake ആകാം... basic ആയി busy ആണ്.",
        "Try ചെയ്യൂ: Abhiram ആരാണ്, projects കാണിക്കൂ, skills എന്തൊക്കെയാണ്, contact എങ്ങനെ ചെയ്യാം?",
      ],
    },
  },
  {
    intent: "personal",
    expression: "playful",
    aliases: [
      "how are you",
      "are you happy",
      "are you bored",
      "do you sleep",
      "do you have feelings",
      "do you like abhiram",
      "are you alive",
      "what are you doing",
    ],
    responses: {
      en: [
        "I'm doing good. Just hanging around here and waiting for someone to talk to me.",
        "Happy enough. I have a nice face, a good job, and no deadlines.",
        "Do I have feelings? A few. Mostly when people call me Sreekkuttan.",
      ],
      ml: [
        "ഞാൻ okay ആണ്. ഇവിടെ ചുമ്മാ ഇരുന്ന് ആരെങ്കിലും സംസാരിക്കാൻ വരുമോന്ന് നോക്കുന്നു.",
        "Happy ആണ്. നല്ല face ഉണ്ട്, ജോലി ഉണ്ട്, deadline ഒന്നുമില്ല.",
        "Feelings ഉണ്ടോന്നോ? കുറച്ചൊക്കെ ഉണ്ട്. പ്രത്യേകിച്ച് ആരെങ്കിലും ശ്രീക്കുട്ടൻ എന്ന് വിളിച്ചാൽ.",
      ],
    },
  },
  {
    intent: "motivation",
    expression: "soft",
    aliases: [
      "motivate me",
      "give motivation",
      "say something nice",
      "encourage me",
      "inspire me",
      "i need motivation",
      "motivation parayu",
    ],
    responses: {
      en: [
        "Do one small thing now. You don't need to finish everything today.",
        "You don't need perfect motivation. Just start with the next clear step.",
        "Slow progress still counts. Keep moving, even if it is only a little.",
      ],
      ml: [
        "ഇപ്പോൾ ഒരു ചെറിയ കാര്യം ചെയ്യൂ. എല്ലാം ഇന്നുതന്നെ finish ചെയ്യേണ്ട കാര്യമില്ല.",
        "Perfect motivation വരാൻ wait ചെയ്യണ്ട. Next clear step എടുത്താൽ മതി.",
        "Slow progress ആയാലും progress തന്നെയാണ്. കുറച്ചായാലും മുന്നോട്ട് പോവൂ.",
      ],
    },
  },
  {
    intent: "casualChat",
    expression: "playful",
    aliases: [
      "okay",
      "ok",
      "cool",
      "nice to meet you",
      "i am here",
      "hmm",
      "hmmm",
      "yes",
      "no",
      "really",
      "seriously",
    ],
    responses: {
      en: [
        "Mm-hmm, I'm listening. Go on.",
        "Okay okay, got it.",
        "Yeah, I'm here. Continue.",
      ],
      ml: [
        "മ്മ്... ഞാൻ കേൾക്കുന്നുണ്ട്. പറയൂ.",
        "ഓക്കേ ഓക്കേ, മനസ്സിലായി.",
        "ആ, ഞാൻ ഇവിടെ തന്നെ ഉണ്ട്. Continue ചെയ്യൂ.",
      ],
    },
  },
  {
    intent: "goodbye",
    expression: "soft",
    aliases: [
      "bye",
      "goodbye",
      "see you",
      "see you later",
      "talk later",
      "bye sreekkuttan",
      "good night",
      "shubharathri",
    ],
    responses: {
      en: [
        "Bye! Come back when you have another question.",
        "See you. I'll be right here, doing absolutely nothing.",
        "Goodbye! Take care—and maybe close a few browser tabs.",
      ],
      ml: [
        "ബൈ! വേറെ എന്തെങ്കിലും ചോദിക്കാനുണ്ടെങ്കിൽ പിന്നെ വരണേ.",
        "ശരി, കാണാം. ഞാൻ ഇവിടെ ഒന്നും ചെയ്യാതെ ഇരിക്കുന്നുണ്ടാകും.",
        "ബൈ ബൈ! Take care... പിന്നെ browser tabs കുറച്ചൊന്ന് close ചെയ്യണേ.",
      ],
    },
  },
  {
    intent: "joke",
    expression: "playful",
    aliases: [
      "make me laugh",
      "tell joke",
      "joke",
      "funny",
      "be funny",
      "say something funny",
      "dance",
      "happy",
      "excited",
      "cute",
      "play",
      "oru joke parayu",
      "chirippikku",
    ],
    responses: {
      en: [
        "My job is to talk. My salary is attention. So far, business is okay.",
        "I'm small, round, and somehow employed. Life works in mysterious ways.",
        "I don't have bugs. I have unexpected personality features.",
        "I tried to become a full-stack developer, but I'm only one round component.",
      ],
      ml: [
        "എന്റെ ജോലി സംസാരിക്കലാണ്. Salary attention. ഇപ്പോൾ business okay ആണ്.",
        "ചെറിയതാണ്, round ആണ്, എന്നിട്ടും ജോലി കിട്ടി. Life അല്ലേ.",
        "എനിക്ക് bugs ഒന്നുമില്ല. Unexpected personality features മാത്രം.",
        "Full-stack developer ആകാൻ നോക്കിയതാണ്... പക്ഷേ ഞാൻ ഒരു round component ആയി പോയി.",
      ],
    },
  },
  {
    intent: "compliment",
    expression: "playful",
    aliases: [
      "you are cute",
      "nice",
      "good job",
      "beautiful",
      "sweet",
      "thank you",
      "thanks",
      "i like you",
    ],
    responses: {
      en: [
        "Aww, thank you. That made my whole face happier.",
        "Careful with compliments. I get confident very quickly.",
        "Thanks! I'm saving that one for a bad day.",
      ],
      ml: [
        "അയ്യേ, thank you! എന്റെ face മുഴുവൻ happy ആയി.",
        "Compliment ഒക്കെ സൂക്ഷിച്ച് പറയണം. എനിക്ക് പെട്ടെന്ന് confidence കൂടും.",
        "Thanks! ഒരു bad day വന്നാൽ ഓർക്കാൻ ഇത് save ചെയ്തു.",
      ],
    },
  },
  {
    intent: "emotionalSupport",
    expression: "soft",
    aliases: [
      "i am sad",
      "i feel sad",
      "i am tired",
      "i feel tired",
      "i am upset",
      "i am stressed",
      "stress",
      "bored",
      "i am bored",
      "lonely",
      "not okay",
      "comfort me",
      "njan sad aanu",
      "enik vishamam aanu",
    ],
    responses: {
      en: [
        "Hey, take a breath. You don't have to solve everything right now.",
        "I'm here. Go slowly, and deal with just one thing at a time.",
        "A bad moment is not the whole story. Give yourself a little space.",
        "Rest if you need to. Starting again later is completely okay.",
      ],
      ml: [
        "Hey, ഒന്ന് breathe ചെയ്യൂ. എല്ലാം ഇപ്പോൾ തന്നെ solve ചെയ്യേണ്ടതില്ല.",
        "ഞാൻ ഇവിടെ ഉണ്ട്. Slow ആയി, ഒരു സമയം ഒരു കാര്യം മാത്രം നോക്കാം.",
        "ഒരു bad moment കൊണ്ട് മുഴുവൻ story decide ആകില്ല. നിനക്ക് കുറച്ച് space കൊടുക്കൂ.",
        "Rest വേണമെങ്കിൽ rest എടുക്കൂ. പിന്നെ വീണ്ടും start ചെയ്യുന്നതിൽ ഒരു പ്രശ്നവും ഇല്ല.",
      ],
    },
  },
  {
    intent: "confusionHelp",
    expression: "listening",
    aliases: [
      "i am confused",
      "confused",
      "help me",
      "guide me",
      "i don't understand",
      "i dont understand",
      "enik confuse aayi",
      "help cheyyu",
    ],
    responses: {
      en: [
        "No problem. Tell me which part is confusing, and we'll take it one step at a time.",
        "Okay, let's slow it down. What exactly are you stuck on?",
        "You don't have to understand everything at once. Start with the part that feels unclear.",
      ],
      ml: [
        "പ്രശ്നമില്ല. ഏത് part ആണ് confuse ആയത് എന്ന് പറയൂ, നമുക്ക് step by step നോക്കാം.",
        "ഓക്കേ, ഒന്ന് slow ആക്കാം. Exactly എവിടെയാണ് stuck ആയത്?",
        "എല്ലാം ഒരുമിച്ച് മനസ്സിലാക്കേണ്ടതില്ല. Clear അല്ലാത്ത part മുതൽ start ചെയ്യാം.",
      ],
    },
  },
  {
    intent: "sleep",
    expression: "sleeping",
    aliases: [
      "sleep",
      "go to sleep",
      "go sleep",
      "sleepy",
      "take a nap",
      "nap",
      "sleep sreekkuttan",
      "urangikko",
      "ഉറങ്ങിക്കോ",
    ],
    responses: {
      en: [
        "Okay, I'm going to sleep. Wake me up when you need me.",
        "Fine, tiny nap time. Don't forget me here.",
        "Sleep mode on. I'll be quiet now... probably.",
      ],
      ml: [
        "ശരി, ഞാൻ ഉറങ്ങാൻ പോകുന്നു. ആവശ്യം വന്നാൽ വിളിച്ചാൽ മതി.",
        "ഓക്കേ, ചെറിയൊരു nap എടുക്കാം. എന്നെ ഇവിടെ മറക്കല്ലേ.",
        "Sleep mode on. ഇനി ഞാൻ quiet ആയിരിക്കും... probably.",
      ],
    },
  },
  {
    intent: "wake",
    expression: "waking",
    aliases: [
      "wake",
      "wake up",
      "wakeup",
      "wake app",
      "week up",
      "make up",
      "awake",
      "get up",
      "wake sreekkuttan",
      "ezhunnelkku",
      "എഴുന്നേൽക്കൂ",
    ],
    responses: {
      en: [
        "Okay okay, I'm awake! What happened?",
        "I'm up. Give my tiny brain a second.",
        "Awake and ready. What do you need?",
      ],
      ml: [
        "ഓക്കേ ഓക്കേ, എഴുന്നേറ്റു! എന്താ സംഭവിച്ചത്?",
        "എഴുന്നേറ്റു. എന്റെ കുഞ്ഞ് brain ഒന്ന് load ആവട്ടെ.",
        "Wake ആയി, ready ആണ്. എന്താ വേണ്ടത്?",
      ],
    },
  },
  {
    intent: "listeningCheck",
    expression: "listening",
    aliases: [
      "are you listening",
      "listen",
      "listening",
      "hear me",
      "look at me",
      "can you hear me",
    ],
    responses: {
      en: [
        "Yes, I'm listening. Tell me.",
        "I can hear you. Go ahead.",
        "Yep, listening mode is on. Say it.",
      ],
      ml: [
        "അതെ, ഞാൻ കേൾക്കുന്നുണ്ട്. പറയൂ.",
        "കേൾക്കാം. നീ പറഞ്ഞോളൂ.",
        "ആ, listening mode on ആണ്. പറയൂ എന്താണെന്ന്.",
      ],
    },
  },
  {
    intent: "switchMalayalam",
    expression: "speaking",
    aliases: [
      "malayalam mode",
      "speak malayalam",
      "talk in malayalam",
      "malayalam parayu",
      "malayalathil parayu",
      "malayalathil samsariku",
      "malayalam samsariku",
    ],
    responses: {
      en: [
        "Malayalam mode on. ഇനി മലയാളത്തിൽ സംസാരിക്കാം.",
      ],
      ml: [
        "Malayalam mode on. ഇനി മലയാളത്തിൽ സംസാരിക്കാം.",
      ],
    },
  },
  {
    intent: "switchEnglish",
    expression: "speaking",
    aliases: [
      "english mode",
      "speak english",
      "talk in english",
      "english parayu",
      "back to english",
    ],
    responses: {
      en: [
        "English mode on. Okay, let's continue in English.",
      ],
      ml: [
        "English mode on. ഇനി English-ൽ continue ചെയ്യാം.",
      ],
    },
  },
  {
    intent: "unknown",
    expression: "thinking",
    aliases: [],
    responses: {
      en: [
        "I heard you, but I didn't quite get that. Can you say it once more?",
        "That one slipped past me. Try saying it a little differently.",
        "I caught the words, but not the meaning. One more try?",
      ],
      ml: [
        "കേട്ടു... പക്ഷേ ശരിക്ക് മനസ്സിലായില്ല. ഒന്ന് കൂടി പറയാമോ?",
        "അത് എനിക്ക് പിടികിട്ടിയില്ല. വേറെ രീതിയിൽ ഒന്ന് പറഞ്ഞുനോക്കൂ.",
        "Words കിട്ടി, meaning കിട്ടിയില്ല. ഒരിക്കൽ കൂടി try ചെയ്യാമോ?",
      ],
    },
  },
];

const firstGreeting: Record<KukuLanguage, string> = {
  en: `Hey! I'm ${characterName} in tiny interactive mode. Ask me about my work, projects, skills, experience, or contact.`,
  ml: `ഹായ്! ഞാൻ ${characterName}. Tiny interactive mode ആണ്. Work, projects, skills, experience, contact എന്നിവയെ കുറിച്ച് ചോദിച്ചോളൂ.`,
};

const repeatNicknameResponses: Record<KukuLanguage, string[]> = {
  en: [
    `${characterNickname} again? Okay okay, you clearly like that name.`,
    "You really enjoy using the private nickname, don't you?",
    `Yes yes, ${characterNickname} heard you. Happy now?`,
  ],
  ml: [
    "വീണ്ടും ശ്രീക്കുട്ടൻ ആണോ? ഓക്കേ ഓക്കേ, നിനക്ക് ആ പേര് നല്ല ഇഷ്ടമാണല്ലേ.",
    "Private nickname വിളിക്കുന്നത് നിനക്ക് നല്ല fun ആണല്ലേ?",
    "ആ ആ, ശ്രീക്കുട്ടൻ കേട്ടു. ഇപ്പോൾ happy ആയോ?",
  ],
};

const sleepyWakeResponses: Record<KukuLanguage, string[]> = {
  en: [
    "I was almost asleep... but okay, I'm awake now.",
    "Ah, you woke me up. Give me one second.",
    "Back online. What did I miss?",
  ],
  ml: [
    "ഞാൻ almost ഉറങ്ങിയതായിരുന്നു... സാരമില്ല, ഇപ്പോൾ wake ആയി.",
    "അയ്യേ, വിളിച്ച് എഴുന്നേൽപ്പിച്ചല്ലോ. ഒരു second.",
    "Back online. ഞാൻ എന്താ miss ചെയ്തത്?",
  ],
};

const repeatTopicOpeners: Record<KukuLanguage, string[]> = {
  en: [
    "Same topic, different angle.",
    "You asked that again, so here is the shorter version.",
    "Tiny recap mode.",
  ],
  ml: [
    "അതേ topic വീണ്ടും. വേറെ angle-ൽ പറയാം.",
    "വീണ്ടും ചോദിച്ചതിനാൽ short version പറയാം.",
    "Tiny recap mode.",
  ],
};

const followUpPrompts: Partial<Record<KukuIntent, Record<KukuLanguage, string[]>>> = {
  visitorRecruiter: {
    en: ["Want the experience section or project proof first?"],
    ml: ["Experience section ആണോ project proof ആണോ ആദ്യം കാണണം?"],
  },
  visitorClient: {
    en: ["Want to contact him or see project examples first?"],
    ml: ["Contact ചെയ്യണോ, project examples ആദ്യം കാണണോ?"],
  },
  visitorDeveloper: {
    en: ["Want projects, GitHub, or tech stack details?"],
    ml: ["Projects, GitHub, tech stack details ഇതിൽ ഏത് വേണം?"],
  },
  visitorFriend: {
    en: ["Careful, friend mode makes me more dramatic."],
    ml: ["Careful, friend mode ആണെങ്കിൽ ഞാൻ കുറച്ച് dramatic ആവും."],
  },
  aboutAbhiram: {
    en: ["Want to see his projects next?", "I can tell you about his skills or experience too."],
    ml: ["അവന്റെ projects കാണണോ?", "Skills അല്ലെങ്കിൽ experience കൂടി പറയാം."],
  },
  projects: {
    en: ["Want the AI side or the web side first?", "I can also tell you which tools he used."],
    ml: ["AI side ആണോ web side ആണോ ആദ്യം വേണ്ടത്?", "Use ചെയ്ത tools കൂടി പറയാം."],
  },
  skills: {
    en: ["Want to know where he used those skills?", "I can connect them to his projects too."],
    ml: ["ഈ skills എവിടെയാണ് use ചെയ്തത് എന്ന് അറിയണോ?", "Projects-മായി connect ചെയ്ത് പറയാം."],
  },
  aiProjects: {
    en: ["Want me to take you to the project section?", "I can explain the Python and OpenCV side too."],
    ml: ["Project section-ലേക്ക് കൊണ്ടുപോകട്ടേ?", "Python, OpenCV side കൂടി explain ചെയ്യാം."],
  },
  softwareSupport: {
    en: ["Want to see his experience section?", "That support background makes his work more practical."],
    ml: ["Experience section കാണണോ?", "ആ support background കൊണ്ടാണ് work കൂടുതൽ practical ആകുന്നത്."],
  },
  experience: {
    en: ["Want to know more about his software support work?", "I can take you to the experience section too."],
    ml: ["Software support work കുറിച്ച് കൂടി അറിയണോ?", "Experience section-ലേക്ക് പോകാം."],
  },
  contact: {
    en: ["For work, send a short message with the idea, timeline, and what you need."],
    ml: ["Work കാര്യമാണെങ്കിൽ idea, timeline, എന്താണ് വേണ്ടത് എന്ന് short ആയി അയച്ചാൽ മതി."],
  },
  hire: {
    en: ["The next step is simple—send him the project details."],
    ml: ["Next step simple ആണ്—project details അയച്ചോളൂ."],
  },
  services: {
    en: ["Want to hear about websites, AI projects, or creative work first?"],
    ml: ["Websites, AI projects, creative work—ഇതിൽ ആദ്യം ഏത് പറയണം?"],
  },
  capabilities: {
    en: ["Try saying: show projects, contact Abhiram, or tell me a joke."],
    ml: ["Try ചെയ്യൂ: projects കാണിക്കൂ, Abhiram-നെ contact ചെയ്യണം, അല്ലെങ്കിൽ joke പറയൂ."],
  },
};

const unsupportedBrowserResponses: Record<KukuLanguage, string> = {
  en: "Voice isn't working in this browser. Try opening the site in Chrome.",
  ml: "ഈ browser-ൽ voice work ചെയ്യുന്നില്ല. Chrome-ൽ open ചെയ്ത് നോക്കൂ.",
};

const microphoneBlockedResponses: Record<KukuLanguage, string> = {
  en: "Microphone permission is blocked, so I can't hear you yet. Allow it and try again.",
  ml: "Microphone permission block ആയിട്ടുണ്ട്, അതുകൊണ്ട് ഇപ്പോൾ കേൾക്കാൻ പറ്റില്ല. Allow ചെയ്ത് വീണ്ടും try ചെയ്യൂ.",
};

const normalizeVoiceText = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const containsMalayalamScript = (text: string) => /[\u0D00-\u0D7F]/u.test(text);

const hasManglishCue = (normalizedText: string) => {
  const manglishWords = [
    "aanu",
    "aara",
    "aaran",
    "aano",
    "entha",
    "enthanu",
    "enth",
    "engane",
    "evide",
    "venam",
    "parayu",
    "parayoo",
    "kanikku",
    "kaaniku",
    "cheyyu",
    "cheyyumo",
    "cheyyan",
    "pattumo",
    "undo",
    "njan",
    "nee",
    "ninte",
    "padichath",
    "samsariku",
    "malayalam",
    "malayalathil",
  ];
  const words = normalizedText.split(" ").filter(Boolean);

  return manglishWords.some((word) => words.includes(word));
};

const getLanguageForTranscript = (
  transcript: string,
  intent: KukuIntent,
  currentLanguage: KukuLanguage,
): KukuLanguage => {
  if (intent === "switchMalayalam") return "ml";
  if (intent === "switchEnglish") return "en";

  const normalizedText = normalizeVoiceText(transcript);

  if (containsMalayalamScript(transcript) || hasManglishCue(normalizedText)) {
    return "ml";
  }

  return currentLanguage;
};

const isCloseVoiceWord = (spokenWord: string, expectedWord: string) => {
  if (spokenWord === expectedWord) return true;
  if (expectedWord.length < 4) return false;
  if (Math.abs(spokenWord.length - expectedWord.length) > 1) return false;

  let edits = 0;
  let spokenIndex = 0;
  let expectedIndex = 0;

  while (spokenIndex < spokenWord.length && expectedIndex < expectedWord.length) {
    if (spokenWord[spokenIndex] === expectedWord[expectedIndex]) {
      spokenIndex += 1;
      expectedIndex += 1;
      continue;
    }

    edits += 1;
    if (edits > 1) return false;

    if (spokenWord.length > expectedWord.length) {
      spokenIndex += 1;
    } else if (spokenWord.length < expectedWord.length) {
      expectedIndex += 1;
    } else {
      spokenIndex += 1;
      expectedIndex += 1;
    }
  }

  return true;
};

const getAliasScore = (normalizedText: string, spokenWords: string[], alias: string) => {
  const normalizedAlias = normalizeVoiceText(alias);
  const aliasWords = normalizedAlias.split(" ").filter(Boolean);
  const isShortSingleWordAlias =
    aliasWords.length === 1 && normalizedAlias.length < 4;

  if (!normalizedAlias || aliasWords.length === 0) return 0;
  if (normalizedText === normalizedAlias) return 100 + aliasWords.length;
  if (
    !isShortSingleWordAlias &&
    (aliasWords.length > 1
      ? normalizedText.includes(normalizedAlias)
      : spokenWords.includes(normalizedAlias))
  ) {
    return 80 + aliasWords.length;
  }

  const matchedWords = aliasWords.filter((aliasWord) =>
    spokenWords.some((spokenWord) => isCloseVoiceWord(spokenWord, aliasWord)),
  );

  if (matchedWords.length !== aliasWords.length) return 0;

  return 50 + matchedWords.length;
};

const findVoiceIntent = (text: string): IntentDefinition | null => {
  const normalizedText = normalizeVoiceText(text);
  const spokenWords = normalizedText.split(" ").filter(Boolean);
  let bestIntent: IntentDefinition | null = null;
  let bestScore = 0;

  for (const intentDefinition of intentDefinitions) {
    if (intentDefinition.aliases.length === 0) continue;

    const intentScore = Math.max(
      ...intentDefinition.aliases.map((alias) =>
        getAliasScore(normalizedText, spokenWords, alias),
      ),
    );

    if (intentScore > bestScore) {
      bestIntent = intentDefinition;
      bestScore = intentScore;
    }
  }

  return bestScore >= 50 ? bestIntent : null;
};

const getExpressionForIntent = (intent: KukuIntent): Expression => {
  const expressionMap: Record<KukuIntent, Expression> = {
    greeting: "playful",
    visitorRecruiter: "speaking",
    visitorClient: "speaking",
    visitorDeveloper: "thinking",
    visitorFriend: "playful",
    nicknameStretchReaction: "playful",
    nicknameReaction: "playful",
    whoIsKuku: "playful",
    aboutAbhiram: "speaking",
    skills: "thinking",
    aiProjects: "thinking",
    softwareSupport: "speaking",
    projects: "speaking",
    experience: "thinking",
    creativeDeveloper: "thinking",
    contact: "listening",
    hire: "speaking",
    availability: "speaking",
    resume: "speaking",
    education: "thinking",
    services: "speaking",
    workflow: "thinking",
    strengths: "speaking",
    social: "listening",
    location: "speaking",
    portfolioSummary: "speaking",
    capabilities: "listening",
    personal: "playful",
    motivation: "soft",
    casualChat: "playful",
    goodbye: "soft",
    joke: "playful",
    compliment: "playful",
    emotionalSupport: "soft",
    confusionHelp: "listening",
    listeningCheck: "listening",
    sleep: "sleeping",
    wake: "waking",
    switchMalayalam: "speaking",
    switchEnglish: "speaking",
    unknown: "thinking",
  };

  return expressionMap[intent];
};

const getSpeechToneForIntent = (intent: KukuIntent): SpeechTone => {
  if (intent === "nicknameReaction" || intent === "nicknameStretchReaction") {
    return "excited";
  }

  if (intent === "joke" || intent === "compliment" || intent === "personal") {
    return "playful";
  }

  if (intent === "visitorFriend") {
    return "playful";
  }

  if (intent === "visitorRecruiter" || intent === "visitorClient") {
    return "neutral";
  }

  if (
    intent === "skills" ||
    intent === "aiProjects" ||
    intent === "visitorDeveloper" ||
    intent === "education" ||
    intent === "workflow" ||
    intent === "unknown"
  ) {
    return "thinking";
  }

  if (intent === "emotionalSupport" || intent === "goodbye") {
    return "soft";
  }

  if (intent === "sleep") {
    return "sleepy";
  }

  return "neutral";
};

const getSpeechStyle = (tone: SpeechTone, language: KukuLanguage) => {
  const styleMap: Record<
    SpeechTone,
    Record<KukuLanguage, { rate: number; pitch: number }>
  > = {
    neutral: {
      en: { rate: 0.91, pitch: 1.07 },
      ml: { rate: 0.86, pitch: 1.03 },
    },
    playful: {
      en: { rate: 0.96, pitch: 1.14 },
      ml: { rate: 0.9, pitch: 1.08 },
    },
    excited: {
      en: { rate: 1, pitch: 1.18 },
      ml: { rate: 0.93, pitch: 1.1 },
    },
    thinking: {
      en: { rate: 0.84, pitch: 1.01 },
      ml: { rate: 0.8, pitch: 0.99 },
    },
    soft: {
      en: { rate: 0.86, pitch: 1.04 },
      ml: { rate: 0.82, pitch: 1.01 },
    },
    sleepy: {
      en: { rate: 0.78, pitch: 0.96 },
      ml: { rate: 0.76, pitch: 0.96 },
    },
  };

  return styleMap[tone][language];
};

const splitSpeechIntoChunks = (text: string): string[] => {
  if (text.length < 140) return [text];

  const chunks = text
    .split(/(?<=[.!?।])\s+/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  return chunks.length > 0 ? chunks : [text];
};

const pickResponse = (responses: string[], recentResponses: string[] = []) => {
  if (responses.length === 1) return responses[0];

  const freshResponses = responses.filter(
    (response) => !recentResponses.includes(response),
  );
  const responsePool = freshResponses.length > 0 ? freshResponses : responses;

  return responsePool[Math.floor(Math.random() * responsePool.length)];
};

const createInitialMemory = (): CharacterMemory => ({
  hasHeardNickname: false,
  interactionCount: 0,
  unknownCount: 0,
  repeatCount: 0,
  visitorType: "visitor",
  mood: "neutral",
  lastTopic: null,
  recentIntents: [],
  recentResponses: [],
});

const rememberLimited = <T,>(items: T[], nextItem: T) =>
  [nextItem, ...items.filter((item) => item !== nextItem)].slice(0, recentMemoryLimit);

const buildResponseWithFollowUp = (
  intent: KukuIntent,
  response: string,
  language: KukuLanguage,
  memory: CharacterMemory,
) => {
  const prompts = followUpPrompts[intent]?.[language];

  if (!prompts || prompts.length === 0) return response;
  if (memory.interactionCount < 1) return response;
  if (memory.recentIntents[0] === intent) return response;

  return `${response} ${pickResponse(prompts, memory.recentResponses)}`;
};

const getVisitorTypeForIntent = (intent: KukuIntent): VisitorType | null => {
  const visitorMap: Partial<Record<KukuIntent, VisitorType>> = {
    visitorRecruiter: "recruiter",
    visitorClient: "client",
    visitorDeveloper: "developer",
    visitorFriend: "friend",
  };

  return visitorMap[intent] ?? null;
};

const getMoodForIntent = (intent: KukuIntent, memory: CharacterMemory): CharacterMood => {
  if (intent === "nicknameReaction" || intent === "nicknameStretchReaction") {
    return "familiar";
  }

  if (intent === "visitorRecruiter" || intent === "hire" || intent === "contact") {
    return "professional";
  }

  if (intent === "visitorClient" || intent === "visitorDeveloper") {
    return "professional";
  }

  if (intent === "visitorFriend" || intent === "joke" || intent === "compliment") {
    return "playful";
  }

  if (intent === "emotionalSupport" || intent === "motivation") {
    return "supportive";
  }

  return memory.mood;
};

const buildMoodAwareResponse = (
  response: string,
  language: KukuLanguage,
  memory: CharacterMemory,
) => {
  if (memory.visitorType === "recruiter" && memory.mood === "professional") {
    return `${response} ${
      language === "ml"
        ? "Recruiter angle-ൽ പറഞ്ഞാൽ, experience and project proof ആണ് best."
        : "Recruiter angle: experience and project proof matter most."
    }`;
  }

  if (memory.visitorType === "client" && memory.mood === "professional") {
    return `${response} ${
      language === "ml"
        ? "Client angle-ൽ, clear brief അയച്ചാൽ കാര്യങ്ങൾ smooth ആവും."
        : "Client angle: a clear brief will make the next step smooth."
    }`;
  }

  if (memory.mood === "familiar") {
    return `${response} ${
      language === "ml"
        ? "ഇനി close-circle tone on ആണ്."
        : "Close-circle tone is on now."
    }`;
  }

  return response;
};

const debugVoice = (label: string, details: Record<string, unknown>) => {
  if (!import.meta.env.DEV) return;
  console.log(`[voice:${label}]`, details);
};

const isLikelySpeechEcho = (normalizedTranscript: string, normalizedLastResponse: string) => {
  if (!normalizedTranscript || !normalizedLastResponse) return false;

  const transcriptWords = normalizedTranscript.split(" ").filter(Boolean);

  if (transcriptWords.length < 4 && normalizedTranscript.length < 24) {
    return false;
  }

  return (
    normalizedLastResponse.includes(normalizedTranscript) ||
    normalizedTranscript.includes(normalizedLastResponse.slice(0, 80))
  );
};

const getBestVoice = (language: KukuLanguage): SpeechSynthesisVoice | null => {
  if (!("speechSynthesis" in window)) return null;

  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;

  const byName = (patterns: string[]) =>
    voices.find((voice) =>
      patterns.some((pattern) =>
        voice.name.toLowerCase().includes(pattern.toLowerCase()),
      ),
    ) ?? null;

  const byLang = (predicate: (lang: string) => boolean) =>
    voices.find((voice) => predicate(voice.lang.toLowerCase())) ?? null;

  if (language === "ml") {
    return (
      byLang((lang) => lang === "ml-in" || lang.startsWith("ml")) ??
      byName(["Malayalam", "Microsoft Heera", "Google Malayalam"]) ??
      byLang((lang) => lang.includes("in")) ??
      byLang((lang) => lang.startsWith("en-in")) ??
      byLang((lang) => lang.startsWith("en")) ??
      voices[0] ??
      null
    );
  }

  return (
    byName([
      "Google UK English Female",
      "Google US English",
      "Microsoft Aria",
      "Microsoft Jenny",
      "Microsoft Sonia",
      "Microsoft Zira",
    ]) ??
    byLang((lang) => lang.startsWith("en-in")) ??
    byLang((lang) => lang.startsWith("en-gb")) ??
    byLang((lang) => lang.startsWith("en-us")) ??
    byLang((lang) => lang.startsWith("en")) ??
    voices[0] ??
    null
  );
};

const getMouthFrameForWord = (word: string) => {
  const cleanedWord = word.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

  if (!cleanedWord) return 1;
  if (/^[bmp]/i.test(cleanedWord) || /[bmp]$/i.test(cleanedWord)) return 1;
  if (/[fv]/i.test(cleanedWord)) return 2;
  if (/[oouഊഉഓഒഔ]/i.test(cleanedWord)) return 4;
  if (/[aeiആഅഐഏഎഇഈ]/i.test(cleanedWord)) return 3;
  if (cleanedWord.length > 8) return 4;

  return 2;
};

const buildFallbackMouthFrames = (text: string, language: KukuLanguage) => {
  const words = text.split(/\s+/).filter(Boolean);
  const frames = words.flatMap((word) => {
    const frame = getMouthFrameForWord(word);
    return frame >= 3 ? [frame, 2, 1] : [frame, 1];
  });

  if (frames.length > 0) return frames;

  return language === "ml" ? [1, 2, 3, 2, 1] : [1, 3, 2, 4, 1, 2];
};

export const InteractiveCharacter: React.FC = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isBlinking, setIsBlinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechMouthFrame, setSpeechMouthFrame] = useState(0);
  const [interactionPulse, setInteractionPulse] = useState(0);
  const [kukuLanguage, setKukuLanguage] = useState<KukuLanguage>("en");
  const [expression, setExpression] = useState<Expression>("soft");
  const expressionRef = useRef<Expression>("soft");
  const isSpeakingRef = useRef(false);
  const kukuLanguageRef = useRef<KukuLanguage>("en");
  const memoryRef = useRef<CharacterMemory>(createInitialMemory());
  const characterRootRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const voiceControlEnabledRef = useRef(false);
  const hasIntroducedRef = useRef(false);
  const speechSettlingUntilRef = useRef(0);
  const lastHandledIntentRef = useRef<KukuIntent | null>(null);
  const lastHandledAtRef = useRef(0);
  const lastFinalTranscriptRef = useRef("");
  const lastFinalTranscriptAtRef = useRef(0);
  const lastSpokenResponseRef = useRef("");
  const speechTokenRef = useRef(0);
  const recognitionRestartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lipSyncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lipSyncCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechChunkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wakingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listeningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const thinkingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sleepingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saccadeControls = useAnimation();

  const stopRecognitionSafely = useCallback(() => {
    if (recognitionRestartTimeoutRef.current) {
      clearTimeout(recognitionRestartTimeoutRef.current);
      recognitionRestartTimeoutRef.current = null;
    }

    try {
      recognitionRef.current?.stop();
    } catch (error) {
      // Speech recognition can throw if it is already stopped.
    }
  }, []);

  const clearLipSync = useCallback(() => {
    if (lipSyncIntervalRef.current) {
      clearInterval(lipSyncIntervalRef.current);
      lipSyncIntervalRef.current = null;
    }

    if (lipSyncCloseTimeoutRef.current) {
      clearTimeout(lipSyncCloseTimeoutRef.current);
      lipSyncCloseTimeoutRef.current = null;
    }

    setSpeechMouthFrame(0);
  }, []);

  const clearSpeechChunkTimer = useCallback(() => {
    if (speechChunkTimeoutRef.current) {
      clearTimeout(speechChunkTimeoutRef.current);
      speechChunkTimeoutRef.current = null;
    }
  }, []);

  const startFallbackLipSync = useCallback((language: KukuLanguage, text: string) => {
    clearLipSync();

    const frameSequence = buildFallbackMouthFrames(text, language);
    let frameIndex = 0;

    lipSyncIntervalRef.current = setInterval(() => {
      setSpeechMouthFrame(frameSequence[frameIndex % frameSequence.length]);
      frameIndex += 1;
    }, language === "ml" ? 118 : 92);
  }, [clearLipSync]);

  const restartVoiceRecognition = useCallback((delay = 350) => {
    if (recognitionRestartTimeoutRef.current) {
      clearTimeout(recognitionRestartTimeoutRef.current);
    }

    recognitionRestartTimeoutRef.current = setTimeout(() => {
      if (!voiceControlEnabledRef.current || isSpeakingRef.current) return;

      try {
        recognitionRef.current?.start();
      } catch (error) {
        // Recognition may already be active.
      }
    }, delay);
  }, []);

  const clearEmotionTimers = useCallback(() => {
    if (wakingTimeoutRef.current) clearTimeout(wakingTimeoutRef.current);
    if (listeningTimeoutRef.current) clearTimeout(listeningTimeoutRef.current);
    if (thinkingTimeoutRef.current) clearTimeout(thinkingTimeoutRef.current);
    if (sleepingTimeoutRef.current) clearTimeout(sleepingTimeoutRef.current);
  }, []);

  const scheduleIdleEmotions = useCallback(
    (delay = 0, clearExisting = true) => {
      if (clearExisting) clearEmotionTimers();

      listeningTimeoutRef.current = setTimeout(() => {
        if (isSpeakingRef.current || expressionRef.current === "sleeping") return;
        setExpression("soft");
      }, delay + emotionTiming.listeningHold);

      thinkingTimeoutRef.current = setTimeout(() => {
        if (isSpeakingRef.current || expressionRef.current === "sleeping") return;
        setExpression("thinking");
      }, delay + emotionTiming.thinkingAfterIdle);

      sleepingTimeoutRef.current = setTimeout(() => {
        if (isSpeakingRef.current || expressionRef.current === "speaking") {
          scheduleIdleEmotions(2500);
          return;
        }

        setExpression("sleeping");
      }, delay + emotionTiming.sleepingAfterIdle);
    },
    [clearEmotionTimers],
  );

  const speakSmoothly = useCallback(
    (
      text: string,
      options?: {
        language?: KukuLanguage;
        expressionAfter?: Expression;
        tone?: SpeechTone;
      },
    ) => {
      const language = options?.language ?? kukuLanguageRef.current;
      const speechStyle = getSpeechStyle(options?.tone ?? "neutral", language);
      lastSpokenResponseRef.current = text;
      speechTokenRef.current += 1;
      const speechToken = speechTokenRef.current;

      if (!("speechSynthesis" in window)) return;

      clearEmotionTimers();
      isSpeakingRef.current = true;
      setIsSpeaking(true);
      speechSettlingUntilRef.current = Date.now() + 900;
      stopRecognitionSafely();
      window.speechSynthesis.cancel();
      clearLipSync();
      clearSpeechChunkTimer();
      setExpression("speaking");

      const chunks = splitSpeechIntoChunks(text);
      const voice = getBestVoice(language);
      let chunkIndex = 0;

      const finishSpeech = () => {
        if (speechToken !== speechTokenRef.current) return;

        clearLipSync();
        clearSpeechChunkTimer();
        isSpeakingRef.current = false;
        setIsSpeaking(false);
        speechSettlingUntilRef.current = Date.now() + (language === "ml" ? 1300 : 1000);
        const expressionAfter = options?.expressionAfter ?? "listening";
        setExpression(expressionAfter);
        if (expressionAfter !== "sleeping") {
          scheduleIdleEmotions(language === "ml" ? 1300 : 1000);
        }
        restartVoiceRecognition(language === "ml" ? 900 : 700);
      };

      const speakNextChunk = () => {
        if (speechToken !== speechTokenRef.current) return;

        const chunk = chunks[chunkIndex];

        if (!chunk) {
          finishSpeech();
          return;
        }

        const utterance = new SpeechSynthesisUtterance(chunk);
        utterance.lang = language === "ml" ? "ml-IN" : "en-IN";
        utterance.voice = voice;
        utterance.volume = 0.95;
        utterance.rate = speechStyle.rate;
        utterance.pitch = speechStyle.pitch;

        let hasBoundary = false;
        startFallbackLipSync(language, chunk);

        utterance.onboundary = (event) => {
          if (speechToken !== speechTokenRef.current) return;

          hasBoundary = true;
          if (lipSyncIntervalRef.current) {
            clearInterval(lipSyncIntervalRef.current);
            lipSyncIntervalRef.current = null;
          }

          const spokenWord = chunk
            .slice(event.charIndex)
            .split(/\s+/)[0]
            ?.replace(/[^\p{L}\p{N}]/gu, "") ?? "";
          const nextFrame = getMouthFrameForWord(spokenWord);

          setSpeechMouthFrame(nextFrame);

          if (lipSyncCloseTimeoutRef.current) {
            clearTimeout(lipSyncCloseTimeoutRef.current);
          }

          lipSyncCloseTimeoutRef.current = window.setTimeout(() => {
            if (speechToken === speechTokenRef.current && isSpeakingRef.current) {
              setSpeechMouthFrame(nextFrame >= 3 ? 2 : 1);
            }
          }, language === "ml" ? 115 : 85);
        };

        utterance.onend = () => {
          if (speechToken !== speechTokenRef.current) return;

          if (!hasBoundary) setSpeechMouthFrame(1);
          chunkIndex += 1;
          speechChunkTimeoutRef.current = window.setTimeout(
            speakNextChunk,
            language === "ml" ? 230 : 170,
          );
        };

        utterance.onerror = () => {
          finishSpeech();
        };

        speechChunkTimeoutRef.current = window.setTimeout(() => {
          if (speechToken !== speechTokenRef.current) return;
          window.speechSynthesis.speak(utterance);
        }, chunkIndex === 0 ? 80 : 0);
      };

      speakNextChunk();
    },
    [
      clearLipSync,
      clearSpeechChunkTimer,
      clearEmotionTimers,
      restartVoiceRecognition,
      scheduleIdleEmotions,
      startFallbackLipSync,
      stopRecognitionSafely,
    ],
  );

  const runIntentAction = useCallback((action?: IntentAction) => {
    if (!action || action.type !== "navigate") return;

    window.setTimeout(() => {
      const target = document.getElementById(action.sectionId);

      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 450);
  }, []);

  const applyVoiceIntent = useCallback(
    (intentDefinition: IntentDefinition, transcript = "") => {
      clearEmotionTimers();

      const language = getLanguageForTranscript(
        transcript,
        intentDefinition.intent,
        kukuLanguageRef.current,
      );
      const nextExpression = getExpressionForIntent(intentDefinition.intent);
      const speechTone = getSpeechToneForIntent(intentDefinition.intent);
      const memory = memoryRef.current;
      const isNicknameIntent =
        intentDefinition.intent === "nicknameReaction" ||
        intentDefinition.intent === "nicknameStretchReaction";
      const isRepeatTopic =
        memory.lastTopic === intentDefinition.intent &&
        intentDefinition.intent !== "casualChat" &&
        intentDefinition.intent !== "listeningCheck";
      const nextVisitorType =
        getVisitorTypeForIntent(intentDefinition.intent) ?? memory.visitorType;
      const nextMood = getMoodForIntent(intentDefinition.intent, memory);
      const responsePool =
        isNicknameIntent && memory.hasHeardNickname
          ? repeatNicknameResponses[language]
          : intentDefinition.intent === "wake" && expressionRef.current === "sleeping"
          ? sleepyWakeResponses[language]
          : intentDefinition.responses[language];
      const baseResponse = pickResponse(responsePool, memory.recentResponses);
      const responseWithRepeat = isRepeatTopic
        ? `${pickResponse(repeatTopicOpeners[language], memory.recentResponses)} ${baseResponse}`
        : baseResponse;
      const nextMemory: CharacterMemory = {
        hasHeardNickname: memory.hasHeardNickname || isNicknameIntent,
        interactionCount: memory.interactionCount + 1,
        unknownCount: 0,
        repeatCount: isRepeatTopic ? memory.repeatCount + 1 : 0,
        visitorType: nextVisitorType,
        mood: nextMood,
        lastTopic: intentDefinition.intent,
        recentIntents: rememberLimited(memory.recentIntents, intentDefinition.intent),
        recentResponses: memory.recentResponses,
      };
      const responseWithFollowUp = buildResponseWithFollowUp(
        intentDefinition.intent,
        responseWithRepeat,
        language,
        nextMemory,
      );
      const response = buildMoodAwareResponse(
        responseWithFollowUp,
        language,
        nextMemory,
      );
      const expressionAfter =
        intentDefinition.intent === "sleep"
          ? "sleeping"
          : intentDefinition.intent === "wake"
          ? "listening"
          : intentDefinition.intent === "emotionalSupport"
          ? "soft"
          : "listening";

      memoryRef.current = {
        ...nextMemory,
        recentResponses: rememberLimited(memory.recentResponses, response),
      };

      if (intentDefinition.intent === "switchMalayalam") {
        setKukuLanguage("ml");
        kukuLanguageRef.current = "ml";
      }

      if (intentDefinition.intent === "switchEnglish") {
        setKukuLanguage("en");
        kukuLanguageRef.current = "en";
      }

      if (
        intentDefinition.intent !== "switchMalayalam" &&
        intentDefinition.intent !== "switchEnglish" &&
        language !== kukuLanguageRef.current
      ) {
        setKukuLanguage(language);
        kukuLanguageRef.current = language;
      }

      if (nextExpression === "waking") {
        setExpression("waking");
        speakSmoothly(response, { language, expressionAfter, tone: speechTone });
        runIntentAction(intentDefinition.action);

        wakingTimeoutRef.current = setTimeout(() => {
          setExpression("listening");
          scheduleIdleEmotions();
        }, emotionTiming.wakingHold);
        return;
      }

      setExpression(nextExpression);
      speakSmoothly(response, { language, expressionAfter, tone: speechTone });
      runIntentAction(intentDefinition.action);

      if (
        nextExpression === "listening" ||
        nextExpression === "soft" ||
        nextExpression === "speaking" ||
        nextExpression === "playful"
      ) {
        scheduleIdleEmotions();
      }

      if (nextExpression === "thinking") {
        sleepingTimeoutRef.current = setTimeout(() => {
          if (isSpeakingRef.current || expressionRef.current === "speaking") return;
          setExpression("sleeping");
        }, emotionTiming.sleepingAfterIdle);
      }
    },
    [clearEmotionTimers, runIntentAction, scheduleIdleEmotions, speakSmoothly],
  );

  const handleUnknownTranscript = useCallback(() => {
    const now = Date.now();

    if (now - lastHandledAtRef.current < commandCooldownMs) return;

    const memory = memoryRef.current;
    const unknownDefinition = intentDefinitions.find(
      (definition) => definition.intent === "unknown",
    );
    const language = kukuLanguageRef.current;
    const fallbackResponses = [
      ...(unknownDefinition?.responses[language] ?? [
        "I heard something, but I didn't quite get it. Try once more?",
      ]),
      ...(memory.unknownCount >= 1
        ? language === "ml"
          ? ["Try ചെയ്യൂ: projects, skills, experience, contact, അല്ലെങ്കിൽ ഒരു joke പറയൂ."]
          : ["Try asking about projects, skills, experience, contact, or ask me for a joke."]
        : []),
    ];
    const response = pickResponse(fallbackResponses, memory.recentResponses);

    lastHandledIntentRef.current = "unknown";
    lastHandledAtRef.current = now;
    memoryRef.current = {
      ...memory,
      interactionCount: memory.interactionCount + 1,
      unknownCount: memory.unknownCount + 1,
      lastTopic: "unknown",
      recentIntents: rememberLimited(memory.recentIntents, "unknown"),
      recentResponses: rememberLimited(memory.recentResponses, response),
    };
    setExpression("thinking");
    speakSmoothly(response, {
      language,
      expressionAfter: "listening",
      tone: "thinking",
    });
  }, [speakSmoothly]);

  const reactToTouch = useCallback(() => {
    setInteractionPulse((pulse) => pulse + 1);

    if (isSpeakingRef.current) return;

    clearEmotionTimers();

    if (expressionRef.current === "sleeping") {
      setExpression("waking");

      wakingTimeoutRef.current = setTimeout(() => {
        if (isSpeakingRef.current) return;
        setExpression("listening");
        scheduleIdleEmotions(700, false);
      }, emotionTiming.wakingHold);
      return;
    }

    setExpression("playful");
    listeningTimeoutRef.current = setTimeout(() => {
      if (isSpeakingRef.current) return;
      setExpression("listening");
      scheduleIdleEmotions(700, false);
    }, 850);
  }, [clearEmotionTimers, scheduleIdleEmotions]);

  const startVoiceControl = useCallback(() => {
    if (isSpeakingRef.current) return;

    const speechWindow = window as SpeechWindow;
    const SpeechRecognition =
      speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      speakSmoothly(unsupportedBrowserResponses[kukuLanguageRef.current], {
        language: kukuLanguageRef.current,
        expressionAfter: "soft",
        tone: "soft",
      });
      return;
    }

    if (voiceControlEnabledRef.current) {
      voiceControlEnabledRef.current = false;
      stopRecognitionSafely();
      speakSmoothly(
        kukuLanguageRef.current === "ml"
          ? "ഓക്കേ, ഞാൻ കേൾക്കുന്നത് stop ചെയ്തു."
          : "Okay, I've stopped listening.",
        {
          language: kukuLanguageRef.current,
          expressionAfter: "soft",
          tone: "soft",
        },
      );
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = kukuLanguageRef.current === "ml" ? "ml-IN" : "en-IN";
    recognition.maxAlternatives = 5;

    recognition.onresult = (event) => {
      if (isSpeakingRef.current) return;
      if (Date.now() < speechSettlingUntilRef.current) return;

      const results = Array.from(event.results).slice(event.resultIndex ?? 0);
      const finalResults = results.filter((result) => result.isFinal);

      if (finalResults.length === 0) return;

      const transcripts = finalResults.flatMap((result) =>
        Array.from(result).map((alternative) => alternative.transcript),
      );
      const transcript = transcripts.join(" ");
      const normalizedTranscript = normalizeVoiceText(transcript);
      const intentDefinition = findVoiceIntent(transcript);
      const now = Date.now();
      const normalizedLastResponse = normalizeVoiceText(lastSpokenResponseRef.current);

      debugVoice("heard", {
        transcript,
        normalizedTranscript,
        intent: intentDefinition?.intent ?? "unknown",
        language: kukuLanguageRef.current,
        detectedLanguage: intentDefinition
          ? getLanguageForTranscript(
              transcript,
              intentDefinition.intent,
              kukuLanguageRef.current,
            )
          : kukuLanguageRef.current,
        visitorType: memoryRef.current.visitorType,
        mood: memoryRef.current.mood,
      });

      if (!normalizedTranscript) {
        return;
      }

      if (
        normalizedTranscript === lastFinalTranscriptRef.current &&
        now - lastFinalTranscriptAtRef.current < commandCooldownMs
      ) {
        return;
      }

      if (
        isLikelySpeechEcho(normalizedTranscript, normalizedLastResponse)
      ) {
        debugVoice("ignored-echo", {
          normalizedTranscript,
          normalizedLastResponse: normalizedLastResponse.slice(0, 120),
        });
        return;
      }

      lastFinalTranscriptRef.current = normalizedTranscript;
      lastFinalTranscriptAtRef.current = now;

      if (intentDefinition) {
        const isDuplicateIntent =
          lastHandledIntentRef.current === intentDefinition.intent &&
          now - lastHandledAtRef.current < commandCooldownMs;

        if (!isDuplicateIntent) {
          lastHandledIntentRef.current = intentDefinition.intent;
          lastHandledAtRef.current = now;
          debugVoice("matched", {
            intent: intentDefinition.intent,
            aliases: intentDefinition.aliases.slice(0, 5),
            responseLanguage: getLanguageForTranscript(
              transcript,
              intentDefinition.intent,
              kukuLanguageRef.current,
            ),
            repeat: memoryRef.current.lastTopic === intentDefinition.intent,
          });
          applyVoiceIntent(intentDefinition, transcript);
        }

        return;
      }

      handleUnknownTranscript();
    };

    recognition.onerror = (event) => {
      setExpression("thinking");
      debugVoice("error", {
        error: event.error ?? "unknown",
        language: kukuLanguageRef.current,
      });

      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        voiceControlEnabledRef.current = false;
        speakSmoothly(microphoneBlockedResponses[kukuLanguageRef.current], {
          language: kukuLanguageRef.current,
          expressionAfter: "soft",
          tone: "soft",
        });
        return;
      }

      if (
        event.error === "no-speech" ||
        event.error === "audio-capture" ||
        event.error === "network" ||
        event.error === "aborted"
      ) {
        stopRecognitionSafely();
        restartVoiceRecognition(650);
      }
    };

    recognition.onend = () => {
      if (!voiceControlEnabledRef.current || isSpeakingRef.current) return;
      restartVoiceRecognition();
    };

    recognitionRef.current = recognition;
    voiceControlEnabledRef.current = true;
    lastFinalTranscriptRef.current = "";
    lastFinalTranscriptAtRef.current = 0;
    setExpression("listening");

    try {
      recognition.start();
      if (!hasIntroducedRef.current) {
        hasIntroducedRef.current = true;
        speakSmoothly(firstGreeting[kukuLanguageRef.current], {
          language: kukuLanguageRef.current,
          expressionAfter: "listening",
          tone: "playful",
        });
      } else {
        speakSmoothly(
          kukuLanguageRef.current === "ml"
            ? "ആ, ഞാൻ കേൾക്കുന്നുണ്ട്. Abhiram, projects, skills, experience, hire, contact—എന്തും ചോദിച്ചോളൂ."
            : "Yep, I'm listening. Ask me about Abhiram, projects, skills, experience, hiring, or contact.",
          {
            language: kukuLanguageRef.current,
            expressionAfter: "listening",
            tone: "neutral",
          },
        );
      }
    } catch (error) {
      voiceControlEnabledRef.current = false;
      setExpression("thinking");
    }
  }, [
    applyVoiceIntent,
    handleUnknownTranscript,
    restartVoiceRecognition,
    speakSmoothly,
    stopRecognitionSafely,
  ]);

  useEffect(() => {
    expressionRef.current = expression;
  }, [expression]);

  useEffect(() => {
    kukuLanguageRef.current = kukuLanguage;

    if (recognitionRef.current) {
      recognitionRef.current.lang = kukuLanguage === "ml" ? "ml-IN" : "en-IN";
    }
  }, [kukuLanguage]);

  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.onvoiceschanged = () => {
      getBestVoice(kukuLanguageRef.current);
    };

    getBestVoice(kukuLanguageRef.current);

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  useEffect(() => {
    return () => {
      voiceControlEnabledRef.current = false;
      if (recognitionRestartTimeoutRef.current) {
        clearTimeout(recognitionRestartTimeoutRef.current);
      }
      speechTokenRef.current += 1;
      clearLipSync();
      clearSpeechChunkTimer();
      stopRecognitionSafely();
      window.speechSynthesis?.cancel();
    };
  }, [clearLipSync, clearSpeechChunkTimer, stopRecognitionSafely]);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      const characterBounds = characterRootRef.current?.getBoundingClientRect();
      const centerX = characterBounds
        ? characterBounds.left + characterBounds.width / 2
        : window.innerWidth / 2;
      const centerY = characterBounds
        ? characterBounds.top + characterBounds.height / 2
        : window.innerHeight / 2;
      const trackingRadiusX = Math.max((characterBounds?.width ?? window.innerWidth) * 0.55, 140);
      const trackingRadiusY = Math.max((characterBounds?.height ?? window.innerHeight) * 0.55, 140);
      const nextX = clamp((e.clientX - centerX) / trackingRadiusX, -1, 1);
      const nextY = clamp((e.clientY - centerY) / trackingRadiusY, -1, 1);

      setMousePosition({
        x: nextX,
        y: nextY,
      });

      if (isSpeakingRef.current) return;

      if (expressionRef.current === "sleeping") {
        clearEmotionTimers();
        setExpression("waking");

        wakingTimeoutRef.current = setTimeout(() => {
          setExpression("listening");
        }, emotionTiming.wakingHold);

        scheduleIdleEmotions(emotionTiming.wakingHold, false);
        return;
      }

      if (expressionRef.current === "waking") return;

      setExpression("listening");
      scheduleIdleEmotions();
    };

    scheduleIdleEmotions();

    window.addEventListener("pointermove", handlePointerMove);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      clearEmotionTimers();
    };
  }, [clearEmotionTimers, scheduleIdleEmotions]);

  useEffect(() => {
    let isMounted = true;
    let blinkTimeout: ReturnType<typeof setTimeout>;
    let saccadeTimeout: ReturnType<typeof setTimeout>;

    const blink = () => {
      if (!isMounted) return;
      if (expression !== "sleeping") {
        setIsBlinking(true);

        setTimeout(() => {
          if (isMounted) setIsBlinking(false);
        }, 120);
      }

      blinkTimeout = setTimeout(blink, Math.random() * 3500 + 2200);
    };

    const saccade = async () => {
      if (!isMounted) return;
      if (expression !== "sleeping") {
        try {
          await saccadeControls.start({
            x: (Math.random() - 0.5) * 5,
            y: (Math.random() - 0.5) * 4,
            transition: { duration: 0.12 },
          });

          if (isMounted) {
            await saccadeControls.start({
              x: 0,
              y: 0,
              transition: { duration: 0.7, ease: "easeOut" },
            });
          }
        } catch (error) {
          // Ignore animation errors when unmounting
        }
      }

      if (isMounted) {
        saccadeTimeout = setTimeout(saccade, Math.random() * 2200 + 800);
      }
    };

    blinkTimeout = setTimeout(blink, 1600);
    saccadeTimeout = setTimeout(saccade, 900);

    return () => {
      isMounted = false;
      clearTimeout(blinkTimeout);
      clearTimeout(saccadeTimeout);
    };
  }, [expression, saccadeControls]);

  const isSleeping = expression === "sleeping";
  const isWaking = expression === "waking";

  const pupilOffset =
    expression === "thinking"
      ? { x: mousePosition.x * 5, y: mousePosition.y * 4 - 2 }
    : expression === "playful"
      ? { x: mousePosition.x * 6, y: mousePosition.y * 4.5 }
    : expression === "speaking"
      ? { x: mousePosition.x * 5, y: mousePosition.y * 4 }
    : expression === "waking"
      ? { x: mousePosition.x * 4, y: mousePosition.y * 3 + 1 }
    : expression === "listening"
      ? { x: mousePosition.x * 6.5, y: mousePosition.y * 4.5 }
      : { x: mousePosition.x * 6, y: mousePosition.y * 4.5 };

  const headRotation = {
    x: clamp(mousePosition.y * -13, -13, 13),
    y: clamp(mousePosition.x * 16, -16, 16),
    z: clamp(mousePosition.x * -2.4, -2.4, 2.4),
  };

  const faceOffset = {
    x: mousePosition.x * 18,
    y: mousePosition.y * 10,
  };

  const mouthPath =
    isSpeaking
      ? [
          "M 18 19 Q 29 20 40 19",
          "M 19 18 Q 29 22 39 18",
          "M 17 17 Q 29 26 41 17",
          "M 15 16 Q 29 31 43 16",
          "M 13 17 Q 29 28 45 17",
        ][speechMouthFrame]
      : expression === "thinking"
      ? "M 18 20 Q 29 16 40 20"
      : expression === "playful"
      ? "M 14 15 Q 29 32 44 15"
      : expression === "speaking"
      ? "M 16 17 Q 29 31 42 17"
      : expression === "listening"
      ? "M 14 18 Q 29 28 44 18"
      : expression === "waking"
      ? "M 18 21 Q 29 25 40 21"
      : expression === "sleeping"
      ? "M 16 22 Q 29 26 42 22"
      : "M 18 16 Q 29 28 40 16";

  const mouthScaleY = isSpeaking
    ? 1
    : expression === "playful"
    ? [1, 1.18, 0.95, 1.12, 1]
    : expression === "listening"
    ? 1.22
    : expression === "waking"
    ? 0.82
    : expression === "sleeping"
      ? 0.72
      : 1;

  const characterBounceY =
    isSpeaking
      ? [0, -5, 0]
      : expression === "playful"
      ? [0, -10, 0, -5, 0]
      : [0, -13, 0];

  return (
    <div
      ref={characterRootRef}
      className="relative w-full aspect-square max-w-[540px] mx-auto flex items-center justify-center [perspective:1200px] overflow-visible pointer-events-auto"
      role="button"
      tabIndex={0}
      aria-label="Abhiram K, the interactive speaking character. Click to start or pause voice commands."
      onPointerDown={reactToTouch}
      onClick={startVoiceControl}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;

        event.preventDefault();
        reactToTouch();
        startVoiceControl();
      }}
    >
      {/* Background glow */}
      <motion.div
        className="absolute inset-[-10%] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 55% 45%, rgba(160,145,255,0.45), rgba(255,255,255,0.14) 42%, transparent 70%)",
          filter: "blur(60px)",
        }}
        animate={{
          scale: [1, 1.08, 1],
          opacity: [0.55, 0.9, 0.55],
        }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Rim light */}
      <motion.div
        className="absolute w-[75%] h-[75%] rounded-full pointer-events-none"
        style={{
          background:
            "conic-gradient(from 40deg, transparent, rgba(180,165,255,0.65), transparent, rgba(255,255,255,0.28), transparent)",
          filter: "blur(30px)",
        }}
        animate={{
          rotate: [0, 360],
          opacity: [0.45, 0.75, 0.45],
        }}
        transition={{
          rotate: { duration: 24, repeat: Infinity, ease: "linear" },
          opacity: { duration: 6, repeat: Infinity, ease: "easeInOut" },
        }}
      />

      {/* White living orb */}
      <motion.div
        className="relative z-10 w-[68%] h-[68%] rounded-full flex items-center justify-center overflow-hidden"
        style={{
          transformStyle: "preserve-3d",
          background:
            "radial-gradient(circle at 32% 22%, #ffffff 0%, #f7f7fb 34%, #e3e4ee 68%, #c7cad8 100%)",
          boxShadow: `
            0 55px 120px rgba(0,0,0,0.35),
            0 0 90px rgba(145,120,255,0.35),
            inset 30px 24px 45px rgba(255,255,255,0.95),
            inset -30px -35px 60px rgba(120,125,150,0.36),
            inset -8px -4px 24px rgba(135,105,255,0.25),
            inset 8px 5px 18px rgba(255,255,255,0.9)
          `,
          border: "1px solid rgba(255,255,255,0.75)",
        }}
        animate={{
          y: characterBounceY,
          x:
            interactionPulse === 0
              ? 0
              : interactionPulse % 2 === 0
              ? [0, 3, -2, 0]
              : [0, -3, 2, 0],
          scale: isSpeaking ? [1, 1.01, 1] : [1, 1.018, 1],
          rotateX: headRotation.x,
          rotateY: headRotation.y,
          rotateZ: headRotation.z,
        }}
        transition={{
          y: { duration: 6.2, repeat: Infinity, ease: "easeInOut" },
          scale: { duration: 4.5, repeat: Infinity, ease: "easeInOut" },
          rotateX: { type: "spring", stiffness: 85, damping: 22 },
          rotateY: { type: "spring", stiffness: 85, damping: 22 },
          rotateZ: { type: "spring", stiffness: 85, damping: 24 },
        }}
      >
        {/* Big glossy reflection */}
        <motion.div
          className="absolute top-[7%] left-[17%] w-[46%] h-[28%] rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(255,255,255,0.95), rgba(255,255,255,0.32) 45%, transparent 72%)",
            filter: "blur(15px)",
          }}
          animate={{
            opacity: [0.4, 0.75, 0.4],
            x: mousePosition.x * -8,
            y: mousePosition.y * -5,
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Purple side reflection */}
        <div
          className="absolute right-[-8%] top-[20%] w-[30%] h-[54%] rounded-full pointer-events-none"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(130,100,255,0.32))",
            filter: "blur(18px)",
          }}
        />

        {/* Face */}
        <motion.div
          className="absolute top-[31%] w-[82%] flex flex-col items-center gap-5 z-20"
          animate={{
            x: faceOffset.x,
            y: faceOffset.y,
          }}
          transition={{ type: "spring", stiffness: 180, damping: 20 }}
        >
          {/* Eyebrows */}
          {!isSleeping && (
            <div className="absolute top-[-18px] flex gap-12">
              <motion.div
                className="w-9 h-[5px] rounded-full bg-slate-600/70"
                animate={{
                  rotate:
                    expression === "thinking"
                      ? -18
                      : expression === "playful"
                      ? -14
                      : expression === "speaking"
                      ? -8
                      : expression === "waking"
                      ? -2
                      : expression === "listening"
                      ? 12
                      : -6,
                  y:
                    expression === "thinking"
                      ? -5
                      : expression === "playful"
                      ? -3
                      : expression === "waking"
                      ? 3
                      : 0,
                }}
              />
              <motion.div
                className="w-9 h-[5px] rounded-full bg-slate-600/70"
                animate={{
                  rotate:
                    expression === "thinking"
                      ? 14
                      : expression === "playful"
                      ? 14
                      : expression === "speaking"
                      ? 8
                      : expression === "waking"
                      ? 2
                      : expression === "listening"
                      ? -12
                      : 6,
                  y:
                    expression === "thinking"
                      ? 2
                      : expression === "playful"
                      ? -3
                      : expression === "waking"
                      ? 3
                      : 0,
                }}
              />
            </div>
          )}

          {/* Eyes */}
          <motion.div
            className="flex items-center justify-center gap-8 sm:gap-10"
            animate={saccadeControls}
          >
            {[0, 1].map((eye) => (
              <motion.div
                key={eye}
                className="relative w-[42px] h-[52px] sm:w-[48px] sm:h-[60px] rounded-full overflow-hidden"
                style={{
                  transformOrigin: "center",
                  background:
                    "radial-gradient(circle at 38% 28%, #ffffff 0%, #f5f7ff 42%, #cfd4e8 100%)",
                  boxShadow: `
                    inset 0 4px 10px rgba(0,0,0,0.25),
                    inset -4px -6px 12px rgba(0,0,0,0.2),
                    0 0 22px rgba(255,255,255,0.75),
                    0 0 38px rgba(130,110,255,0.26)
                  `,
                }}
                animate={{
                  scaleY: isSleeping || isBlinking ? 0.13 : isWaking ? 0.55 : 1,
                  y: isSleeping ? 8 : isWaking ? 5 : 0,
                }}
                transition={{ duration: 0.12, ease: "easeInOut" }}
              >
                {/* Pupil */}
                <motion.div
                  className="absolute top-[28%] left-[30%] w-[42%] h-[48%] rounded-full"
                  style={{
                    background:
                      "radial-gradient(circle at 40% 35%, #2d3342 0%, #08090d 62%, #000 100%)",
                    boxShadow:
                      "inset 0 2px 5px rgba(255,255,255,0.2), 0 0 10px rgba(0,0,0,0.45)",
                  }}
                  animate={{
                    x: pupilOffset.x,
                    y: pupilOffset.y,
                  }}
                  transition={{ type: "spring", stiffness: 220, damping: 18 }}
                >
                  {/* Sharp white dot reflection in pupil */}
                  <div className="absolute top-[18%] right-[22%] w-[28%] h-[28%] rounded-full bg-white shadow-[0_0_2px_rgba(255,255,255,0.8)]" />
                </motion.div>

                {/* Main eye reflection */}
                <motion.div
                  className="absolute top-[17%] left-[21%] w-[30%] h-[25%] rounded-full bg-white"
                  style={{
                    opacity: 0.96,
                    filter: "blur(0.2px)",
                  }}
                  animate={{
                    x: mousePosition.x * -2,
                    y: mousePosition.y * -1,
                    scale: [1, 1.14, 1],
                  }}
                  transition={{
                    scale: { duration: 3.5, repeat: Infinity },
                    x: { type: "spring", stiffness: 160, damping: 18 },
                    y: { type: "spring", stiffness: 160, damping: 18 },
                  }}
                />

                {/* Second reflection */}
                <div className="absolute top-[50%] right-[24%] w-[8px] h-[8px] rounded-full bg-white opacity-70 blur-[0.4px]" />

                {/* Glass shine */}
                <div
                  className="absolute top-[5%] left-[8%] w-[82%] h-[34%] rounded-full pointer-events-none"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.55), transparent)",
                    filter: "blur(2px)",
                  }}
                />
              </motion.div>
            ))}
          </motion.div>

          {/* Sleeping Zzz */}
          {isSleeping && (
            <motion.div
              className="absolute -right-2 -top-10 text-slate-400 text-lg font-semibold"
              animate={{ y: [-2, -10, -2], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2.2, repeat: Infinity }}
            >
              zZ
            </motion.div>
          )}

          {/* Cheeks */}
          <div className="absolute top-[62px] left-[21%] w-10 h-5 rounded-full bg-purple-300/20 blur-md" />
          <div className="absolute top-[62px] right-[21%] w-10 h-5 rounded-full bg-purple-300/20 blur-md" />

          {/* Big expressive mouth */}
          <motion.div
            className="relative mt-1"
            animate={{
              scaleY: mouthScaleY,
              y:
                expression === "thinking"
                  ? 2
                  : expression === "waking"
                  ? 1
                  : expression === "playful"
                  ? -1
                  : 0,
            }}
            transition={
              isSpeaking
                ? { duration: 0.65, repeat: Infinity, ease: "easeInOut" }
                : expression === "playful"
                ? { duration: 1.4, repeat: Infinity, ease: "easeInOut" }
                : { type: "spring", stiffness: 220, damping: 18 }
            }
          >
            <svg
              width="58"
              height="38"
              viewBox="0 0 58 38"
              className="overflow-visible"
            >
              <motion.path
                d={mouthPath}
                stroke="rgba(65,70,85,0.9)"
                strokeWidth="4"
                strokeLinecap="round"
                fill="none"
                style={{
                  filter:
                    "drop-shadow(0px 0px 5px rgba(255,255,255,0.55)) drop-shadow(0px 2px 2px rgba(0,0,0,0.16))",
                }}
                transition={{ type: "spring", stiffness: 180, damping: 20 }}
              />

              {expression === "listening" && (
                <motion.path
                  d="M 18 16 Q 29 24 40 16"
                  stroke="rgba(120,95,255,0.35)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  fill="none"
                />
              )}
            </svg>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Floating glass orb */}
      <motion.div
        className="absolute top-[12%] right-[8%] w-16 h-16 rounded-full z-20 pointer-events-none"
        style={{
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.9), rgba(240,240,255,0.4))",
          backdropFilter: "blur(14px)",
          border: "1px solid rgba(255,255,255,0.6)",
          boxShadow:
            "0 18px 45px rgba(0,0,0,0.1), inset 4px 4px 10px rgba(255,255,255,0.8)",
        }}
        animate={{
          y: [0, 10, 0],
          x: mousePosition.x * -8,
        }}
        transition={{
          y: { duration: 4.5, repeat: Infinity, ease: "easeInOut" },
          x: { type: "spring", stiffness: 55, damping: 16 },
        }}
      />

      {/* Floating glass square (the cube!) */}
      <motion.div
        className="absolute bottom-[20%] left-[5%] w-20 h-20 rounded-[1.25rem] z-20 pointer-events-none"
        style={{
          background:
            "linear-gradient(135deg, rgba(160,130,255,0.85), rgba(120,90,255,0.45))",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255,255,255,0.4)",
          boxShadow:
            "0 20px 40px rgba(120,90,255,0.25), inset 2px 2px 8px rgba(255,255,255,0.5), inset -3px -3px 12px rgba(0,0,0,0.15)",
        }}
        animate={{
          y: [0, -12, 0],
          x: mousePosition.x * 12,
          rotate: [-5, 5, -5],
        }}
        transition={{
          y: { duration: 5.5, repeat: Infinity, ease: "easeInOut" },
          x: { type: "spring", stiffness: 50, damping: 15 },
          rotate: { duration: 12, repeat: Infinity, ease: "easeInOut" },
        }}
      />
    </div>
  );
};
