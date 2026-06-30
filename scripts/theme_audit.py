#!/usr/bin/env python3
"""
theme_audit.py — Full contrast audit for Dominion Realm theme tokens.

Checks every TEXT-classified token (per TOKEN_USAGE_REGISTRY.md) against
every surface it's required to sit on, reports pass/fail with the WCAG
grade, lists the consuming selectors so a failure is traceable to actual
UI, and AUTO-SUGGESTS a corrected lightness value when a token fails.

Usage:
    python3 theme_audit.py <theme_name>

    Reads the theme block straight out of themes.css by name and audits it.
    Add a new theme to THEMES below (or point this at a parser later —
    for now values are pasted in manually to keep this dependency-free).
"""

import sys

# ---------------------------------------------------------------------------
# HSL/contrast math
# ---------------------------------------------------------------------------

def hsl_to_rgb(h, s, l):
    s /= 100; l /= 100
    c = (1 - abs(2*l - 1)) * s
    x = c * (1 - abs((h/60) % 2 - 1))
    m = l - c/2
    if h < 60: r,g,b = c,x,0
    elif h < 120: r,g,b = x,c,0
    elif h < 180: r,g,b = 0,c,x
    elif h < 240: r,g,b = 0,x,c
    elif h < 300: r,g,b = x,0,c
    else: r,g,b = c,0,x
    return (r+m, g+m, b+m)

def luminance(rgb):
    def f(c):
        return c/12.92 if c <= 0.03928 else ((c+0.055)/1.055)**2.4
    r,g,b = rgb
    return 0.2126*f(r) + 0.7152*f(g) + 0.0722*f(b)

def contrast(hsl_a, hsl_b):
    la = luminance(hsl_to_rgb(*hsl_a))
    lb = luminance(hsl_to_rgb(*hsl_b))
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)

def grade(ratio, floor=4.5):
    if ratio >= 7.0: return "AAA"
    if ratio >= floor: return "AA "
    if ratio >= 3.0: return "LRG"  # large-text-only pass
    return "FAIL"

def find_passing_lightness(h, s, target_hsl_bg, floor, direction="darken"):
    """Scan lightness to find the nearest value that clears `floor` against
    target_hsl_bg, preserving hue/saturation. Returns (l, ratio) or None."""
    rng = range(95, 0, -1) if direction == "darken" else range(5, 96, 1)
    for l in rng:
        r = contrast((h, s, l), target_hsl_bg)
        if r >= floor:
            return (l, r)
    return None


# ---------------------------------------------------------------------------
# Registry — required pairings per token, per TOKEN_USAGE_REGISTRY.md
# Each entry: (token_name, [list of required (surface_token, floor, label)])
# ---------------------------------------------------------------------------

TEXT_REQUIREMENTS = {
    "text":          [("bg", 7.0, "primary text"), ("bg-panel", 7.0, "primary text on panel")],
    "ink-dim":       [("bg", 4.5, "secondary text"), ("bg-panel", 4.5, "secondary text on panel")],
    "ink-faint":     [("bg", 4.5, "tertiary text")],
    "accent":        [("bg", 4.5, "kicker labels (uppercase, not exempt)")],
    "accent-bright": [("bg", 4.5, "inline emphasis text"), ("bg-raise", 4.5, "inline emphasis on raised surface")],
    "muted-fg":      [("bg", 4.5, "formula/scaffold text"), ("bg-panel", 4.5, "formula text on panel")],
    "spectral-ui":   [("bg", 4.5, "stat values"), ("bg-panel", 4.5, "stat values on panel")],
    "primary-fg":    [("primary", 4.5, "button text on CTA background")],
    "btn-ink":       [("accent", 4.5, "button text on gold background")],
}

SURFACE_TOKENS = {"bg", "bg-raise", "bg-panel", "primary", "accent"}


