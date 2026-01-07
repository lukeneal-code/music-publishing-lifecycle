"""Contract templates for different deal types."""

from typing import Any


CONTRACT_TEMPLATES = {
    "publishing": """
MUSIC PUBLISHING AGREEMENT

This Music Publishing Agreement ("Agreement") is entered into as of {{effective_date}}
by and between:

PUBLISHER: Music Publishing Lifecycle Inc. ("Publisher")
SONGWRITER: {{songwriter_name}} ("Songwriter")

Deal Number: {{deal_number}}

1. GRANT OF RIGHTS

Songwriter hereby grants to Publisher {{publisher_share}}% of all right, title, and interest
in and to the musical compositions created during the term of this Agreement ("Compositions"),
including but not limited to:
- Mechanical rights
- Synchronization rights
- Public performance rights
- Print rights
- Digital distribution rights

2. TERRITORY

This Agreement covers the following territories: {{territories}}.

3. TERM

The term of this Agreement shall commence on {{effective_date}} and continue for a period
of {{term_months}} months{{expiration_clause}}.

4. COMPENSATION

a) Advance: Publisher shall pay Songwriter an advance in the amount of {{advance_amount}}.

b) Royalties: Publisher shall pay Songwriter {{writer_share}}% of all net receipts
received by Publisher from the exploitation of the Compositions.

5. SONGWRITER REPRESENTATIONS

Songwriter represents and warrants that:
- All Compositions are original works
- Songwriter has full right and authority to enter into this Agreement
- The Compositions do not infringe upon any third party rights

6. ADDITIONAL TERMS

{{additional_terms}}

IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first written above.

PUBLISHER:
Music Publishing Lifecycle Inc.
By: _______________________
Date: _______________________

SONGWRITER:
{{songwriter_name}}
Signature: _______________________
Date: _______________________
""",

    "co_publishing": """
CO-PUBLISHING AGREEMENT

This Co-Publishing Agreement ("Agreement") is entered into as of {{effective_date}}
by and between:

PUBLISHER: Music Publishing Lifecycle Inc. ("Publisher")
CO-PUBLISHER/SONGWRITER: {{songwriter_name}} ("Songwriter")

Deal Number: {{deal_number}}

1. CO-PUBLISHING ARRANGEMENT

This Agreement establishes a co-publishing arrangement wherein the copyright ownership
of the Compositions shall be divided as follows:
- Publisher: {{publisher_share}}%
- Songwriter: {{writer_share}}%

2. ADMINISTRATION

Publisher shall have the exclusive right to administer the Compositions throughout
the following territories: {{territories}}.

3. TERM

The term of this Agreement shall commence on {{effective_date}} and continue for
{{term_months}} months{{expiration_clause}}.

4. ADVANCE AND ROYALTIES

a) Advance: Publisher shall pay Songwriter an advance of {{advance_amount}}.

b) Songwriter shall receive {{writer_share}}% of all gross receipts from the exploitation
of the Compositions.

5. SONGWRITER'S PUBLISHING COMPANY

Songwriter may designate a publishing entity to receive their share of publishing income.

6. ADDITIONAL TERMS

{{additional_terms}}

IN WITNESS WHEREOF, the parties have executed this Agreement.

PUBLISHER:                          SONGWRITER:
Music Publishing Lifecycle Inc.     {{songwriter_name}}
By: ___________________            Signature: ___________________
Date: ___________________          Date: ___________________
""",

    "administration": """
ADMINISTRATION AGREEMENT

This Administration Agreement ("Agreement") is entered into as of {{effective_date}}
by and between:

ADMINISTRATOR: Music Publishing Lifecycle Inc. ("Administrator")
PUBLISHER/SONGWRITER: {{songwriter_name}} ("Owner")

Deal Number: {{deal_number}}

1. APPOINTMENT

Owner hereby appoints Administrator as its exclusive administrator of the musical
compositions listed in Exhibit A ("Compositions") for the territories: {{territories}}.

2. ADMINISTRATOR'S DUTIES

Administrator shall:
- Register Compositions with performing rights organizations
- License and collect royalties for all uses
- Audit licensees as necessary
- Provide quarterly accounting statements

3. ADMINISTRATION FEE

Administrator shall retain {{publisher_share}}% of all gross receipts as an administration fee.
Owner shall receive {{writer_share}}% of all gross receipts.

4. TERM

The term of this Agreement shall be {{term_months}} months commencing {{effective_date}}
{{expiration_clause}}.

5. OWNERSHIP

Owner retains full copyright ownership of all Compositions. This Agreement grants
administration rights only.

6. ADDITIONAL TERMS

{{additional_terms}}

IN WITNESS WHEREOF, the parties have executed this Agreement.

ADMINISTRATOR:                      OWNER:
Music Publishing Lifecycle Inc.     {{songwriter_name}}
By: ___________________            Signature: ___________________
Date: ___________________          Date: ___________________
""",

    "sub_publishing": """
SUB-PUBLISHING AGREEMENT

This Sub-Publishing Agreement ("Agreement") is entered into as of {{effective_date}}
by and between:

ORIGINAL PUBLISHER: Music Publishing Lifecycle Inc. ("Original Publisher")
SUB-PUBLISHER: {{songwriter_name}} ("Sub-Publisher")

Deal Number: {{deal_number}}

1. GRANT OF SUB-PUBLISHING RIGHTS

Original Publisher hereby grants Sub-Publisher the exclusive right to sub-publish
and administer the Compositions in the following territories: {{territories}}.

2. COMPENSATION

Sub-Publisher shall retain {{publisher_share}}% of all income collected in the Territory.
Original Publisher shall receive {{writer_share}}% of all income collected.

3. TERM

The term of this Agreement shall be {{term_months}} months commencing {{effective_date}}
{{expiration_clause}}.

4. DUTIES

Sub-Publisher shall:
- Register Compositions with local PROs
- Actively promote and exploit Compositions in the Territory
- Provide semi-annual accounting statements

5. ADDITIONAL TERMS

{{additional_terms}}

IN WITNESS WHEREOF, the parties have executed this Agreement.

ORIGINAL PUBLISHER:                 SUB-PUBLISHER:
Music Publishing Lifecycle Inc.     {{songwriter_name}}
By: ___________________            Signature: ___________________
Date: ___________________          Date: ___________________
""",

    "sync_license": """
SYNCHRONIZATION LICENSE

This Synchronization License ("License") is granted as of {{effective_date}}
by and between:

LICENSOR: Music Publishing Lifecycle Inc. ("Licensor")
LICENSEE: {{songwriter_name}} ("Licensee")

Deal Number: {{deal_number}}

1. GRANT OF LICENSE

Licensor hereby grants Licensee a non-exclusive license to synchronize the
Composition(s) with visual media in the following territories: {{territories}}.

2. LICENSE FEE

Licensee shall pay Licensor a one-time synchronization fee of {{advance_amount}}.

Fee Split:
- Publisher Share: {{publisher_share}}%
- Writer Share: {{writer_share}}%

3. TERM

This License shall be effective for {{term_months}} months from {{effective_date}}
{{expiration_clause}}.

4. PERMITTED USES

[To be specified based on production]

5. RESTRICTIONS

Licensee shall not:
- Alter the Composition without written consent
- Sub-license the synchronization rights
- Use the Composition in any pornographic or defamatory context

6. ADDITIONAL TERMS

{{additional_terms}}

LICENSOR:                          LICENSEE:
Music Publishing Lifecycle Inc.     {{songwriter_name}}
By: ___________________            Signature: ___________________
Date: ___________________          Date: ___________________
""",

    "mechanical_license": """
MECHANICAL LICENSE

This Mechanical License ("License") is granted as of {{effective_date}}
by and between:

LICENSOR: Music Publishing Lifecycle Inc. ("Licensor")
LICENSEE: {{songwriter_name}} ("Licensee")

Deal Number: {{deal_number}}

1. GRANT OF LICENSE

Licensor hereby grants Licensee a non-exclusive mechanical license to reproduce
and distribute the Composition(s) in the following territories: {{territories}}.

2. ROYALTY RATE

Licensee shall pay the statutory mechanical royalty rate, distributed as:
- Publisher Share: {{publisher_share}}%
- Writer Share: {{writer_share}}%

Advance payment: {{advance_amount}}

3. TERM

This License shall be effective for {{term_months}} months from {{effective_date}}
{{expiration_clause}}.

4. ACCOUNTING

Licensee shall provide quarterly accounting statements and payments.

5. RESTRICTIONS

- No changes to lyrics or melody without consent
- Licensee must include proper copyright notice on all copies

6. ADDITIONAL TERMS

{{additional_terms}}

LICENSOR:                          LICENSEE:
Music Publishing Lifecycle Inc.     {{songwriter_name}}
By: ___________________            Signature: ___________________
Date: ___________________          Date: ___________________
""",
}


