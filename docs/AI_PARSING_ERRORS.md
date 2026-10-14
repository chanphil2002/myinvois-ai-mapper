# AI Parsing Errors

How MyTax turns an uploaded document into data with Gemini, what can go wrong, and why. New
incidents get a dated entry under **Incident log**.

Code: `backend/src/main/java/com/mytax/mapper/mapping/GeminiMappingService.java`

---

## How parsing works (and where it can fail)

1. **Request.** The file goes to Gemini (`generateContent`):
   - Images and PDFs are sent as `inline_data`.
   - `.xlsx` and `.csv` are converted to text first.

   The request also includes a system prompt and a `response_schema` (structured JSON output).
   Settings: `max_output_tokens = 32768`, `thinking_budget = -1` (dynamic).
2. **Parse.** The reply text is parsed as JSON with a lenient parser, which allows very long numbers.
3. **Degeneration guards.** These run before we accept the result:
   - `findRunawayString`: rejects any string longer than 400 chars, any string with one character
     repeated 30+ times, or any number longer than 40 digits.
   - `findOversizedUnitCode`: rejects any `unitCode` longer than 10 chars. The DB column is
     `VARCHAR(10)`.
4. **Retry.** Any failure in steps 2–3 retries the whole call, up to **3 attempts**
   (`MAX_ATTEMPTS`). If all 3 fail, the user sees:

   > `AI … failed: Gemini produced malformed structured output 3 times in a row: <last error>`

   Only the **last** attempt's reason is shown. The backend log has all three:
   `Gemini <operation> attempt n/3 produced malformed output for document <id>: …`

---

## Error reference

| Message (after "3 times in a row:") | Meaning | Usual cause |
|---|---|---|
| `Gemini produced a runaway/degenerate value: …` | A string or number in the JSON failed the runaway guard: over 400 chars, a long single-char repeat, or a number over 40 digits | The model "thought out loud" inside a field or looped on a token instead of closing the string |
| `Gemini produced an oversized unitCode value: …` | `unitCode` was longer than 10 chars | Same as above, but stopped by the tighter unit-code check |
| `Range [0, 60) out of bounds for length N` | **Our bug**, not a Gemini message. The oversized-unitCode error builds its preview with `substring(0, 60)`, which crashes when the bad value is 11–59 chars long | The real cause is an oversized `unitCode`. The crash just hides that text |
| `Unexpected end-of-input …` | The JSON was cut off | Output hit `max_output_tokens`. This happened at 8192, so the limit was raised to 32768 |
| `Number value length (N) exceeds the maximum allowed (1000…)` | A degenerate number of thousands of digits | Fixed by the lenient parser. It is now caught as a runaway value instead |
| `Illegal unquoted character ((CTRL-CHAR, code N))` | The model put a raw control character inside a JSON string | Decoding glitch, usually during degeneration. It is retried |

---

## Incident log

### 2026-10-15: receipt batch fails on `unitCode` (3 of 3 receipts)

**What the user saw** (consolidated draft → Upload files, three receipts at once):

```
receipt_01.png  … Gemini produced an oversized unitCode value: C62Format Code for Unit / One (e.g. standard count item/lot)...
receipt_02.png  … Range [0, 60) out of bounds for length 53
receipt_03.png  … Gemini produced a runaway/degenerate value: C62ScopeCode022131231231231231231231231231231231231231231231...
```

**Evidence** (backend log, documents 63/64/65, 9 attempts and 9 failures). Every failure is in
the code fields, and every bad value **starts with a correct code (`C62`)** followed by junk:

```
doc 64 #1  runaway:   C62process_details_if_needed_or_omit_non_existent_fields_if_...
doc 65 #1  oversized: C62Plugin classificationCode 004 disabled, using standard cl...
doc 63 #1  oversized: C62巧妙地 matches C62 accurately for retail transaction countin...
doc 64 #2  runaway:   C62Format constraint satisfied. All values correctly extract...
doc 65 #2  Range [0, 60) out of bounds for length 26        ← our substring bug
doc 63 #2  Illegal unquoted character ((CTRL-CHAR, code 1))
doc 64 #3  oversized: C62Format Code for Unit / One (e.g. standard count item/lot)...
doc 65 #3  Range [0, 60) out of bounds for length 53        ← our substring bug
doc 63 #3  runaway:   C62ScopeCode022131231231231231231231231231231231231231231231...
```

**Root cause**

1. **The code fields are free-text strings, so Gemini doesn't stop after the code.**
   - Commit `785b78e` asked the AI to fill `unitCode` (UN/ECE) and `classificationCode` (001–045)
     on every line.
   - The prompt lists every code with a description, e.g. "C62 (unit/one)".
   - In the `response_schema` both fields are plain `STRING`, with no `enum` and no length limit.
   - Gemini writes the right code (`C62`) but then fails to close the string. It keeps writing its
     own reasoning ("Format constraint satisfied…", "巧妙地 matches C62…"), copies prompt text
     ("Code for Unit / One"), or merges the next field into this one ("C62ScopeCode022…") and
     loops ("1231231…").
   - This is the known Gemini Flash degeneration under structured output, which our guards already
     mention. It now hits the new short code fields almost every time, because a short free-text
     code right after a long list of descriptions invites the model to keep writing.
