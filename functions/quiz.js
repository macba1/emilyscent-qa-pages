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

  const { target, personality, intention } = event.queryStringParameters || {};

  // Si no hay parámetros, servimos el formulario
  if (!target || !personality || !intention) {
    const formHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>EmilyGPT Perfume Quiz</title>
        <style>
          body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; padding: 2rem; }
          form { display: flex; flex-direction: column; gap: 1rem; width: 300px; }
          input, button { padding: .5rem; font-size: 1rem; }
          button { background: #e74266; color: #fff; border: none; cursor: pointer; }
        </style>
      </head>
      <body>
        <h1>EmilyGPT Perfume Quiz</h1>
        <form id="quizForm">
          <input id="target" placeholder="Who is it for?" required />
          <input id="personality" placeholder="Describe their personality" required />
          <input id="intention" placeholder="How you want them to feel?" required />
          <button type="submit">Get Recommendation</button>
        </form>
        <script>
          document.getElementById('quizForm').addEventListener('submit', e => {
            e.preventDefault();
            const t = encodeURIComponent(document.getElementById('target').value.trim());
            const p = encodeURIComponent(document.getElementById('personality').value.trim());
            const i = encodeURIComponent(document.getElementById('intention').value.trim());
            window.location.href = \`/\${t}-\${p}-\${i}\`;
          });
        </script>
      </body>
      </html>
    `;
    return {
      statusCode: 200,
      headers: { "Content-Type": "text/html" },
      body: formHtml
    };
  }

  // Si sí recibimos parámetros, vamos a GPT
  const question = `What perfume should I gift to ${decodeURIComponent(target)}, who is ${decodeURIComponent(personality)}, so they feel ${decodeURIComponent(intention)}?`;
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: "gpt-4",
      messages: [
        { role: "system", content: "You are EmilyGPT, irreverent & sarcastic perfume guru." },
        { role: "user",   content: question }
      ],
      temperature: 0.9,
      max_tokens: 400
    })
  });

  const { choices } = await resp.json();
  const answer = choices[0].message.content.trim();

  const m = answer.match(/(?:try|recommend|suggest)\\s+"?([^".,]+?)"?[\\.,\\n]/i);
  const perfume = m ? m[1] : "Unknown Perfume";
  const affiliate = `https://www.amazon.com/s?k=${encodeURIComponent(perfume + " perfume")}&tag=emilyscent-20`;

  const resultHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>${perfume} – EmilyGPT Recommendation</title>
      <style>
        body { font-family: sans-serif; padding:2rem; }
        .card { border:1px solid #ddd; padding:1rem; border-radius:8px; max-width:600px; margin:0 auto; }
        .cta { display:inline-block; margin-top:1rem; padding:.5rem 1rem; background:#e74266; color:#fff; text-decoration:none; border-radius:4px; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>Your Question</h1>
        <p>${question}</p>
        <h2>EmilyGPT Says</h2>
        <p>${answer.replace(/\\n/g,"<br>")}</p>
        <h3>Perfume: <em>${perfume}</em></h3>
        <a class="cta" href="${affiliate}" target="_blank">Buy on Amazon</a>
      </div>
    </body>
    </html>
  `;
  return {
    statusCode: 200,
    headers: { "Content-Type": "text/html" },
    body: resultHtml
  };
};
