"""LangGraph-based contract generation agent."""

from typing import TypedDict, Any
from datetime import datetime
import httpx
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, END

from src.config import settings
from src.tools.template_tools import (
    get_template_for_deal_type,
    fill_template,
    format_territories,
    format_currency,
)


class ContractState(TypedDict):
    """State for the contract generation graph."""
    deal_id: str
    deal_data: dict | None
    songwriter_data: dict | None
    works_data: list | None
    template: str | None
    variables: dict | None
    filled_contract: str | None
    suggested_terms: str | None
    final_contract: str | None
    error: str | None


async def fetch_deal_data(state: ContractState) -> ContractState:
    """Fetch deal, songwriter, and works data from deals service."""
    deal_id = state["deal_id"]

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{settings.deals_service_url}/deals/{deal_id}",
                timeout=10.0
            )
            response.raise_for_status()
            deal_data = response.json()

            return {
                **state,
                "deal_data": deal_data,
                "songwriter_data": deal_data.get("songwriter"),
                "works_data": deal_data.get("works", []),
            }
    except httpx.HTTPError as e:
        return {
            **state,
            "error": f"Failed to fetch deal data: {str(e)}",
        }


def select_template(state: ContractState) -> ContractState:
    """Select the appropriate contract template based on deal type."""
    if state.get("error"):
        return state

    deal_data = state.get("deal_data")
    if not deal_data:
        return {**state, "error": "No deal data available"}

    deal_type = deal_data.get("deal_type", "publishing")
    template = get_template_for_deal_type(deal_type)

    return {**state, "template": template}


def prepare_variables(state: ContractState) -> ContractState:
    """Prepare template variables from deal data."""
    if state.get("error"):
        return state

    deal = state.get("deal_data", {})
    songwriter = state.get("songwriter_data", {})
    works = state.get("works_data", [])

    # Format expiration clause
    expiration_date = deal.get("expiration_date")
    expiration_clause = ""
    if expiration_date:
        expiration_clause = f", terminating on {expiration_date}"

    # Format works list if any
    works_list = ""
    if works:
        works_list = "\n\nEXHIBIT A - COMPOSITIONS:\n"
        for i, dw in enumerate(works, 1):
            work = dw.get("work", {})
            works_list += f"{i}. {work.get('title', 'Untitled')}"
            if work.get("iswc"):
                works_list += f" (ISWC: {work['iswc']})"
            works_list += "\n"

    variables = {
        "deal_number": deal.get("deal_number", ""),
        "songwriter_name": songwriter.get("legal_name", "[Songwriter Name]"),
        "effective_date": deal.get("effective_date", datetime.now().strftime("%Y-%m-%d")),
        "expiration_date": expiration_date or "[No Expiration]",
        "expiration_clause": expiration_clause,
        "term_months": deal.get("term_months", 12),
        "publisher_share": deal.get("publisher_share", 50),
        "writer_share": deal.get("writer_share", 50),
        "advance_amount": format_currency(deal.get("advance_amount")),
        "territories": format_territories(deal.get("territories")),
        "additional_terms": "",  # Will be filled by AI
        "works_list": works_list,
    }

    return {**state, "variables": variables}


def fill_contract_template(state: ContractState) -> ContractState:
    """Fill the template with variables."""
    if state.get("error"):
        return state

    template = state.get("template")
    variables = state.get("variables")

    if not template or not variables:
        return {**state, "error": "Missing template or variables"}

    # Fill template without additional terms first
    filled = fill_template(template, variables)

    return {**state, "filled_contract": filled}


