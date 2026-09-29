# Test Results: {Plan ID}

## Metadata

| Field   | Value                               |
| ------- | ----------------------------------- |
| Run By  | {Agent Name}                        |
| Date    | {YYYY-MM-DD HH:mm}                  |
| Plan    | {Plan ID}                           |
| Outcome | Pass / Fail / Blocked               |
| Results | {n} passed, {n} failed, {n} blocked |

---

## Results by Test Case

| Test ID  | Test Name  | Result  | Notes                  |
| -------- | ---------- | ------- | ---------------------- |
| {ID}-T01 | {TestName} | Pass    |                        |
| {ID}-T02 | {TestName} | Fail    | {brief failure detail} |
| {ID}-T03 | {TestName} | Blocked | {brief reason}         |

---

## Failures & Blocks

### [{Test ID}] {Test Name} — FAILED

**Failure**: {What the test asserted vs. what actually happened}
**Likely cause**: {Code bug / test bug / plan ambiguity}
**Recommended action**: {Return to Software-Engineer / raise on Feature / clarify plan}

### [{Test ID}] {Test Name} — BLOCKED

**Reason**: {Why the test could not be written or run as specified}
**Recommended action**: {What needs to change}
