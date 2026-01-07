"""LangGraph-based matching agent for usage events."""

import logging
from datetime import datetime
from typing import TypedDict, Literal, Any
from uuid import UUID

from langgraph.graph import StateGraph, END
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..database import async_session_maker
from ..models import UsageEvent, MatchedUsage
from ..tools.isrc_matcher import IsrcMatcher, IswcMatcher
from ..tools.fuzzy_matcher import FuzzyMatcher
from ..tools.embedding_matcher import EmbeddingMatcher

logger = logging.getLogger(__name__)


class MatchingState(TypedDict):
    """State for the matching workflow."""

    # Input
    usage_event_id: str
    source: str
    isrc: str | None
    iswc: str | None
    title: str | None
    artist: str | None
    album: str | None
    content_embedding: list[float] | None
    usage_date: str
    territory: str | None
    usage_type: str
    play_count: int
    revenue_amount: float | None
    currency: str

    # Processing state
    current_step: str
    match_attempts: list[dict]

    # Result
    match_found: bool
    work_id: str | None
    recording_id: str | None
    confidence: float
    match_method: str | None
    suggested_matches: list[dict]

    # Outcome
    outcome: str | None  # "matched", "unmatched", "error"
    error: str | None


# Initialize matchers
isrc_matcher = IsrcMatcher()
iswc_matcher = IswcMatcher()
fuzzy_matcher = FuzzyMatcher()
embedding_matcher = EmbeddingMatcher()


async def try_isrc_match(state: MatchingState) -> MatchingState:
    """Attempt to match via ISRC code."""
    state = dict(state)
    state["current_step"] = "isrc_match"

    if not state.get("isrc"):
        logger.debug("No ISRC, skipping ISRC match")
        return state

    async with async_session_maker() as session:
        result = await isrc_matcher.match(session, state["isrc"])

        if result:
            state["match_found"] = True
            state["work_id"] = str(result.work_id)
            state["recording_id"] = str(result.recording_id) if result.recording_id else None
            state["confidence"] = result.confidence
            state["match_method"] = result.method
            state["match_attempts"].append({
                "method": "isrc_exact",
                "success": True,
                "confidence": result.confidence,
            })
            logger.info(f"ISRC match found for {state['usage_event_id']}")
        else:
            state["match_attempts"].append({
                "method": "isrc_exact",
                "success": False,
            })

    return state


async def try_iswc_match(state: MatchingState) -> MatchingState:
    """Attempt to match via ISWC code."""
    state = dict(state)
    state["current_step"] = "iswc_match"

    # Skip if already matched
    if state.get("match_found"):
        return state

    if not state.get("iswc"):
        logger.debug("No ISWC, skipping ISWC match")
        return state

    async with async_session_maker() as session:
        result = await iswc_matcher.match(session, state["iswc"])

        if result:
            state["match_found"] = True
            state["work_id"] = str(result.work_id)
            state["recording_id"] = None
            state["confidence"] = result.confidence
            state["match_method"] = result.method
            state["match_attempts"].append({
                "method": "iswc_exact",
                "success": True,
                "confidence": result.confidence,
            })
            logger.info(f"ISWC match found for {state['usage_event_id']}")
        else:
            state["match_attempts"].append({
                "method": "iswc_exact",
                "success": False,
            })

    return state


async def try_fuzzy_match(state: MatchingState) -> MatchingState:
    """Attempt to match via fuzzy title/artist matching."""
    state = dict(state)
    state["current_step"] = "fuzzy_match"

    # Skip if already matched
    if state.get("match_found"):
        return state

    if not state.get("title"):
        logger.debug("No title, skipping fuzzy match")
        return state

    async with async_session_maker() as session:
        result = await fuzzy_matcher.get_best_match(
            session,
            state["title"],
            state["artist"],
        )

        if result:
            state["match_found"] = True
            state["work_id"] = str(result.work_id)
            state["recording_id"] = str(result.recording_id) if result.recording_id else None
            state["confidence"] = result.confidence
            state["match_method"] = result.method
            state["match_attempts"].append({
                "method": "fuzzy_title",
                "success": True,
                "confidence": result.confidence,
            })
            logger.info(f"Fuzzy match found for {state['usage_event_id']}: confidence={result.confidence:.2f}")
        else:
            # Get suggestions even if no confident match
            suggestions = await fuzzy_matcher.match(
                session,
                state["title"],
                state["artist"],
                limit=settings.max_alternative_matches,
            )
            state["suggested_matches"].extend([
                {
                    "work_id": str(s.work_id),
                    "recording_id": str(s.recording_id) if s.recording_id else None,
                    "confidence": s.confidence,
                    "method": s.method,
                }
                for s in suggestions
            ])
            state["match_attempts"].append({
                "method": "fuzzy_title",
                "success": False,
                "suggestions": len(suggestions),
            })

    return state