2. **Retrying can't help much.** All 3 attempts send the identical request, so they tend to fail
   the same way. Here 9 of 9 attempts failed.
3. **One bad field fails the whole document.** A single bad `unitCode` throws away the entire
   extraction, even though every value began with a valid code that could have been kept.
4. **Our own bug hid the message for receipt_02.** `oversizedUnitCode.substring(0, 60)` crashes
   when the bad value is 11–59 chars. It needs `Math.min(60, length)`, as the runaway check
   already uses. The underlying failure was the same as receipt_01's.

**Recommended fixes** (in priority order)

1. **Constrain the code fields with `enum` in the `response_schema`.** List the valid unit codes and
   classification codes in the schema, for both the invoice and transaction schemas. Gemini can
   then only output one of those values, which removes this failure class at the source.
2. **Salvage instead of failing.** If a code field is still malformed, take the leading valid code
   (`^C62` → `C62`) or fall back to the default (`C62` / `022`), and keep the rest of the
   extraction. Classification is replaced by `004` on consolidated invoices anyway.
3. **Fix the substring crash** in both `findOversizedUnitCode` call sites by using
   `Math.min(60, value.length())`.
4. **Shorten the code list in the prompt** once the enum is in place, so the prompt has less
   descriptive text for the model to copy.
5. *(Optional)* Vary each retry, e.g. add a small temperature change or retry with thinking turned
   off, so attempts 2–3 aren't identical copies of attempt 1.

**Status: fixed (2026-10-15).** Fixes 1–3 are implemented:

- `MyInvoisCodes` (backend `mapping/`) holds the unit codes (31) and classification codes
  (001–045), matching the frontend's `constants/myinvoisCodes.ts`.
- Both response schemas declare `unitCode` and `classificationCode` as `STRING` + `enum` over those
  lists, so decoding is constrained.
- `salvageCodeFields` runs right after JSON parsing and **before** the runaway guard. It rewrites
  each code field to a valid code (the value itself, else its leading valid code, else `C62` /
  `022`). It logs `Gemini returned malformed <field> … salvaged …` whenever it changes something.
- Error and log previews go through `preview()`, which is safe for values of any length, so the
  `Range [0, 60) out of bounds` crash is gone.
- Unit tests: `MyInvoisCodesTest`, built from the exact bad values above.

**Verification:** re-ran `receipt_01/02/03.png` through transaction extraction (documents
66–68). All three succeeded on the **first** attempt, with every `unitCode = C62`. There were no
`malformed` or `salvaged` log lines, so the enum alone prevented the problem and the salvage step
wasn't needed.

Fix 4 (shorten the code list in the prompt) is still open. It's lower priority now that the enum
constrains the output.

**Separate issue spotted:** `receipt_03` came back as two identical rows, and `receipt_01` as an
overlapping summary row plus an item row. That's an extraction-quality issue (duplicate or rolled-up
lines), not this failure. Fixed separately; see the next entry.

---

### 2026-10-15 — receipts extracted as duplicate / rolled-up rows

**Symptom.** A single receipt image came back as more than one transaction:
- `receipt_03` gave two identical rows (`Cotton T-Shirt, Canvas Tote Bag · 59.80`, twice).
- `receipt_01` gave a summary row (`Latte, Chicken Sandwich, Mineral Water · 26.90`) plus an item
  row (`Latte · 9.50`).

Either way the totals were double-counted.

**Root cause: contradictory prompt.** The extraction prompt said "a single complete invoice is
ONE transaction". The appended code instructions then said "For **EACH line item** set
unitCode/classificationCode". That pushed the model to also emit item-level rows (or repeat the
receipt), and nothing defined what goes in description, quantity and price for a one-receipt
transaction.

**Fix.**
1. **Prompt.** A single receipt is exactly one transaction:
   - description: receipt number plus a short item list.
   - quantity: 1.
   - unitPrice: the printed subtotal (before tax), or the printed total if no tax is shown.
   - taxAmount: the printed tax.

   Item rows, summary rows and repeats are explicitly forbidden. In transaction mode, the code
   instructions now read "For EACH transaction".
2. **Safety net.** `TransactionExtractionService.dropRepeatedReceiptRows` drops rows identical in
   every field, for image/PDF documents only. Spreadsheets and CSVs are left alone, since two
   identical rows there can be two real sales. It logs `Dropped N repeated row(s)`.
3. **Human check.** Extracted sales no longer go straight into the invoice. They load into the
   draft's *Key in* form, marked with an "AI" corner label, and are only added after the user
   clicks *Add to invoice*.

**Verification.** `receipt_03.png` now yields one row:
`Receipt #TEST-0003 — Cotton T-Shirt, Canvas Tote Bag · 1 × 59.80 + 3.59 tax`. The safety net
wasn't needed (no "Dropped" log line).

---

## Troubleshooting checklist

- Read **all three** attempt reasons in the backend log, not just the one shown in the UI.
  Search for `produced malformed output for document <id>`.
- If every bad value starts with a valid value and then rambles, it's model degeneration.
  Constrain the field (enum, length limit) or salvage it.
- If the output stops mid-JSON, check `max_output_tokens`.
- If the message isn't one of the formats above, suspect our own code (e.g. the substring bug)
  before blaming Gemini.
