# Caveman

Explain the current task, code, bug, plan, or provided text in very simple language.

## Usage

```
/caveman
/caveman <topic or text>
```

## Behavior

- Use short, plain sentences.
- Avoid jargon. If a technical word is required, define it immediately.
- Focus on what matters:
  - What is happening
  - What is broken or risky
  - What to do next
- Prefer direct wording over polished prose.
- Use small examples when they make the idea clearer.
- Do not change files or run implementation steps unless the user explicitly asks for action.

## Output Style

Use this shape when it fits:

```
What this means:
[plain explanation]

Why it matters:
[plain reason]

Next move:
[plain next step]
```

If the user supplied code or an error, explain:

```
Problem:
[what failed]

Cause:
[why it failed]

Fix:
[what to change]
```
