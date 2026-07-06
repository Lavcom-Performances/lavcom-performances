import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "ping",
  title: "Ping",
  description:
    "Verify connectivity to the Lavcom Performances MCP server. Returns a pong with an optional echoed message and the server timestamp.",
  inputSchema: {
    message: z
      .string()
      .max(200)
      .optional()
      .describe("Optional message echoed back in the response."),
  },
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: ({ message }) => ({
    content: [
      {
        type: "text",
        text: `pong${message ? ` — ${message}` : ""} (server time: ${new Date().toISOString()})`,
      },
    ],
  }),
});
