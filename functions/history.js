// functions/history.js

exports.handler = async () => {
  // 1) Llamamos al doGet de tu Apps Script
  const resp = await fetch(
    "https://script.google.com/macros/s/AKfycbz4CEzl7SBTPYVplSnu4lyfaSbB9TejKxl0Fi3He7WTR03Iqf_1AISKC6FM3H02Ne5ROw/exec"
  );
  if (!resp.ok) {
    return {
      statusCode: 500,
      body: "Failed to fetch history"
    };
  }
  const items = await resp.json();  // array de objetos con { slug, question, perfumeName, reason, amazonLink, timestamp }

  // 2) Generamos los <li> con enlace a cada quiz
  const list = items
    .map(item => {
      return `<li>
        <a href="/${item.slug}" target="_blank">
          ${item.perfumeName} — ${item.question}
        </a>
        <small style="color:#666;"> (${new Date(item.timestamp).toLocaleString()})</small>
      </li>`;
    })
    .join("");

  // 3) Renderizamos la página HTML
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>EmilyQuiz History</title>
  <meta name="description" content="Browse all past EmilyGPT perfume recommendations" />
  <style>
    body { font-family:sans-serif; background:#F9F5F0; padding:2rem; }
    h1 { color:#C62828; }
    ul { list-style:none; padding:0; }
    li { margin:.5rem 0; }
    a { color:#222; text-decoration:none; }
    a:hover { text-decoration:underline; }
    small { margin-left:.5rem; }
  </style>
</head>
<body>
  <h1>All EmilyGPT Recommendations</h1>
  <ul>
    ${list}
  </ul>
</body>
</html>`;

  return {
    statusCode: 200,
    headers: { "Content-Type": "text/html" },
    body: html
  };
};
