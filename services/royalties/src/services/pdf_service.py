"""
PDF Generation Service

Generates royalty statement PDFs using WeasyPrint and Jinja2 templates.
"""

import io
from datetime import datetime
from decimal import Decimal
from pathlib import Path
from typing import Optional

from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML

from ..schemas import RoyaltyLineItemResponse, RoyaltyStatementResponse


class PDFService:
    """Service for generating royalty statement PDFs."""

    def __init__(self, template_dir: Optional[str] = None):
        if template_dir is None:
            # Default to templates directory relative to this file
            template_dir = str(Path(__file__).parent.parent / "templates")

        self.env = Environment(
            loader=FileSystemLoader(template_dir),
            autoescape=True,
        )

        # Register custom filters
        self.env.filters["currency"] = self._format_currency
        self.env.filters["date"] = self._format_date
        self.env.filters["number"] = self._format_number

    def _format_currency(self, value: Decimal | float | int) -> str:
        """Format value as currency."""
        if value is None:
            return "$0.00"
        return f"${float(value):,.2f}"

    def _format_date(self, value: datetime | str) -> str:
        """Format date for display."""
        if value is None:
            return ""
        if isinstance(value, str):
            try:
                value = datetime.fromisoformat(value.replace("Z", "+00:00"))
            except ValueError:
                return value
        return value.strftime("%B %d, %Y")

    def _format_number(self, value: int | float) -> str:
        """Format number with thousands separators."""
        if value is None:
            return "0"
        return f"{int(value):,}"

    def generate_statement_pdf(
        self,
        statement: RoyaltyStatementResponse,
        line_items: list[RoyaltyLineItemResponse],
    ) -> bytes:
        """
        Generate a PDF for a royalty statement.

        Args:
            statement: The royalty statement data
            line_items: The line items for the statement

        Returns:
            PDF file content as bytes
        """
        template = self.env.get_template("statement.html")

        # Group line items by usage type for summary
        usage_summary = {}
        for item in line_items:
            usage_type = item.usage_type
            if usage_type not in usage_summary:
                usage_summary[usage_type] = {
                    "count": 0,
                    "revenue": Decimal("0"),
                    "royalty": Decimal("0"),
                }
            usage_summary[usage_type]["count"] += item.usage_count
            usage_summary[usage_type]["revenue"] += item.gross_revenue
            usage_summary[usage_type]["royalty"] += item.calculated_royalty

        # Calculate totals
        total_usage_count = sum(item.usage_count for item in line_items)
        total_gross_revenue = sum(item.gross_revenue for item in line_items)

        # Prepare template context
        context = {
            "statement": statement,
            "line_items": line_items,
            "usage_summary": usage_summary,
            "total_usage_count": total_usage_count,
            "total_gross_revenue": total_gross_revenue,
            "generated_at": datetime.utcnow(),
            "company_name": "MusicPub Publishing",
            "company_address": "123 Music Lane, Nashville, TN 37203",
            "company_email": "royalties@musicpub.example.com",
        }

        # Render HTML
        html_content = template.render(**context)

        # Generate PDF
        pdf_buffer = io.BytesIO()
        HTML(string=html_content).write_pdf(pdf_buffer)
        pdf_buffer.seek(0)

        return pdf_buffer.getvalue()
