import numpy as np
from typing import Dict, Any, List


def _generate_synthetic_data() -> tuple[list[float], list[float]]:
    rng = np.random.default_rng(42)
    days = 90
    weekday_boost = np.tile([1.0, 1.0, 1.0, 1.0, 1.15, 0.6, 0.4], 13)[:days]
    base_in = rng.normal(500, 120, days) * weekday_boost
    base_out = rng.normal(400, 100, days) * weekday_boost
    inflows = np.clip(base_in, 50, None).round(2).tolist()
    outflows = np.clip(base_out, 30, None).round(2).tolist()
    return inflows, outflows


def _calc_daily_rate(amounts: List[float], limits=(0.10, 0.10)) -> float:
    if not amounts:
        return 0.0
    arr = np.array(amounts)
    lo = np.percentile(arr, limits[0] * 100)
    hi = np.percentile(arr, (1 - limits[1]) * 100)
    return float(np.mean(np.clip(arr, lo, hi)))


def evaluate_purchase(
    current_cash: float,
    min_reserve: float,
    historical_inflows: List[float],
    historical_outflows: List[float],
    purchase_cost: float,
    recurring_cost: float = 0.0,
    expected_revenue: float = 0.0,
    payment_delay_days: int = 0,
    projection_days: int = 90,
) -> Dict[str, Any]:
    daily_in = _calc_daily_rate(historical_inflows)
    daily_out = _calc_daily_rate(historical_outflows)
    base_net_daily = daily_in - daily_out

    days = np.arange(1, projection_days + 1, dtype=np.float64)
    base_trajectory = current_cash + (days * base_net_daily)

    without_trajectory = base_trajectory.copy()

    # Revenue impact: starts after purchase is made (payment_delay_days)
    revenue_daily = expected_revenue / 30.0
    revenue_impact = np.zeros(projection_days, dtype=np.float64)
    if expected_revenue > 0:
        rev_start = max(payment_delay_days, 1)
        rev_days = np.arange(1, projection_days - rev_start + 1)
        revenue_impact[rev_start:] = np.floor(rev_days / 30) * expected_revenue

    # Build with-purchase trajectory
    with_trajectory = base_trajectory + revenue_impact

    # Apply purchase cost at the delay point
    cost_day = min(payment_delay_days, projection_days)
    if payment_delay_days == 0:
        with_trajectory -= purchase_cost
    elif cost_day > 0:
        with_trajectory[cost_day - 1:] -= purchase_cost

    # Apply recurring cost
    recurring_impact = np.floor(days / 30) * recurring_cost
    with_trajectory -= recurring_impact

    # Can't afford the purchase at all
    cash_at_payment = current_cash if payment_delay_days == 0 else float(base_trajectory[cost_day - 1] if cost_day > 0 else current_cash)
    if cash_at_payment < purchase_cost:
        return {
            "decision": "NO",
            "reason": (
                f"Your balance of ${cash_at_payment:.2f} when payment is due "
                f"won't cover the ${purchase_cost:.2f} purchase cost."
            ),
            "wait_days": None,
            "chart_data": with_trajectory.tolist(),
            "without_purchase_trajectory": without_trajectory.tolist(),
        }

    # Purchase never dips below reserve
    if np.all(with_trajectory >= min_reserve):
        remaining = float(np.min(with_trajectory))
        parts = []
        if expected_revenue > 0:
            parts.append(f"adds ${expected_revenue:.2f}/mo in revenue")
        parts.append(f"keeps you above ${min_reserve:.2f} (lowest: ${remaining:.2f})")
        return {
            "decision": "YES",
            "reason": (
                f"With ${current_cash:.2f} in reserves, this ${purchase_cost:.2f} purchase "
                + ("(due in {0} days) ".format(payment_delay_days) if payment_delay_days > 0 else "")
                + " and ".join(parts) + "."
            ),
            "wait_days": None,
            "chart_data": with_trajectory.tolist(),
            "without_purchase_trajectory": without_trajectory.tolist(),
        }

    # Cash flow is fundamentally declining — waiting can't help
    if base_net_daily <= 0:
        return {
            "decision": "NO",
            "reason": (
                f"Your cash flow is declining (net ${base_net_daily:.2f}/day), and the "
                f"projection dips below your ${min_reserve:.2f} safe reserve."
            ),
            "wait_days": None,
            "chart_data": with_trajectory.tolist(),
            "without_purchase_trajectory": without_trajectory.tolist(),
        }

    # Cash flow is positive — try waiting to build up enough buffer
    for wait_d in range(1, projection_days):
        cash_on_wait_day = float(base_trajectory[wait_d - 1])
        if cash_on_wait_day < purchase_cost:
            continue

        shifted = base_trajectory.copy()
        shifted[wait_d:] -= purchase_cost
        shifted[:wait_d] = base_trajectory[:wait_d]

        post_len = projection_days - wait_d
        if post_len > 0:
            post_days = np.arange(1, post_len + 1)
            shifted[wait_d:] -= np.floor(post_days / 30) * recurring_cost

        if expected_revenue > 0 and wait_d < projection_days:
            rev_days_after = np.arange(1, projection_days - wait_d + 1)
            shifted[wait_d:] += np.floor(rev_days_after / 30) * expected_revenue

        if np.all(shifted[wait_d:] >= min_reserve):
            projected_balance = float(base_trajectory[wait_d - 1])
            parts = []
            if expected_revenue > 0:
                parts.append(f" (adding ${expected_revenue:.2f}/mo in revenue)")
            return {
                "decision": "WAIT",
                "reason": (
                    f"Waiting {wait_d} days lets your cash build to "
                    f"${projected_balance:.2f}, making this purchase safe"
                    + "".join(parts) + "."
                ),
                "wait_days": int(wait_d),
                "chart_data": shifted.tolist(),
                "without_purchase_trajectory": without_trajectory.tolist(),
            }

    return {
        "decision": "NO",
        "reason": (
            f"Your ${purchase_cost:.2f} purchase would drop you below "
            f"${min_reserve:.2f} reserve — and waiting doesn't help enough "
            f"within the 90-day window."
        ),
        "wait_days": None,
        "chart_data": with_trajectory.tolist(),
        "without_purchase_trajectory": without_trajectory.tolist(),
    }
