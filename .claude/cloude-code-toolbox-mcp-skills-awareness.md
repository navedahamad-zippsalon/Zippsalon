# Cloude Code ToolBox — MCP & Skills awareness

_Generated: 2026-09-13T12:56:25.593Z_

## How to use this report

- **Saved copy:** This file is **`.claude/cloude-code-toolbox-mcp-skills-awareness.md`** — refreshed whenever the toolbox runs an MCP & Skills scan (including on workspace open when auto-scan is enabled). It is meant for **Claude Code workspace context** together with `CLAUDE.md` (which gets a shorter replaceable summary when auto-merge is on).
- **MCP:** Lists **configured** servers from Claude Code config (`~/.claude.json` for user scope, `.mcp.json` for project scope). Use `/mcp` in the Claude Code panel to connect servers for your session.
- **Skills:** **On-disk** folders with `SKILL.md`. Claude Code does not auto-load them; attach `SKILL.md` or paths in chat when useful.
- **Task routing:** When the user’s request matches a server’s purpose (e.g. Confluence → Confluence/Atlassian MCP), prefer that **server id** from the tables below.

---

## MCP — workspace

Workspace `mcp.json` _(folder: zippsalon)_

- **c:\zippsalon\.mcp.json** — _File missing_

_No active workspace servers in mcp.json._

## MCP — user profile

- **C:\Users\naved\.claude.json** — _File exists — servers defined_

| Server id | Kind | Detail |
|-----------|------|--------|
| hostinger-wordpress | stdio | npx.cmd --package=hostinger-api-mcp@latest hostinger-wordpress-mcp |
| hostinger-agency-hosting | stdio | npx.cmd --package=hostinger-api-mcp@latest hostinger-agency-hosting-mcp |
| hostinger-domains | stdio | npx.cmd --package=hostinger-api-mcp@latest hostinger-domains-mcp |
| hostinger-dns | stdio | npx.cmd --package=hostinger-api-mcp@latest hostinger-dns-mcp |
| hostinger-billing | stdio | npx.cmd --package=hostinger-api-mcp@latest hostinger-billing-mcp |
| hostinger-reach | stdio | npx.cmd --package=hostinger-api-mcp@latest hostinger-reach-mcp |
| hostinger-vps | stdio | npx.cmd --package=hostinger-api-mcp@latest hostinger-vps-mcp |

_User servers **off** (Toolbox stash):_

| Server id | Kind | Detail |
|-----------|------|--------|
| hostinger-hosting | stdio | npx.cmd --package=hostinger-api-mcp@latest hostinger-hosting-mcp |

## Skills (local `SKILL.md` folders)

### Project-scoped

_None found (or no workspace open)._

### User-scoped

_None found._

---

## Suggested next steps

- **MCP:** Use this extension’s hub **MCP** tab, or `claude mcp list` in the terminal. In Claude Code, use `/mcp` to connect servers for the session.
- **Edit config:** Open `~/.claude.json` (user MCP) or `<workspace>/.mcp.json` (project MCP) via the extension commands.
- **Refresh this report:** run **Intelligence — scan MCP & Skills awareness** again after changing MCP config or adding skills.

_Report from Cloude Code ToolBox extension._
