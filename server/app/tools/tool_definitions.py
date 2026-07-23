from app.tools.web_search_tool import search_web

COMPANY_RESEARCH_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "search_web",
            "description": "Search the web for public information about a company or business.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The search query, e.g. the company name plus relevant keywords."
                    }
                },
                "required": ["query"],
            },
        },
    }
]

TOOL_FUNCTIONS = {"search_web": search_web}