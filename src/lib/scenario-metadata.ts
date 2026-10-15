export function scenarioMetadata(author: unknown, description: unknown) {
  return {
    author: typeof author === "string" ? author.trim().slice(0, 80) : "",
    description: typeof description === "string" ? description.trim().slice(0, 2000) : "",
  };
}

export const SOCIAL_IMAGE_WIDTH = 1200;
export const SOCIAL_IMAGE_HEIGHT = 630;