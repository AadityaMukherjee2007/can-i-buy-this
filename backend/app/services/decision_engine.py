from datetime import datetime, timedelta

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


def _build_trajectory(
    current_cash: float,
    target_in: float,
    target_out: float,
    projection_days: int = 90,
) -> np.ndarray:
    rng = np.random.default_rng(42)
    weekday_boost = np.tile([1.0, 1.0, 1.0, 1.0, 1.15, 0.6, 0.4], 13)[:projection_days]
    raw_in = rng.normal(target_in, target_in * 0.24, projection_days) * weekday_boost
    raw_out = rng.normal(target_out, target_out * 0.25, projection_days) * weekday_boost

    in_arr = np.clip(raw_in, target_in * 0.1, None)
    out_arr = np.clip(raw_out, target_out * 0.1, None)

    in_arr *= target_in / max(np.mean(in_arr), 0.01)
    out_arr *= target_out / max(np.mean(out_arr), 0.01)

    daily_net = in_arr - out_arr
    return current_cash + np.cumsum(daily_net)


def _ramp_up_revenue(expected_revenue: float, start_day: int, projection_days: int) -> np.ndarray:
    impact = np.zeros(projection_days, dtype=np.float64)
    if expected_revenue <= 0 or start_day >= projection_days:
        return impact
    ramp_duration = 60
    days_from_start = np.arange(projection_days - start_day, dtype=np.float64)
    ramp_factor = np.clip(days_from_start / ramp_duration, 0.0, 1.0)
    monthly_cycles = days_from_start / 30.0
    impact[start_day:] = expected_revenue * monthly_cycles * ramp_factor
    return impact


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
    today = datetime.utcnow().date()
    target_in = _calc_daily_rate(historical_inflows) if historical_inflows else 500.0
    target_out = _calc_daily_rate(historical_outflows) if historical_outflows else 400.0
    base_net_daily = target_in - target_out

    base_trajectory = _build_trajectory(current_cash, target_in, target_out, projection_days)
    days = np.arange(1, projection_days + 1, dtype=np.float64)

    without_trajectory = base_trajectory.copy()
    cost_day = min(payment_delay_days, projection_days)

    revenue_impact = _ramp_up_revenue(expected_revenue, cost_day, projection_days)
    with_trajectory = base_trajectory + revenue_impact

    if payment_delay_days == 0:
        with_trajectory -= purchase_cost
    elif cost_day > 0:
        with_trajectory[cost_day - 1:] -= purchase_cost

    recurring_impact = np.floor(days / 30) * recurring_cost
    with_trajectory -= recurring_impact

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

    for wait_d in range(1, projection_days):
        cash_on_wait_day = float(base_trajectory[wait_d - 1])
        if cash_on_wait_day < purchase_cost:
            continue

        shifted = base_trajectory.copy()
        shifted[wait_d:] -= purchase_cost

        post_len = projection_days - wait_d
        if post_len > 0:
            post_days = np.arange(1, post_len + 1)
            shifted[wait_d:] -= np.floor(post_days / 30) * recurring_cost

        if expected_revenue > 0 and wait_d < projection_days:
            rev_impact = _ramp_up_revenue(expected_revenue, wait_d, projection_days)
            shifted += rev_impact

        if np.all(shifted[wait_d:] >= min_reserve):
            projected_balance = float(base_trajectory[wait_d - 1])
            wait_date = (today + timedelta(days=int(wait_d))).isoformat()
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
                "wait_date": wait_date,
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