async def try_embedding_match(state: MatchingState) -> MatchingState:
    """Attempt to match via embedding similarity."""
    state = dict(state)
    state["current_step"] = "embedding_match"

    # Skip if already matched
    if state.get("match_found"):
        return state

    if not state.get("content_embedding"):
        logger.debug("No embedding, skipping embedding match")
        return state

    async with async_session_maker() as session:
        result = await embedding_matcher.get_best_match(
            session,
            state["content_embedding"],
        )

        if result:
            state["match_found"] = True
            state["work_id"] = str(result.work_id)
            state["recording_id"] = None
            state["confidence"] = result.confidence
            state["match_method"] = result.method
            state["match_attempts"].append({
                "method": "ai_embedding",
                "success": True,
                "confidence": result.confidence,
            })
            logger.info(f"Embedding match found for {state['usage_event_id']}: confidence={result.confidence:.2f}")
        else:
            # Get suggestions for manual review
            suggestions = await embedding_matcher.get_suggestions(
                session,
                state["content_embedding"],
                limit=settings.max_alternative_matches,
            )

            # Add suggestions that aren't already present
            existing_work_ids = {s["work_id"] for s in state["suggested_matches"]}
            for s in suggestions:
                if str(s.work_id) not in existing_work_ids:
                    state["suggested_matches"].append({
                        "work_id": str(s.work_id),
                        "recording_id": None,
                        "confidence": s.confidence,
                        "method": s.method,
                    })

            state["match_attempts"].append({
                "method": "ai_embedding",
                "success": False,
                "suggestions": len(suggestions),
            })

    return state


async def determine_outcome(state: MatchingState) -> MatchingState:
    """Determine the final outcome of matching."""
    state = dict(state)
    state["current_step"] = "determine_outcome"

    if state.get("match_found") and state.get("work_id"):
        state["outcome"] = "matched"
        logger.info(
            f"Match outcome for {state['usage_event_id']}: "
            f"matched to {state['work_id']} via {state['match_method']} "
            f"(confidence={state['confidence']:.2f})"
        )
    else:
        state["outcome"] = "unmatched"
        # Sort suggestions by confidence
        state["suggested_matches"] = sorted(
            state["suggested_matches"],
            key=lambda x: x["confidence"],
            reverse=True,
        )[:settings.max_alternative_matches]
        logger.info(
            f"Match outcome for {state['usage_event_id']}: "
            f"unmatched, {len(state['suggested_matches'])} suggestions"
        )

    return state


async def persist_result(state: MatchingState) -> MatchingState:
    """Persist the matching result to the database."""
    state = dict(state)
    state["current_step"] = "persist_result"

    async with async_session_maker() as session:
        # Update usage event status
        usage_event = await session.get(UsageEvent, UUID(state["usage_event_id"]))

        if usage_event:
            usage_event.processing_status = state["outcome"]
            usage_event.processed_at = datetime.utcnow()

            # Create matched_usage record if matched
            if state["outcome"] == "matched" and state.get("work_id"):
                matched_usage = MatchedUsage(
                    usage_event_id=UUID(state["usage_event_id"]),
                    work_id=UUID(state["work_id"]),
                    recording_id=UUID(state["recording_id"]) if state.get("recording_id") else None,
                    match_confidence=state["confidence"],
                    match_method=state["match_method"],
                    matched_by="system",
                )
                session.add(matched_usage)

            await session.commit()
            logger.debug(f"Persisted result for {state['usage_event_id']}")
        else:
            logger.warning(f"Usage event not found: {state['usage_event_id']}")

    return state