async def suggest_additional_terms(state: ContractState) -> ContractState:
    """Use LLM to suggest additional terms based on deal context."""
    if state.get("error"):
        return state

    # Skip AI suggestions if no API key configured
    if not settings.openai_api_key:
        return {
            **state,
            "suggested_terms": "No additional terms suggested.",
            "final_contract": state.get("filled_contract", ""),
        }

    deal = state.get("deal_data", {})
    songwriter = state.get("songwriter_data", {})
    works = state.get("works_data", [])

    llm = ChatOpenAI(
        model=settings.openai_model,
        api_key=settings.openai_api_key,
        temperature=0.3,
    )

    prompt = f"""Based on the following music publishing deal details, suggest 2-3 brief additional terms
that would be appropriate to include in the contract. Keep suggestions practical and industry-standard.

Deal Type: {deal.get('deal_type', 'publishing')}
Territory: {format_territories(deal.get('territories'))}
Publisher Share: {deal.get('publisher_share', 50)}%
Writer Share: {deal.get('writer_share', 50)}%
Advance: {format_currency(deal.get('advance_amount'))}
Term: {deal.get('term_months', 12)} months
Number of Works: {len(works)}
Songwriter PRO Affiliation: {songwriter.get('pro_affiliation', 'Not specified')}

Provide brief, specific terms as a bulleted list. Focus on:
- Accounting and payment timing
- Audit rights
- Delivery requirements (if applicable)
- Territory-specific considerations

Keep each term to 1-2 sentences."""

    try:
        response = await llm.ainvoke(prompt)
        suggested_terms = response.content

        return {
            **state,
            "suggested_terms": suggested_terms,
        }
    except Exception as e:
        # If AI fails, continue without suggestions
        return {
            **state,
            "suggested_terms": "Unable to generate additional terms.",
        }


def generate_final_contract(state: ContractState) -> ContractState:
    """Compile the final contract with suggested terms."""
    if state.get("error"):
        return state

    filled_contract = state.get("filled_contract", "")
    suggested_terms = state.get("suggested_terms", "")
    works_list = state.get("variables", {}).get("works_list", "")

    # Insert suggested terms into the contract
    final_contract = filled_contract.replace(
        "{{additional_terms}}",
        suggested_terms if suggested_terms else "[None]"
    )

    # Append works list if present
    if works_list:
        final_contract += works_list

    return {**state, "final_contract": final_contract}


def should_continue(state: ContractState) -> str:
    """Determine if we should continue or end due to error."""
    if state.get("error"):
        return "error"
    return "continue"


class ContractAgent:
    """LangGraph agent for generating contracts."""

    def __init__(self):
        self.graph = self._build_graph()

    def _build_graph(self) -> StateGraph:
        """Build the contract generation workflow graph."""
        workflow = StateGraph(ContractState)

        # Add nodes
        workflow.add_node("fetch_data", fetch_deal_data)
        workflow.add_node("select_template", select_template)
        workflow.add_node("prepare_variables", prepare_variables)
        workflow.add_node("fill_template", fill_contract_template)
        workflow.add_node("suggest_terms", suggest_additional_terms)
        workflow.add_node("generate_final", generate_final_contract)

        # Add edges
        workflow.set_entry_point("fetch_data")
        workflow.add_edge("fetch_data", "select_template")
        workflow.add_edge("select_template", "prepare_variables")
        workflow.add_edge("prepare_variables", "fill_template")
        workflow.add_edge("fill_template", "suggest_terms")
        workflow.add_edge("suggest_terms", "generate_final")
        workflow.add_edge("generate_final", END)

        return workflow.compile()

    async def generate(self, deal_id: str) -> dict[str, Any]:
        """Generate a contract for the given deal."""
        initial_state: ContractState = {
            "deal_id": deal_id,
            "deal_data": None,
            "songwriter_data": None,
            "works_data": None,
            "template": None,
            "variables": None,
            "filled_contract": None,
            "suggested_terms": None,
            "final_contract": None,
            "error": None,
        }

        result = await self.graph.ainvoke(initial_state)

        if result.get("error"):
            return {
                "success": False,
                "error": result["error"],
                "contract": None,
            }

        return {
            "success": True,
            "contract": result.get("final_contract"),
            "suggested_terms": result.get("suggested_terms"),
        }


# Singleton instance
_agent: ContractAgent | None = None


def get_contract_agent() -> ContractAgent:
    """Get or create the contract agent singleton."""
    global _agent
    if _agent is None:
        _agent = ContractAgent()
    return _agent


async def generate_contract(deal_id: str) -> dict[str, Any]:
    """Convenience function to generate a contract."""
    agent = get_contract_agent()
    return await agent.generate(deal_id)
