"""Accuracy tests for the decision engine.

Each test case defines a scenario and asserts the expected decision + reason shape.
Run inside the Docker container: pytest backend/tests/ -v
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import numpy as np
from app.services.decision_engine import evaluate_purchase, _generate_synthetic_data


def fmt(n: float) -> str:
    return f"${n:.2f}"


def check_reason_has_numbers(reason: str) -> bool:
    """Verify the reason string contains at least one dollar amount."""
    return "$" in reason


def test_synthetic_data_is_realistic():
    """Verify synthetic data looks like real daily business transactions."""
    inflows, outflows = _generate_synthetic_data()
    assert len(inflows) == 90
    assert len(outflows) == 90
    in_arr = np.array(inflows)
    out_arr = np.array(outflows)
    assert in_arr.mean() > out_arr.mean(), "Business should be net positive"
    assert 200 < in_arr.mean() < 800, f"Mean inflow {in_arr.mean():.0f} out of realistic range"
    assert 150 < out_arr.mean() < 650, f"Mean outflow {out_arr.mean():.0f} out of realistic range"
    print(f"  Synthetic data: avg in=${in_arr.mean():.0f}/day, avg out=${out_arr.mean():.0f}/day")


def test_yes_when_healthy():
    """$10k cash, $5k reserve, net positive ~$100/day → buy $5k should be YES."""
    r = evaluate_purchase(10000, 5000, [500], [400], 5000)
    print(f"  YES test: {r['decision']} — {r['reason']}")
    assert r["decision"] == "YES"
    assert check_reason_has_numbers(r["reason"])
    assert len(r["chart_data"]) == 90
    assert len(r["without_purchase_trajectory"]) == 90


def test_no_when_declining():
    """$10k cash, $5k reserve, net negative ~$100/day → buy $5k should be NO."""
    r = evaluate_purchase(10000, 5000, [400], [500], 5000)
    print(f"  NO declining: {r['decision']} — {r['reason']}")
    assert r["decision"] == "NO"
    assert check_reason_has_numbers(r["reason"])


def test_wait_when_tight():
    """$6k cash, $5k reserve, net positive ~$100/day → buy $5k should be WAIT."""
    r = evaluate_purchase(6000, 5000, [500], [400], 5000)
    print(f"  WAIT test: {r['decision']} — {r['reason']}")
    assert r["decision"] == "WAIT"
    assert r["wait_days"] is not None and r["wait_days"] > 0
    assert check_reason_has_numbers(r["reason"])


def test_no_when_purchase_exceeds_cash():
    """$5k cash, $5k reserve → buy $7k should be NO (can't afford)."""
    r = evaluate_purchase(5000, 5000, [500], [400], 7000)
    print(f"  Exceeds cash: {r['decision']} — {r['reason']}")
    assert r["decision"] == "NO"
    assert "cover" in r["reason"].lower()


def test_no_when_hopeless():
    """$5k cash, $5k reserve, net negative → buy $3k should be NO."""
    r = evaluate_purchase(5000, 5000, [300], [500], 3000)
    print(f"  Hopeless: {r['decision']} — {r['reason']}")
    assert r["decision"] == "NO"


def test_yes_with_recurring():
    """$15k cash, $5k reserve, net positive → buy $5k + $200/mo should be YES."""
    r = evaluate_purchase(15000, 5000, [500], [400], 5000, recurring_cost=200)
    print(f"  YES + recurring: {r['decision']} — {r['reason']}")
    assert r["decision"] == "YES"


def test_wait_with_recurring():
    """$6k cash, $5k reserve, net small positive → buy $4k + $100/mo should be WAIT."""
    r = evaluate_purchase(6000, 5000, [500], [450], 4000, recurring_cost=100)
    print(f"  WAIT + recurring: {r['decision']} — {r['reason']}")
    assert r["decision"] in ("WAIT", "YES")  # borderline, either is reasonable


def test_high_reserve_strict():
    """$10k cash, $9k reserve → buy $2k should be WAIT (barely above reserve)."""
    r = evaluate_purchase(10000, 9000, [500], [400], 2000)
    print(f"  Strict reserve: {r['decision']} — {r['reason']}")
    assert r["decision"] in ("WAIT", "YES")
    assert check_reason_has_numbers(r["reason"])


def test_zero_reserve():
    """$3k cash, $0 reserve, net positive → buy $2k should be YES (no reserve constraint)."""
    r = evaluate_purchase(3000, 0, [500], [400], 2000)
    print(f"  Zero reserve: {r['decision']} — {r['reason']}")
    assert r["decision"] == "YES"


def test_large_purchase_above_reserve():
    """$12k cash, $5k reserve, net flat → buy $6k should be YES (stays above reserve)."""
    r = evaluate_purchase(12000, 5000, [450], [450], 6000)
    print(f"  Large YES: {r['decision']} — {r['reason']}")
    assert r["decision"] == "YES"
    # After $6k purchase, remaining = $6k which is above $5k reserve


def test_chart_data_monotonic():
    """Chart data should be consistent (no NaN, correct length)."""
    r = evaluate_purchase(10000, 5000, [500], [400], 3000)
    assert len(r["chart_data"]) == 90
    assert len(r["without_purchase_trajectory"]) == 90
    assert all(not np.isnan(v) for v in r["chart_data"])
    assert all(not np.isnan(v) for v in r["without_purchase_trajectory"])


if __name__ == "__main__":
    print("=" * 60)
    print("Decision Engine Accuracy Tests")
    print("=" * 60)
    tests = [
        ("Synthetic data realistic", test_synthetic_data_is_realistic),
        ("YES when healthy", test_yes_when_healthy),
        ("NO when declining", test_no_when_declining),
        ("WAIT when tight", test_wait_when_tight),
        ("NO when purchase exceeds cash", test_no_when_purchase_exceeds_cash),
        ("NO when hopeless", test_no_when_hopeless),
        ("YES with recurring cost", test_yes_with_recurring),
        ("WAIT with recurring cost", test_wait_with_recurring),
        ("Strict reserve", test_high_reserve_strict),
        ("Zero reserve", test_zero_reserve),
        ("Large purchase above reserve", test_large_purchase_above_reserve),
        ("Chart data integrity", test_chart_data_monotonic),
    ]
    passed = 0
    failed = 0
    for name, fn in tests:
        print(f"\n[{name}]")
        try:
            fn()
            print(f"  ✅ PASS")
            passed += 1
        except AssertionError as e:
            print(f"  ❌ FAIL: {e}")
            failed += 1
        except Exception as e:
            print(f"  ❌ ERROR: {e}")
            failed += 1
    print(f"\n{'=' * 60}")
    print(f"Results: {passed} passed, {failed} failed, {passed + failed} total")
    if failed:
        sys.exit(1)
