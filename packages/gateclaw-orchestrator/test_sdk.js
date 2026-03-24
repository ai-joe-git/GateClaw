import { createOpencodeClient } from "@opencode-ai/sdk/v2";

const client = createOpencodeClient({
  baseUrl: "http://localhost:4100",
});

async function test() {
  console.log("Testing session.create...");
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
