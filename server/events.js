// events.js — Server-Sent Events broadcast module.
//
// SSE is a built-in browser API for one-way real-time push from server → client.
// Python analogy: like a pub/sub message queue where the server is the publisher
// and each open browser tab is a subscriber.
//
// How it works:
//   1. Browser opens a persistent HTTP GET /events connection.
//   2. Server keeps that response object open and writes "data: ...\n\n" lines.
//   3. When a Plaid webhook creates new expenses, it calls broadcast() here.
//   4. broadcast() writes to every open response, and each browser tab receives it.
//
// This module is imported by both index.js (to register /events) and
// routes/plaid.js (to broadcast after processing webhooks).

const clients = new Set(); // one entry per open browser tab

function addClient(res)    { clients.add(res); }
function removeClient(res) { clients.delete(res); }

// Push a named event + JSON payload to every connected browser tab.
// SSE wire format:  "event: <name>\ndata: <json>\n\n"
function broadcast(eventName, payload) {
  const chunk = `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const client of clients) {
    client.write(chunk);
  }
}

module.exports = { addClient, removeClient, broadcast };
