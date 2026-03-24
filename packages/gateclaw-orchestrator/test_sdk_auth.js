import { createOpencodeClient } from "@opencode-ai/sdk/v2";

const client = createOpencodeClient({
  baseUrl: "http://localhost:4100",
  headers: { Authorization: "Basic Z2F0ZWNsYXc6" }  // "gateclaw:"
});

async function test() {
  console.log("Testing session.create with auth...");
  try {
    const result = await client.session.create({
      directory: "C:/Users/uscha"
    });
    console.log("Success:", JSON.stringify(result.data ? result.data.id : result));
  } catch (err) {
    console.error("Error:", err.message);
  }
}

test();
