"""stats 層的單元測試：已知答案的小例子。"""
import numpy as np

from pic_analyzer.stats.capability import cpk_short_term, describe
from pic_analyzer.stats.hypothesis import bh_fdr, cohen_d
from pic_analyzer.stats.robust import resolution, robust_sigma, robust_z
from pic_analyzer.stats.spc import nelson
from pic_analyzer.stats.variance import icc_die


def test_robust_sigma_matches_normal_sd():
    x = np.random.default_rng(0).normal(0, 2, 20000)
    assert abs(robust_sigma(x) - 2) < 0.05


def test_robust_sigma_ignores_outliers():
    x = np.r_[np.random.default_rng(1).normal(0, 1, 500), [1e6] * 5]
    assert robust_sigma(x) < 1.2


def test_robust_z_log_scale():
    z = robust_z(np.array([10, 10, 10, 11, 9, 10, 1000.0]), logscale=True)
    assert z[-1] > 5 and abs(z[0]) < 1


def test_resolution():
    assert resolution(np.array([0.10, 0.20, 0.20, 0.40])) == 0.1


def test_bh_fdr_known_values():
    q = bh_fdr([0.01, 0.04, 0.03, 0.20])
    # sorted p × n / rank = 0.04, 0.06, 0.0533, 0.20 → cumulative min from the top
    assert np.allclose(q, [0.04, 0.16 / 3, 0.16 / 3, 0.20])


def test_cohen_d_sign_and_size():
    a, b = np.zeros(50) + np.linspace(-1, 1, 50), np.zeros(50) + np.linspace(-1, 1, 50) + 1
    assert cohen_d(a, b) > 1.5


def test_cpk_centered_process():
    x = np.random.default_rng(2).normal(0, 1, 5000)
    assert 0.9 < cpk_short_term(x, {"LSL": -3, "USL": 3}) < 1.1


def test_describe_yield_and_margin():
    d = describe(np.array([1, 2, 3, 4, 5.0]), {"LSL": 0, "USL": 4.5})
    assert d["n_fail"] == 1 and d["margin_side"] == "USL"


def test_nelson_rule1():
    x = np.r_[np.random.default_rng(3).normal(0, 0.1, 30), [5.0]]
    rules = [r for r, _ in nelson(x)[0]]
    assert any(r.startswith("R1") for r in rules)


def test_icc_die_level_variation():
    rng = np.random.default_rng(4)
    die = rng.normal(0, 1, (40, 1))
    mat = die + rng.normal(0, 0.1, (40, 8))
    assert icc_die(mat) > 0.95
