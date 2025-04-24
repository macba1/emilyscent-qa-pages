// functions/recommend.js

exports.handler = async (event) => {
  // Soporte CORS preflight
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

  // Parámetros de la URL
  const qp = event.queryStringParameters || {};
  const { target, personality, intention } = qp;
  if (!target || !personality || !intention) {
    return { statusCode: 400, body: "Missing parameters" };
  }

  // Construir pregunta
  const question = `What perfume should I gift to ${decodeURIComponent(target)}, who is ${decodeURIComponent(personality)}, so they feel ${decodeURIComponent(intention)}?`;

  // Llamada directa a OpenAI usando fetch
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: "gpt-4",
      messages: [
        { role: "system", content: "You're EmilyGPT, irreverent & sarcastic perfume guru." },
        { role: "user",   content: question }
      ],
      temperature: 0.9,
      max_tokens: 400
    })
  });

  if (!resp.ok) {
    const errText = await resp.text();
    return { statusCode: resp.status, body: `OpenAI error: ${errText}` };
  }

  const { choices } = await resp.json();
  const answer = choices[0].message.content.trim();

  // Extraer nombre de perfume
  const m = answer.match(/(?:try|recommend|suggest)\s+"?([^".,]+?)"?[.,\n]/i);
  const perfume = m ? m[1] : "Unknown Perfume";

  // Enlace de afiliado
  const affiliate = `https://www.amazon.com/s?k=${encodeURIComponent(perfume + " perfume")}&tag=emilyscent-20`;

  // Generar HTML de la página
  const html = `
<!DOCTYPE html>
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