def get_template_for_deal_type(deal_type: str) -> str:
    """Get the contract template for a specific deal type."""
    return CONTRACT_TEMPLATES.get(deal_type, CONTRACT_TEMPLATES["publishing"])


def fill_template(template: str, variables: dict[str, Any]) -> str:
    """Fill in template variables with actual values."""
    result = template

    for key, value in variables.items():
        placeholder = "{{" + key + "}}"
        if value is not None:
            result = result.replace(placeholder, str(value))
        else:
            result = result.replace(placeholder, "[Not Specified]")

    return result


def format_territories(territories: list[str] | None) -> str:
    """Format territory list for display in contract."""
    if not territories:
        return "Worldwide"

    territory_names = {
        "WORLD": "Worldwide",
        "US": "United States",
        "CA": "Canada",
        "UK": "United Kingdom",
        "DE": "Germany",
        "FR": "France",
        "AU": "Australia",
        "JP": "Japan",
    }

    formatted = [territory_names.get(t, t) for t in territories]

    if len(formatted) == 1:
        return formatted[0]
    elif len(formatted) == 2:
        return f"{formatted[0]} and {formatted[1]}"
    else:
        return ", ".join(formatted[:-1]) + f", and {formatted[-1]}"


def format_currency(amount: float | int | str | None) -> str:
    """Format currency amount for display."""
    if amount is None:
        return "$0.00"
    try:
        # Convert to float if it's a string
        numeric_amount = float(amount)
        if numeric_amount == 0:
            return "$0.00"
        return f"${numeric_amount:,.2f}"
    except (ValueError, TypeError):
        return "$0.00"
