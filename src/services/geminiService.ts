import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

export async function generateSignageContent(species: string) {
  if (!apiKey) throw new Error("VITE_GEMINI_API_KEY is missing from environment variables.");
  
  // Using gemini-3.1-flash for high-speed, cost-effective JSON generation
  const model = genAI.getGenerativeModel({
    model: "gemini-3.1-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          diet: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, description: "3-5 bullet points about their natural diet" },
          habitat: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, description: "3-5 bullet points about their natural habitat" },
          didYouKnow: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, description: "2-3 highly engaging fun facts suitable for children" },
          wildOrigin: { type: SchemaType.STRING, description: "Short description of native regions/continents" },
          speciesStats: {
            type: SchemaType.OBJECT,
            properties: {
              lifespanWild: { type: SchemaType.STRING, description: "e.g., '10-15 years'" },
              lifespanCaptivity: { type: SchemaType.STRING, description: "e.g., 'Up to 20 years'" },
              wingspan: { type: SchemaType.STRING, description: "Average wingspan, length, or leg span depending on species" },
              weight: { type: SchemaType.STRING, description: "Average adult weight" }
            },
            required: ["lifespanWild", "lifespanCaptivity", "wingspan", "weight"]
          }
        },
        required: ["diet", "habitat", "didYouKnow", "wildOrigin", "speciesStats"]
      }
    }
  });

  const prompt = `Generate educational zoo signage data for the species: ${species}. Ensure all facts are highly accurate, engaging for the general public, and strictly formatted.`;
  
  const result = await model.generateContent(prompt);
  return JSON.parse(result.response.text());
}

export async function generateExoticSummary(species: string) {
  if (!apiKey) throw new Error("VITE_GEMINI_API_KEY is missing from environment variables.");
  
  const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash" });
  const prompt = `Write a 2-3 sentence engaging, educational summary about the ${species} suitable for the main paragraph of a zoo enclosure sign. Keep it accessible for all ages and highly interesting.`;
  
  const result = await model.generateContent(prompt);
  return result.response.text();
}
