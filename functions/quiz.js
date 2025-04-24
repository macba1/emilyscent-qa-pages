// functions/quiz.js

exports.handler = async (event) => {
  // 1) Handle CORS preflight
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

  // 2) Slugify helper
  const slugify = (str) =>
    str
      .trim()
      .toLowerCase()
      .normalize("NFD")                 // remove accents
      .replace(/[\u0300-\u036f]/g, "")  // strip diacritics
      .replace(/[^a-z0-9]+/g, "-")      // non-alphanumeric → hyphens
      .replace(/^-+|-+$/g, "");         // trim leading/trailing hyphens

  // 3) Extract parameters from query string or from path fallback
  let { target, personality, intention } = event.queryStringParameters || {};

  if ((!target || !personality || !intention) && event.path && event.path !== "/") {
    const parts = decodeURIComponent(event.path.slice(1)).split("-");
    if (parts.length >= 3) {
      [target, personality, intention] = parts;
    }
  }

  // 4) If any field is missing, serve the multi-step quiz
  if (!target || !personality || !intention) {
    const formHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>EmilyGPT Perfume Quiz</title>
  <style>
    :root {
      --primary: #e74266;
      --bg: #fff;
      --text: #333;
      --step-bg: #f8f8f8;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: sans-serif;
      background: var(--bg);
      color: var(--text);
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
    }
    .quiz-wrapper {
      width: 100%;
      max-width: 400px;
      padding: 2rem;
      background: var(--step-bg);
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    }
    .progress {
      height: 8px;
      background: #ddd;
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 1.5rem;
    }
    .progress-bar {
      width: 33%;
      height: 100%;
      background: var(--primary);
      transition: width .3s ease;
    }
    .step {
      display: none;
      flex-direction: column;
      gap: 1rem;
    }
    .step.active {
      display: flex;
    }
    label {
      font-weight: 600;
    }
    input {
      padding: .75rem;
      font-size: 1rem;
      border: 1px solid #ccc;
      border-radius: 4px;
    }
    button {
      padding: .75rem;
      font-size: 1rem;
      border: none;
      border-radius: 4px;
      background: var(--primary);
      color: #fff;
      cursor: pointer;
    }
    .nav {
      display: flex;
      justify-content: space-between;
      margin-top: 1rem;
    }
    .nav button[disabled] {
      opacity: .5;
      cursor: default;
    }
  </style>
</head>
<body>
  <div class="quiz-wrapper">
    <div class="progress">
      <div class="progress-bar" id="progress"></div>
    </div>
    <div class="step active" data-step="1">
      <label>¿Para quién es el perfume?</label>
      <input id="target" placeholder="Ej: my mom" />
    </div>
    <div class="step" data-step="2">
      <label>¿Cómo describirías su personalidad?</label>
      <input id="personality" placeholder="Ej: happy" />
    </div>
    <div class="step" data-step="3">
      <label>¿Qué quieres que sienta?</label>
      <input id="intention" placeholder="Ej: more happy" />
    </div>
    <div class="nav">
      <button id="prev" disabled>Back</button>
      <button id="next">Next</button>
    </div>
  </div>
  <script>
    const steps = Array.from(document.querySelectorAll('.step'));
    const progress = document.getElementById('progress');
    const prevBtn = document.getElementById('prev');
    const nextBtn = document.getElementById('next');
    let index = 0;

    function update() {
      steps.forEach((s, i) => s.classList.toggle('active', i === index));
      progress.style.width = `${(index + 1) / steps.length * 100}%`;
      prevBtn.disabled = index === 0;
      nextBtn.textContent = index === steps.length - 1 ? 'Submit' : 'Next';
    }

    prevBtn.onclick = () => {
      if (index > 0) index--;
      update();
    };

    nextBtn.onclick = () => {
      const input = steps[index].querySelector('input');
      if (!input.value.trim()) {
        return alert('Please fill in the field.');
      }
      if (index < steps.length - 1) {
        index++;
        update();
      } else {
        const t = slugify(document.getElementById('target').value);
        const p = slugify(document.getElementById('personality').value);
        const i = slugify(document.getElementById('intention').value);
        window.location.href = `/${t}-${p}-${i}`;
      }
    };
  </script>
</body>
</html>`;
    return {
      statusCode: 200,
      headers: { "Content-Type": "text/html" },
      body: formHtml
    };
  }

  // 5) Build the question and call OpenAI
  const question = `What perfume should I gift to ${target}, who is ${personality}, so they feel ${intention}?`;
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
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
    throw new Error(`OpenAI error (${resp.status}): ${errText}`);
  }

  const { choices } = await resp.json();
  const answer = choices[0].message.content.trim();

  // 6) Extract perfume name
  const quoteMatch = answer.match(/["“]([^"”]+?)["”]/);
  const perfume = quoteMatch ? quoteMatch[1].trim() : "Unknown Perfume";
  const affiliate = `https://www.amazon.com/s?k=${encodeURIComponent(perfume + " perfume")}&tag=emilyscent-20`;

  // 7) Render result card
  const resultHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${perfume} – EmilyGPT Recommendation</title>
  <style>
    body { font-family: sans-serif; padding: 2rem; }
    .card { border: 1px solid #ddd; padding: 1rem; border-radius: 8px; max-width: 600px; margin: 0 auto; }
    .cta { display: inline-block; margin-top: 1rem; padding: .5rem 1rem; background: #e74266; color: #fff; text-decoration: none; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Your Question</h1>
    <p>${question}</p>
    <h2>EmilyGPT Says</h2>
    <p>${answer.replace(/\n/g, "<br>")}</p>
    <h3>Perfume: <em>${perfume}</em></h3>
    <a class="cta" href="${affiliate}" target="_blank">Buy on Amazon</a>
  </div>
</body>
</html>`;

  return {
    statusCode: 200,
    headers: { "Content-Type": "text/html" },
    body: resultHtml
  };
};
