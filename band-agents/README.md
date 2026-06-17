# Band Remote Agents

This folder is for the Python Band SDK workers you can run separately from the Next.js UI.

According to Band docs, the official remote-agent flow is:

```bash
mkdir sentinelops-band-agents
cd sentinelops-band-agents
uv init
uv add "band-sdk[langgraph]" python-dotenv langchain-openai langgraph
```

Create `.env` with your LLM key and `agent_config.yaml` with Band credentials.

Then create one Python file per agent or one generic worker that loads a role-specific prompt.

The Next.js app already contains prompts and agent roles in:

```bash
src/lib/agents/crisisAgents.ts
```
