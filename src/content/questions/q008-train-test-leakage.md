---
title: Train/Test Leakage from Preprocessing Before Split
qid: Q008
order: 8
category: python-ml
language: python
difficulty: mid
summary: A scaler is fit on the whole dataset before the train/test split, so the model's evaluation is contaminated by test-set statistics.
tags:
  - data-leakage
  - pipelines
draft: false
---

## Prompt

```python
def train_model(df: pd.DataFrame) -> float:
    X = df[["age", "income", "risk_score"]]
    y = df["defaulted"]

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=0.2, random_state=42
    )

    model = LogisticRegression()
    model.fit(X_train, y_train)

    return model.score(X_test, y_test)
```

## Task

1. Explain what the code is trying to do.
2. Identify the leakage bug and why it can inflate evaluation results.
3. Propose the **smallest safe fix**.
4. Write one test or review check that catches this class of bug.
5. Explain how this changes with cross-validation or a serialized production pipeline.

## Expected answer

The code scales features using statistics from the **entire** dataset before splitting. The scaler learns the mean and standard deviation from both train and test rows, so held-out information influences the training-time transformation.

## Issues

- Data leakage: fitted preprocessing sees the test distribution.
- The evaluation score can be too optimistic.
- Production serving may scale differently unless the scaler is serialized with the model.
- The function returns only a score, not the fitted pipeline/artifacts.
- No stratification; with class imbalance the split can be unstable.

## Smallest safe fix

Split first, then fit preprocessing inside a pipeline.

```python
def train_model(df: pd.DataFrame) -> float:
    X = df[["age", "income", "risk_score"]]
    y = df["defaulted"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("model", LogisticRegression(max_iter=1000)),
    ])

    pipeline.fit(X_train, y_train)
    return pipeline.score(X_test, y_test)
```

## Regression / review check

```python
def test_preprocessing_is_fit_only_on_training_rows():
    seen = {}

    class RecordingScaler(StandardScaler):
        def fit(self, X, y=None):
            seen["fit_rows"] = len(X)
            return super().fit(X, y)

    # Build a pipeline with RecordingScaler, fit on X_train, and assert
    # seen["fit_rows"] == len(X_train), NOT len(full_df).
```

## Strong answer signals

- Names leakage before talking about model choice.
- Explains the mechanism: fitted preprocessing learns test-set statistics.
- Uses `Pipeline`, not duplicated train/serve preprocessing code.
- Mentions stratification and artifact serialization as production concerns.

## Common traps

- "Scaling is unsupervised, so it isn't leakage." False — it still learns from held-out data.
- Moving `fit_transform` after the split but forgetting to use `transform` (not `fit_transform`) on test.
- Hand-writing separate train and inference preprocessing.

## Follow-up probe

> How would you prevent this from recurring across many notebooks and training scripts?

## Level II stretch — SE II

**Prompt**: Rewrite the evaluation to use k-fold cross-validation **correctly**, so preprocessing is re-fit inside each fold (no leakage across folds). Show the code and explain why passing a raw `X_scaled` into `cross_val_score` would reintroduce the bug.

**Model answer**: Put the whole pipeline *inside* the CV loop; `cross_val_score` then fits it fresh on each training fold:

```python
from sklearn.model_selection import cross_val_score, StratifiedKFold

pipeline = Pipeline([
    ("scaler", StandardScaler()),
    ("model", LogisticRegression(max_iter=1000)),
])

cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
scores = cross_val_score(pipeline, X, y, cv=cv, scoring="roc_auc")
print(scores.mean(), scores.std())
```

The trap: if you pre-compute `X_scaled = StandardScaler().fit_transform(X)` and pass *that* to `cross_val_score`, every fold's validation rows were already scaled using statistics that included those same rows — leakage on every split, just harder to see. By passing the *unfitted pipeline* and raw `X`, scikit-learn re-fits `StandardScaler` on each fold's training portion only. Same rule for any fit-ful step (imputers, encoders, feature selection, resamplers).

## Level III stretch — SE III

**Prompt**: This keeps recurring across the org's notebooks and training scripts. Design a guard that catches leakage in CI, and describe the rollout. Coding welcome.

**Model answer**: Two complementary guards — a *structural* one that makes leakage hard to write, and a *behavioral* one that fails CI when it's written anyway.

Structural: mandate a `build_pipeline()` factory that every training script must call — preprocessing can only be added *inside* the pipeline, so there is no `fit_transform(X)` on the full frame to misuse. Reviewers reject raw estimator use.

Behavioral: a test/lint that detects the signature. A pragmatic AST check with a tool like `ast`/`libcst` flags any `.fit(` or `.fit_transform(` on a dataframe that appears **before** a `train_test_split(` in the same function:

```python
# ci_check_leakage.py (sketch): fail if fit precedes split in a training fn
import ast, sys

class LeakageVisitor(ast.NodeVisitor):
    def visit_FunctionDef(self, fn):
        split_line = fit_line = None
        for node in ast.walk(fn):
            if isinstance(node, ast.Call) and getattr(node.func, "attr", "") in {"fit", "fit_transform"}:
                fit_line = fit_line or node.lineno
            if isinstance(node, ast.Call) and getattr(node.func, "id", "") == "train_test_split":
                split_line = node.lineno
        if fit_line and split_line and fit_line < split_line:
            print(f"{fn.name}: preprocessing fit at line {fit_line} precedes split at {split_line}")
            sys.exit(1)
```

Rollout mirrors any lint migration: run report-only to size the debt, fix the highest-stakes pipelines (anything feeding a launch decision or production training data) first, publish the `build_pipeline` pattern in onboarding, then make the check blocking in CI. The framing that lands at senior level: the fix isn't "re-order two lines," it's removing the *ability* to express the bug and back-stopping it with an automated gate, because a buggy offline metric can silently promote the wrong model.
