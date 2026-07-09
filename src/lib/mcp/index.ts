import { defineMcp } from "@lovable.dev/mcp-js";
import pingTool from "./tools/ping";

export default defineMcp({
  name: "lavcom-performances-mcp",
  title: "Lavcom Performances MCP",
  version: "0.1.0",
  instructions:
    "MCP server for Lavcom Performances (analytics SaaS for self-service laundromats). Use `ping` to verify connectivity. Additional authenticated tools for querying operations, revenue KPIs and simulations will be added in a follow-up.",
  tools: [pingTool],
});