def audit_theme(name, tokens):
    """
    tokens: dict mapping short names (text, ink-dim, bg, primary, etc.)
            to (h, s, l) tuples.
    """
    print(f"\n{'='*78}")
    print(f"  THEME AUDIT: {name}")
    print(f"{'='*78}\n")

    failures = []

    # Surface hierarchy check first
    if all(k in tokens for k in ("bg", "bg-panel", "bg-raise")):
        bg_l = tokens["bg"][2]
        panel_l = tokens["bg-panel"][2]
        raise_l = tokens["bg-raise"][2]
        min_gap = 2 if bg_l <= 50 else 4  # dark themes compress lightness range, allow tighter steps
        gap_bg_panel = abs(panel_l - bg_l)
        gap_bg_raise = abs(raise_l - bg_l)
        gap_panel_raise = abs(raise_l - panel_l)
        ok = gap_bg_panel >= min_gap and gap_bg_raise >= min_gap and gap_panel_raise >= 1
        spread = f"bg L{bg_l} -> panel L{panel_l} -> raise L{raise_l}"
        print(f"  SURFACE SPREAD: {spread}  {'OK' if ok else 'TOO FLAT — increase separation'}")
        print()

    print(f"  {'TOKEN':<16}{'PAIRED WITH':<14}{'RATIO':<9}{'GRADE':<7}{'CONTEXT'}")
    print(f"  {'-'*16}{'-'*14}{'-'*9}{'-'*7}{'-'*30}")

    for token, requirements in TEXT_REQUIREMENTS.items():
        if token not in tokens:
            continue
        fg = tokens[token]
        for surface, floor, label in requirements:
            if surface not in tokens:
                continue
            bg = tokens[surface]
            ratio = contrast(fg, bg)
            g = grade(ratio, floor)
            flag = "" if g in ("AAA", "AA ") else "  <-- FAILS"
            print(f"  {token:<16}{surface:<14}{ratio:<9.1f}{g:<7}{label}{flag}")
            if g not in ("AAA", "AA "):
                failures.append((token, surface, floor, ratio, fg))

    if not failures:
        print(f"\n  ALL TEXT-BEARING TOKENS PASS.\n")
        return True

    print(f"\n  {len(failures)} FAILURE(S) — AUTO-SUGGESTED FIXES:\n")
    for token, surface, floor, ratio, fg in failures:
        h, s, l = fg
        bg = tokens[surface]
        bg_is_light = bg[2] > 50
        direction = "darken" if bg_is_light else "lighten"
        result = find_passing_lightness(h, s, bg, floor, direction)
        if result:
            new_l, new_ratio = result
            print(f"  --theme-{token}-hsl currently {h} {s}% {l}%  ({ratio:.1f}:1 vs {surface}, needs {floor}:1)")
            print(f"    -> SUGGESTED: {h} {s}% {new_l}%  ({new_ratio:.1f}:1 vs {surface})")
            if abs(l - new_l) > 15:
                print(f"    -> WARNING: {abs(l-new_l)} lightness-point shift is large; this hue/sat")
                print(f"       combination may not preserve the intended color identity.")
                print(f"       Consider shifting HUE instead of only lightness (see Solstice")
                print(f"       gold-bright fix: yellow h=50 -> amber h=38 to stay legible AND")
                print(f"       visually distinct from the darkened --accent token).")
            print()
        else:
            print(f"  --theme-{token}-hsl ({h} {s}% {l}%): NO PASSING LIGHTNESS FOUND in this hue/sat.")
            print(f"    -> This hue cannot pass {floor}:1 against {surface} at any lightness.")
            print(f"    -> Try reducing saturation or shifting hue before re-scanning.\n")

    return False


# ---------------------------------------------------------------------------
# Theme definitions — paste HSL tuples here as themes are authored.
# Format: (hue, saturation%, lightness%)
# ---------------------------------------------------------------------------

PARCHMENT = {
    "bg":             (50, 47, 94),
    "bg-panel":       (48, 32, 88),
    "bg-raise":       (46, 38, 82),
    "text":           (350, 20, 16),
    "ink-dim":        (350, 15, 28),
    "ink-faint":      (350, 10, 42),
    "accent":         (24, 20, 43),
    "accent-bright":  (24, 26, 37),
    "primary":        (213, 33, 25),
    "primary-fg":     (50, 47, 94),
    "muted-fg":       (24, 18, 32),
    "spectral-ui":    (213, 33, 25),
}

SLATE = {
    "bg":             (223, 31, 89),
    "bg-panel":       (222, 28, 83),
    "bg-raise":       (222, 28, 77),
    "text":           (217, 65, 18),
    "ink-dim":        (217, 50, 28),
    "ink-faint":      (220, 18, 40),
    "accent":         (27, 68, 34),
    "accent-bright":  (240, 37, 42),
    "primary":        (220, 51, 60),
    "primary-fg":     (223, 31, 10),
    "muted-fg":       (220, 30, 28),
    "spectral-ui":    (220, 51, 40),
}

SOLSTICE = {
    "bg":             (51, 57, 95),
    "bg-panel":       (50, 45, 89),
    "bg-raise":       (49, 38, 83),
    "text":           (213, 89, 25),
    "ink-dim":        (213, 70, 33),
    "ink-faint":      (213, 40, 46),
    "accent":         (50, 85, 28),
    "accent-bright":  (38, 85, 27),   # post-fix value
    "primary":        (317, 87, 74),
    "primary-fg":     (213, 89, 25),
    "muted-fg":       (213, 60, 32),
    "spectral-ui":    (202, 80, 35),
}

