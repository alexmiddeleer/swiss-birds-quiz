# Swiss Birds Quiz

Swiss Birds Quiz helps people learn to recognize common Swiss birds through offline practice sessions.

## Language

**Swiss Bird**:
A bird species commonly encountered in Switzerland, identified by scientific name.
_Avoid_: Animal, wildlife, common-name-only bird

**Practice Session**:
An indefinite sequence of Quiz Rounds that continues until the learner explicitly ends it.
_Avoid_: Exam, test, finite quiz

**Quiz Round**:
A complete pass through all Swiss Birds in the Bird Catalog in shuffled order. When a round ends, a new shuffled round begins automatically.
_Avoid_: Game, level, set

**Reusable Bird Image**:
A bird image that the app may ship under public-domain or open-license terms it can visibly honor.
_Avoid_: Free image, Wikimedia image

**Image Provenance**:
The recorded origin and rights evidence for a bird image.
_Avoid_: Metadata, notes

**Image Citation**:
A visible source note for a bird image shown to learners.
_Avoid_: Hidden provenance, footnote

**Approved Bird Image**:
A Reusable Bird Image accepted by a human reviewer as suitable for learning a Swiss Bird.
_Avoid_: Selected image, downloaded image

**Image Review**:
Human inspection of a candidate bird image and its source context before approval.
_Avoid_: Automatic selection, thumbnail check

**Processed Bird Image**:
An approved bird image resized and compressed for offline phone use.
_Avoid_: Original image, high-resolution image

**Rejected Bird Image**:
A candidate bird image rejected during Image Review for rights, identity, or learning suitability reasons.
_Avoid_: Bad image, skipped image

**Bird Catalog**:
The explicit list of Swiss Birds and their Processed Bird Images used by Practice Sessions.
_Avoid_: Folder scan, image index

**Species Import List**:
An explicit list of Swiss Birds queued for image import.
_Avoid_: Bulk search, folder scan

**Missing Bird**:
A Swiss Bird without an approved image after an import attempt.
_Avoid_: Failed bird, unsupported bird

**Shipped Bird Image**:
A Processed Bird Image included with the public app for offline learning.
_Avoid_: Remote image, CDN image

**Offline Warmup**:
A home-screen asset load that confirms required quiz assets are cached before a Practice Session can start.
_Avoid_: Preload, background fetch, optimistic start

## Relationships

- A **Practice Session** is composed of one or more **Quiz Rounds**.
- A **Quiz Round** presents every **Swiss Bird** in the **Bird Catalog** in shuffled order.
- A **Swiss Bird** can have one or more **Approved Bird Images**.
- A **Reusable Bird Image** has **Image Provenance**.
- An **Image Citation** is derived from **Image Provenance**.
- An **Approved Bird Image** is a **Reusable Bird Image**.
- An **Image Review** can approve a **Reusable Bird Image** as an **Approved Bird Image**.
- A **Processed Bird Image** is produced from an **Approved Bird Image**.
- A **Rejected Bird Image** should not be reviewed again for the same **Swiss Bird** unless intentionally reconsidered.
- A **Bird Catalog** lists **Swiss Birds** and their **Processed Bird Images**.
- A **Species Import List** can queue multiple **Swiss Birds** for Image Review.
- A **Missing Bird** remains eligible for future image import attempts.
- A **Shipped Bird Image** is available to Practice Sessions without network access.
- An **Offline Warmup** loads **Shipped Bird Images** and **Image Provenance** before a **Practice Session** starts.

## Example dialogue

> **Dev:** "Should a **Practice Session** require internet access?"
> **Domain expert:** "No, the goal is memorizing **Swiss Birds** while offline."
>
> **Dev:** "Can we use any image from Wikimedia Commons for a **Swiss Bird**?"
> **Domain expert:** "No, only **Reusable Bird Images** whose license terms we can visibly honor are acceptable."
>
> **Dev:** "Do we keep **Image Provenance** if attribution is not required?"
> **Domain expert:** "Yes, because we need an audit trail for legal and ethical reuse."
>
> **Dev:** "Should learners see where a **Shipped Bird Image** came from?"
> **Domain expert:** "Yes, show an **Image Citation** with author, source, and rights info."
>
> **Dev:** "Can we identify a **Swiss Bird** by common name only?"
> **Domain expert:** "No, use the scientific name as identity; common name can help search and display."
>
> **Dev:** "Can the pipeline accept the first reusable result automatically?"
> **Domain expert:** "No, a human must approve it as an **Approved Bird Image**."
>
> **Dev:** "Can **Image Review** happen on the raw image alone?"
> **Domain expert:** "No, review the Wikimedia file page so source context and rights evidence are visible."
>
> **Dev:** "Is approval of the source image enough?"
> **Domain expert:** "No, also approve the **Processed Bird Image** because compression can hide field marks."
>
> **Dev:** "Should a rejected candidate appear again next run?"
> **Domain expert:** "No, a **Rejected Bird Image** should be remembered for that **Swiss Bird**."
>
> **Dev:** "Can a **Swiss Bird** have more than one **Approved Bird Image**?"
> **Domain expert:** "Yes, variation helps learning, but images can be added one at a time."
>
> **Dev:** "Should storage paths use common names?"
> **Domain expert:** "No, use scientific names because **Swiss Bird** identity is scientific name."
>
> **Dev:** "Can the app discover **Swiss Birds** by scanning folders?"
> **Domain expert:** "No, use a **Bird Catalog** so Practice Sessions know which birds and images exist."
>
> **Dev:** "How do we import images for many **Swiss Birds**?"
> **Domain expert:** "Use a **Species Import List** and review candidates one at a time."
>
> **Dev:** "What happens when no acceptable image is found for a **Swiss Bird**?"
> **Domain expert:** "Record it as a **Missing Bird** so we can revisit it later."
>
> **Dev:** "Should Practice Sessions fetch bird images from Wikimedia at runtime?"
> **Domain expert:** "No, use **Shipped Bird Images** so learning works offline."
>
> **Dev:** "When can a learner start a **Practice Session** offline?"
> **Domain expert:** "Only after **Offline Warmup** has loaded the required **Shipped Bird Images** and **Image Provenance**."

## Flagged ambiguities

- "quiz" is project shorthand for **Practice Session**, not a formal graded exam.
- "free image" is ambiguous because some free licenses require visible attribution; resolved term is **Reusable Bird Image**.
- "metadata" is too broad for legal/ethical tracking; resolved term is **Image Provenance**.
- "citation" means a visible **Image Citation**, not only stored **Image Provenance**.
- Common names can be ambiguous; **Swiss Bird** identity is scientific name.
- Public domain status alone is not enough; quiz suitability requires human approval.
- **Image Review** uses the source page context, not only the raw image.
- **Image Review** includes the source page and the **Processed Bird Image**.
- **Reusable Bird Images** may require visible attribution, which the app must show to learners.
- Storage identifiers for **Swiss Birds** should follow scientific names, not common names.
- **Practice Sessions** use the **Bird Catalog**, not filesystem folder discovery.
- Bulk imports should use a **Species Import List**, not implicit catalog or folder scanning.
- Import attempts that do not produce an approved image record a **Missing Bird**.
- **Shipped Bird Images** are committed app assets, not runtime Wikimedia requests.
- "preload" is vague here; resolved term is **Offline Warmup**.
