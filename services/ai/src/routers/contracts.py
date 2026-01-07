"""Contract generation API routes."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from src.agents.contract_agent import generate_contract
from src.tools.template_tools import CONTRACT_TEMPLATES


router = APIRouter(prefix="/contracts", tags=["contracts"])


class ContractGenerateRequest(BaseModel):
    deal_id: str


class ContractGenerateResponse(BaseModel):
    success: bool
    contract: str | None = None
    suggested_terms: str | None = None
    error: str | None = None


class TemplateInfo(BaseModel):
    deal_type: str
    name: str
    description: str


class TemplatesResponse(BaseModel):
    templates: list[TemplateInfo]


TEMPLATE_DESCRIPTIONS = {
    "publishing": "Standard publishing agreement transferring copyright ownership",
    "co_publishing": "Co-publishing arrangement with shared copyright ownership",
    "administration": "Administration deal without copyright transfer",
    "sub_publishing": "Sub-publishing agreement for territorial representation",
    "sync_license": "Synchronization license for audiovisual works",
    "mechanical_license": "Mechanical license for reproduction rights",
}


@router.post("/generate", response_model=ContractGenerateResponse)
async def generate_contract_endpoint(request: ContractGenerateRequest):
    """Generate a contract for the specified deal using AI."""
    result = await generate_contract(request.deal_id)

    if not result.get("success"):
        raise HTTPException(
            status_code=400,
            detail=result.get("error", "Contract generation failed")
        )

    return ContractGenerateResponse(
        success=True,
        contract=result.get("contract"),
        suggested_terms=result.get("suggested_terms"),
    )


@router.get("/templates", response_model=TemplatesResponse)
async def list_templates():
    """List available contract templates."""
    templates = []

    for deal_type in CONTRACT_TEMPLATES.keys():
        templates.append(
            TemplateInfo(
                deal_type=deal_type,
                name=deal_type.replace("_", " ").title(),
                description=TEMPLATE_DESCRIPTIONS.get(deal_type, ""),
            )
        )

    return TemplatesResponse(templates=templates)


@router.get("/templates/{deal_type}")
async def get_template(deal_type: str):
    """Get a specific contract template."""
    if deal_type not in CONTRACT_TEMPLATES:
        raise HTTPException(
            status_code=404,
            detail=f"Template not found for deal type: {deal_type}"
        )

    return {
        "deal_type": deal_type,
        "template": CONTRACT_TEMPLATES[deal_type],
        "description": TEMPLATE_DESCRIPTIONS.get(deal_type, ""),
    }