def should_continue_matching(state: MatchingState) -> Literal["continue", "done"]:
    """Check if we should continue trying other matching methods."""
    if state.get("match_found"):
        return "done"
    return "continue"


class MatchingAgent:
    """LangGraph agent for matching usage events to works."""

    def __init__(self):
        self.graph = self._build_graph()

    def _build_graph(self) -> StateGraph:
        """Build the matching workflow graph."""
        workflow = StateGraph(MatchingState)

        # Add nodes
        workflow.add_node("isrc_match", try_isrc_match)
        workflow.add_node("iswc_match", try_iswc_match)
        workflow.add_node("fuzzy_match", try_fuzzy_match)
        workflow.add_node("embedding_match", try_embedding_match)
        workflow.add_node("determine_outcome", determine_outcome)
        workflow.add_node("persist_result", persist_result)

        # Set entry point
        workflow.set_entry_point("isrc_match")

        # Add conditional edges for early exit on match
        workflow.add_conditional_edges(
            "isrc_match",
            should_continue_matching,
            {
                "done": "determine_outcome",
                "continue": "iswc_match",
            }
        )

        workflow.add_conditional_edges(
            "iswc_match",
            should_continue_matching,
            {
                "done": "determine_outcome",
                "continue": "fuzzy_match",
            }
        )

        workflow.add_conditional_edges(
            "fuzzy_match",
            should_continue_matching,
            {
                "done": "determine_outcome",
                "continue": "embedding_match",
            }
        )

        # Embedding match always goes to determine outcome
        workflow.add_edge("embedding_match", "determine_outcome")

        # After determining outcome, persist result
        workflow.add_edge("determine_outcome", "persist_result")

        # End after persisting
        workflow.add_edge("persist_result", END)

        return workflow.compile()

    async def match(self, event_data: dict[str, Any]) -> MatchingState:
        """
        Run the matching workflow for a usage event.

        Args:
            event_data: Normalized usage event data

        Returns:
            Final state with matching result
        """
        initial_state: MatchingState = {
            "usage_event_id": str(event_data.get("event_id", "")),
            "source": event_data.get("source", ""),
            "isrc": event_data.get("isrc"),
            "iswc": event_data.get("iswc"),
            "title": event_data.get("reported_title"),
            "artist": event_data.get("reported_artist"),
            "album": event_data.get("reported_album"),
            "content_embedding": event_data.get("content_embedding"),
            "usage_date": str(event_data.get("usage_date", "")),
            "territory": event_data.get("territory"),
            "usage_type": event_data.get("usage_type", "stream"),
            "play_count": event_data.get("play_count", 1),
            "revenue_amount": float(event_data["revenue_amount"]) if event_data.get("revenue_amount") else None,
            "currency": event_data.get("currency", "USD"),
            "current_step": "start",
            "match_attempts": [],
            "match_found": False,
            "work_id": None,
            "recording_id": None,
            "confidence": 0.0,
            "match_method": None,
            "suggested_matches": [],
            "outcome": None,
            "error": None,
        }

        try:
            result = await self.graph.ainvoke(initial_state)
            return result
        except Exception as e:
            logger.error(f"Error in matching agent: {e}", exc_info=True)
            initial_state["outcome"] = "error"
            initial_state["error"] = str(e)
            return initial_state


# Singleton instance
_agent: MatchingAgent | None = None


def get_matching_agent() -> MatchingAgent:
    """Get or create the matching agent singleton."""
    global _agent
    if _agent is None:
        _agent = MatchingAgent()
    return _agent


async def run_matching_agent(event_data: dict[str, Any]) -> MatchingState:
    """
    Convenience function to run the matching agent.

    Args:
        event_data: Normalized usage event data

    Returns:
        Final matching state
    """
    agent = get_matching_agent()
    return await agent.match(event_data)
