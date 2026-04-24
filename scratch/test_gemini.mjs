import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
  try {
    // There is no listModels on the genAI instance in some versions, 
    // but let's try to see if we can at least call a basic model.
    console.log("Checking API key...");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("test");
    console.log("Success with gemini-1.5-flash!");
  } catch (e) {
    console.error("Error with gemini-1.5-flash:", e.message);
    
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent("test");
        console.log("Success with gemini-pro!");
    } catch (e2) {
        console.error("Error with gemini-pro:", e2.message);
    }
  }
}

listModels();