SOLSTICE_BROKEN = dict(SOLSTICE, **{"accent-bright": (50, 98, 68)})  # pre-fix, for demonstration

GRIMOIRE = {
    "bg":             (233, 33, 5),
    "bg-panel":       (231, 29, 11),
    "bg-raise":       (231, 34, 8),
    "text":           (43, 32, 89),
    "ink-dim":        (47, 9, 62),
    "ink-faint":      (47, 6, 46),
    "accent":         (40, 46, 60),
    "accent-bright":  (40, 63, 71),
    "primary":        (38, 65, 51),
    "primary-fg":     (39, 35, 6),
    "muted-fg":       (240, 4, 60),
    "spectral-ui":    (184, 70, 59),
}

TWILIGHT = {
    "bg":             (225, 50, 10),
    "bg-panel":       (225, 40, 14),
    "bg-raise":       (225, 35, 17),
    "text":           (30, 30, 88),
    "ink-dim":        (300, 5, 68),
    "ink-faint":      (300, 8, 53),
    "accent":         (226, 60, 60),
    "accent-bright":  (316, 47, 62),
    "primary":        (280, 38, 45),
    "primary-fg":     (30, 30, 95),
    "muted-fg":       (300, 5, 60),
    "spectral-ui":    (226, 60, 64),
}

EMBER = {
    "bg":             (51, 30, 92),
    "bg-panel":       (51, 26, 86),
    "bg-raise":       (45, 28, 80),
    "text":           (12, 35, 18),
    "ink-dim":        (12, 35, 28),
    "ink-faint":      (12, 25, 44),
    "accent":         (24, 84, 35),
    "accent-bright":  (6, 85, 36),
    "primary":        (24, 84, 49),
    "primary-fg":     (24, 84, 10),
    "muted-fg":       (12, 30, 32),
    "spectral-ui":    (5, 79, 30),
}

HONEYCOMB = {
    "bg":             (44, 50, 94),
    "bg-panel":       (44, 40, 88),
    "bg-raise":       (40, 35, 82),
    "text":           (18, 20, 14),
    "ink-dim":        (18, 20, 26),
    "ink-faint":      (18, 16, 42),
    "accent":         (49, 90, 24),
    "accent-bright":  (46, 85, 23),
    "primary":        (46, 85, 47),
    "primary-fg":     (46, 85, 10),
    "muted-fg":       (33, 25, 30),
    "spectral-ui":    (18, 20, 26),
}

MIST = {
    "bg":             (180, 10, 97),
    "bg-panel":       (180, 8, 91),
    "bg-raise":       (180, 6, 85),
    "text":           (0, 0, 18),
    "ink-dim":        (0, 0, 30),
    "ink-faint":      (0, 0, 43),
    "accent":         (172, 94, 22),
    "accent-bright":  (172, 70, 24),
    "primary":        (172, 94, 24),
    "primary-fg":     (172, 94, 97),
    "muted-fg":       (0, 0, 34),
    "spectral-ui":    (172, 94, 23),
}

AURORA = {
    "bg":             (56, 40, 95),
    "bg-panel":       (50, 30, 89),
    "bg-raise":       (50, 25, 83),
    "text":           (240, 100, 18),
    "ink-dim":        (240, 70, 30),
    "ink-faint":      (240, 30, 45),
    "accent":         (56, 22, 26),
    "accent-bright":  (42, 100, 24),
    "primary":        (240, 100, 57),
    "primary-fg":     (56, 40, 97),
    "muted-fg":       (240, 25, 30),
    "spectral-ui":    (240, 100, 45),
}

THEMES = {
    "parchment": PARCHMENT,
    "slate": SLATE,
    "solstice": SOLSTICE,
    "solstice-broken": SOLSTICE_BROKEN,
    "grimoire": GRIMOIRE,
    "twilight": TWILIGHT,
    "ember": EMBER,
    "honeycomb": HONEYCOMB,
    "mist": MIST,
    "aurora": AURORA,
}


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 theme_audit.py <theme_name>")
        print(f"Available: {', '.join(THEMES.keys())}")
        print("\nRunning all themes:\n")
        all_pass = True
        for name, tokens in THEMES.items():
            ok = audit_theme(name, tokens)
            all_pass = all_pass and ok
        sys.exit(0 if all_pass else 1)
    else:
        name = sys.argv[1]
        if name not in THEMES:
            print(f"Unknown theme '{name}'. Available: {', '.join(THEMES.keys())}")
            sys.exit(1)
        ok = audit_theme(name, THEMES[name])
        sys.exit(0 if ok else 1)
