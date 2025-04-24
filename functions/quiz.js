// functions/quiz.js

exports.handler = async (event) => {
  // 1) CORS preflight
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

  // 2) Slugify helper (server-side)
  const slugify = (str) =>
    str
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  // 3) Extract parameters from query or path
  let { target, gender, personality, mood, budget } = event.queryStringParameters || {};
  if ((!target || !gender || !personality || !mood || !budget) && event.path && event.path !== "/") {
    const parts = decodeURIComponent(event.path.slice(1)).split("-");
    // Expect exactly 5 parts
    if (parts.length >= 5) {
      [ target, gender, personality, mood, budget ] = parts;
    }
  }

  // 4) If any missing, serve extended multi-step quiz
  if (!target || !gender || !personality || !mood || !budget) {
    const formHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>EmilyGPT Perfume Quiz</title>
  <style>
    :root { --primary:#e74266; --bg:#fff; --text:#333; --step-bg:#f8f8f8; }
    * { box-sizing:border-box; }
    body { margin:0; font-family:sans-serif; background:var(--bg);
           color:var(--text); display:flex; align-items:center;
           justify-content:center; height:100vh; }
    .quiz-wrapper { width:100%; max-width:400px; padding:2rem;
                    background:var(--step-bg); border-radius:8px;
                    box-shadow:0 4px 12px rgba(0,0,0,0.05); text-align:center; }
    .progress { height:8px; background:#ddd; border-radius:4px;
                overflow:hidden; margin-bottom:1.5rem; }
    .progress-bar { width:0%; height:100%; background:var(--primary);
                    transition:width .3s ease; }
    .step { display:none; flex-direction:column; gap:1rem; text-align:left; }
    .step.active { display:flex; }
    label { font-weight:600; }
    input, select { padding:.75rem; font-size:1rem; border:1px solid #ccc;
                    border-radius:4px; width:100%; }
    button { padding:.75rem; font-size:1rem; border:none;
             border-radius:4px; background:var(--primary);
             color:#fff; cursor:pointer; }
    .nav { display:flex; justify-content:space-between; margin-top:1rem; }
    .nav button[disabled] { opacity:.5; cursor:default; }
  </style>
</head>
<body>
  <div class="quiz-wrapper">
    <div class="progress"><div class="progress-bar" id="progress"></div></div>

    <div class="step active" data-step="1">
      <label>Who is this perfume for?</label>
      <input id="target" placeholder="E.g., my mom" />
    </div>

    <div class="step" data-step="2">
      <label>What’s their gender?</label>
      <select id="gender">
        <option value="" disabled selected>Select…</option>
        <option value="female">Female</option>
        <option value="male">Male</option>
        <option value="unisex">Unisex</option>
      </select>
    </div>

    <div class="step" data-step="3">
      <label>How would you describe their personality?</label>
      <input id="personality" placeholder="E.g., happy" />
    </div>

    <div class="step" data-step="4">
      <label>What mood do you want to evoke?</label>
      <input id="mood" placeholder="E.g., fresh & light" />
    </div>

    <div class="step" data-step="5">
      <label>What’s your budget?</label>
      <input id="budget" placeholder="E.g., under $100" />
    </div>

    <div class="nav">
      <button id="prev" disabled>Back</button>
      <button id="next">Next</button>
    </div>
  </div>
  <script>
    // client-side slugify
    function slugify(str) {
      return str.trim().toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
        .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
    }

    const steps = Array.from(document.querySelectorAll('.step'));
    const progress = document.getElementById('progress');
    const prevBtn = document.getElementById('prev');
    const nextBtn = document.getElementById('next');
    let index = 0;

    function updateProgress() {
      progress.style.width = ((index / (steps.length - 1)) * 100) + '%';
    }

    function updateUI() {
      steps.forEach((s,i) => s.classList.toggle('active', i === index));
      updateProgress();
      prevBtn.disabled = index === 0;
      nextBtn.textContent = index === steps.length - 1 ? 'Submit' : 'Next';
    }

    prevBtn.onclick = () => { if (index>0) index--; updateUI(); };
    nextBtn.onclick = () => {
      const field = steps[index].querySelector('input, select');
      if (!field.value.trim()) { alert('Please fill in the field.'); return; }
      if (index < steps.length - 1) {
        index++; updateUI();
      } else {
        // capture values
        const t = slugify(document.getElementById('target').value);
        const g = slugify(document.getElementById('gender').value);
        const p = slugify(document.getElementById('personality').value);
        const m = slugify(document.getElementById('mood').value);
        const b = slugify(document.getElementById('budget').value);
        // show loading
        document.querySelector('.quiz-wrapper').innerHTML =
          '<p>Cooking your sassy recommendation... 🍾</p>';
        setTimeout(() => {
          window.location.href = '/' + [t,g,p,m,b].join('-');
        }, 500);
      }
    };

    updateUI();
  </script>
</body>
</html>`;

    return {
      statusCode: 200,
      headers: { "Content-Type": "text/html" },
      body: formHtml
    };
  }

  // 5) Build SEO-friendly question
  const question =
    `Which ${gender} perfume should I gift to ${target}, ` +
    `who is ${personality}, to evoke a ${mood} mood within a budget of ${budget}?`;

  // 6) Call OpenAI
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + process.env.OPENAI_API_KEY
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [
        { role:"system", content:"You're EmilyGPT, irreverent & sarcastic perfume guru." },
        { role:"user",   content:question }
      ],
      temperature:0.9,
      max_tokens:400
    })
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error("OpenAI error ("+resp.status+"): "+err);
  }

  const { choices } = await resp.json();
  const answer = choices[0].message.content.trim();

  // 7) Extract perfume name
  const mPerf = answer.match(/["“]([^"”]+?)["”]/);
  const perfume = mPerf ? mPerf[1].trim() : "Unknown Perfume";
  const affiliate = "https://www.amazon.com/s?k=" +
    encodeURIComponent(perfume+" perfume") + "&tag=emilyscent-20";

  // 8) Build result page with SEO tags & JSON-LD
  const resultHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${perfume} – ${target}'s ${mood} Perfume Recommendation</title>
  <meta name="description" content="${question} I recommend ${perfume}." />
  <script type="application/ld+json">
  {
    "@context":"https://schema.org",
    "@type":"Product",
    "name":"${perfume}",
    "description":"${question}",
    "offers":{
      "@type":"Offer",
      "url":"${affiliate}",
      "price":"${budget.replace(/[^0-9.]/g,'')}",
      "priceCurrency":"USD"
    }
  }
  </script>
  <style>
    body{font-family:sans-serif;padding:2rem}
    .card{border:1px solid #ddd;padding:1rem;border-radius:8px;max-width:600px;margin:0 auto}
    .cta{display:inline-block;margin-top:1rem;padding:.5rem 1rem;background:#e74266;color:#fff;text-decoration:none;border-radius:4px}
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
    headers: { "Content-Type": "text/html" },
    body: resultHtml
  };
};
