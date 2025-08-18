/**
 * Generate a unique, funny, and human-readable subdomain
 */

import { z } from "zod";

const adjectives = [
  "happy",
  "mighty",
  "clever",
  "swift",
  "bright",
  "cool",
  "super",
  "mega",
  "ultra",
  "turbo",
  "cosmic",
  "stellar",
  "golden",
  "silver",
  "crimson",
  "azure",
  "emerald",
  "violet",
  "amber",
  "coral",
  "dazzling",
  "electric",
  "groovy",
  "jazzy",
  "mystic",
  "noble",
  "radiant",
  "serene",
  "vibrant",
  "zesty",
  "brave",
  "bold",
  "fierce",
  "gentle",
  "jolly",
  "lucky",
  "peppy",
  "quirky",
  "shiny",
  "witty",
  "awesome",
  "epic",
  "legendary",
  "mythic",
  "prime",
  "supreme",
  "ultimate",
  "wonder",
  "zen",
  "alpha",
  "blazing",
  "crystal",
  "dynamic",
  "elastic",
  "frozen",
  "glowing",
  "heroic",
  "infinite",
  "kinetic",
  "lunar",
  "magnetic",
  "nebula",
  "orbital",
  "plasma",
  "quantum",
  "rocket",
  "solar",
  "thunder",
  "velocity",
  "warp",
  "arctic",
  "blazing",
  "cosmic",
  "desert",
  "eagle",
  "falcon",
  "galaxy",
  "horizon",
  "island",
  "jungle",
];

const nouns = [
  "panda",
  "tiger",
  "eagle",
  "shark",
  "wolf",
  "fox",
  "lion",
  "bear",
  "hawk",
  "owl",
  "dragon",
  "phoenix",
  "griffin",
  "unicorn",
  "kraken",
  "yeti",
  "sasquatch",
  "sphinx",
  "hydra",
  "pegasus",
  "ninja",
  "wizard",
  "knight",
  "samurai",
  "viking",
  "pirate",
  "ranger",
  "monk",
  "sage",
  "oracle",
  "thunder",
  "lightning",
  "storm",
  "comet",
  "meteor",
  "nova",
  "pulsar",
  "nebula",
  "cosmos",
  "galaxy",
  "mountain",
  "ocean",
  "forest",
  "canyon",
  "valley",
  "peak",
  "ridge",
  "summit",
  "plateau",
  "cliff",
  "rocket",
  "turbo",
  "engine",
  "dynamo",
  "reactor",
  "matrix",
  "nexus",
  "portal",
  "beacon",
  "forge",
  "crystal",
  "diamond",
  "emerald",
  "ruby",
  "sapphire",
  "topaz",
  "opal",
  "jade",
  "amber",
  "pearl",
  "hammer",
  "sword",
  "shield",
  "arrow",
  "spear",
  "axe",
  "blade",
  "dagger",
  "lance",
  "mace",
  "falcon",
  "raven",
  "sparrow",
  "condor",
  "albatross",
  "heron",
  "osprey",
  "vulture",
  "pelican",
  "flamingo",
  "cobra",
  "python",
  "viper",
  "mamba",
  "rattler",
  "anaconda",
  "boa",
  "asp",
  "adder",
  "serpent",
];

/**
 * Generate a random subdomain from adjective-noun combination
 */
export function generateRandomSubdomain(): string {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const randomNumber = Math.floor(Math.random() * 1000);

  return `${adjective}-${noun}-${randomNumber}`;
}

export const checkReservedKeys = (subdomain: string) => {
  const reservedNotEquals = [
    "www",
    "dev",
    "preview",
    "production",
    "preview-dev",
    "preview-staging",
    "preview-preview",
    "preview-production",
    "assets-dev",
    "assets-preview",
    "assets-production",
    "app",
    "auth",
    "api",
    "utility",
  ];
  const reservedNotStartWith = [
    "firebuzz",
    "admin",
    "api",
    "client-api",
    "routing",
    "engine",
    "dispatcher",
    "cache",
    "utility",
  ];

  return (
    reservedNotEquals.includes(subdomain) ||
    reservedNotStartWith.some((prefix) => subdomain.startsWith(prefix))
  );
};

const subdomainSchema = z.object({
  subdomain: z
    .string()
    .min(5, "Subdomain must be at least 5 characters long")
    .regex(
      /^[a-z0-9-]+$/,
      "Subdomain can only contain lowercase letters, numbers, and hyphens"
    )
    .regex(/^[a-z0-9]/, "Subdomain must start with a letter or number")
    .regex(/[a-z0-9]$/, "Subdomain must end with a letter or number")
    .refine((val) => !val.includes("."), "Subdomain cannot contain dots")
    .refine((val) => !val.includes(" "), "Subdomain cannot contain spaces"),
});

export const checkIsValidSubdomain = (subdomain: string) => {
  const result = subdomainSchema.safeParse({ subdomain });
  return result.success;
};
