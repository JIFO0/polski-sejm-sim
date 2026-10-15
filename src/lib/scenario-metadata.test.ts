import { scenarioMetadata, SOCIAL_IMAGE_WIDTH, SOCIAL_IMAGE_HEIGHT } from "./scenario-metadata";
import { strict as assert } from "node:assert";
assert.deepEqual(scenarioMetadata(undefined, undefined), { author: "", description: "" });
assert.deepEqual(scenarioMetadata(" Iwo ", " Założenia i źródła "), { author: "Iwo", description: "Założenia i źródła" });
assert.equal(SOCIAL_IMAGE_WIDTH, 1200);
assert.equal(SOCIAL_IMAGE_HEIGHT, 630);
console.log("Optional scenario metadata and social image dimensions passed");