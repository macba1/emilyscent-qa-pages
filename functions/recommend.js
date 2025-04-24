const { Configuration, OpenAIApi } = require("openai");

exports.handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    };
  }

  // Parámetros
  const qp = event.queryStringParameters || {};
  const { target, personality, intention } = qp;
  if (!target || !personality || !intention) {
    return { statusCode: 400, body: "Missing parameters" };
  }

  // Construir pregunta SEO
  const question = `What perfume should I gift to ${decodeURIComponent(target)}, who is ${decodeURIComponent(personality)}, so they feel ${decodeURIComponent(intention)}?`;

  // Llamada a OpenAI
  const openai = new OpenAIApi(new Configuration({ apiKey: process.env.OPENAI_API_KEY }));
  const resp = await openai.createChatCompletion({
    model: "gpt-4",
    messages: [
      { role: "system", content: "You're EmilyGPT, irreverent & sarcastic perfume guru." },
      { role: "user",   content: question }
    ],
    temperature: 0.9,
    max_tokens: 400
  });

  const answer = resp.data.choices[0].message.content.trim();

  // Extraer nombre de perfume
  const m = answer.match(/(?:try|recommend|suggest)\s+"?([^".,]+?)"?[.,\n]/i);
  const perfume = m ? m[1] : "Unknown Perfume";

  // Montar enlace de afiliado
  const affiliate = `https://www.amazon.com/s?k=${encodeURIComponent(perfume + " perfume")}&tag=emilyscent-20`;

  // Generar HTML
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="description" content="${question} - ${perfume}">
  <title>${perfume} – EmilyGPT Recommendation</title>
  <style>
    body { font-family:sans-serif; padding:2rem; }
    .card { border:1px solid #ddd; padding:1rem; border-radius:8px; max-width:600px; margin:0 auto; }
    .cta { display:inline-block; margin-top:1rem; padding:.5rem 1rem; background:#e74266; color:#fff; text-decoration:none; border-radius:4px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Your Question</h1>
    <p>${question}</p>
    <h2>EmilyGPT Says</h2>
    <p>${answer.replace(/\n/g,"<br>")}</p>
    <h3>Perfume: <em>${perfume}</em></h3>
    <a class="cta" href="${affiliate}" target="_blank">Buy on Amazon</a>
  </div>
</body>
</html>`;

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "text/html",
      "Access-Control-Allow-Origin": "*"
    },
    body: html
  };
};
