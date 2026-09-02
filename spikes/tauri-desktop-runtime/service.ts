const port = 45173

const server = Bun.serve({
  hostname: "127.0.0.1",
  port,
  fetch(request) {
    const url = new URL(request.url)
    if (url.pathname === "/health") {
      return Response.json({ healthy: true, service: "magic-spike", pid: process.pid })
    }
    return new Response("magic-spike")
  },
})

console.log(`magic spike service listening on ${server.url}`)
