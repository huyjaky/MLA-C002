# AWS learning app — discovery

## Confirmed user requirements

- All learning and exam content must be bilingual Vietnamese/English.
- Learner already knows AWS and machine learning basics.
- Prepare for future Docker hosting.
- Build a deep course covering the supplied question bank, with flashcards, hints and memory aids.
- Separate learning and exam areas. Exams have practice and realistic simulation modes.
- Write additional exams with comparable difficulty and knowledge coverage.
- Organize folders before implementation; keep code clean and modular.
- Use the supplied Duolingo visual reference and tokens as design inputs.

## Decisions confirmed in the subsequent user reply

- Personal account with SQLite in a Docker volume.
- Three newly authored exams.
- MLA-C02 beta: 85 questions, 170 minutes.
- User confirmed: “SQLite, 3 bộ, MLA-C02 beta”. Implementation is authorized.

## Source QA audit

Rechecked directly from questions-answers-clean.json on 2026-09-28.

- 65 questions, numbered 1–65. Question 9 is at the end of the array.
- 24 questions contain no option marked correct: 10, 14, 15, 17, 18, 28, 30, 31, 32, 35, 36, 37, 38, 42, 43, 48, 51, 54, 55, 56, 59, 60, 61, 62.
- 100 options lack explanations.
- These are incomplete answer keys, not evidence that every option is incorrect. Resolve against authoritative AWS documentation before enabling grading.
- Topics include data preparation, Feature Store, ETL, PII, ML algorithms/evaluation, SageMaker training/deployment/scaling/MLOps, Bedrock/RAG/embeddings/evaluation/Guardrails, AgentCore, IAM/VPC, monitoring and cost.

## Exam reference findings

- User wrote ML-C02. MLA-C02 is a candidate interpretation, awaiting confirmation.
- Official guide: https://docs.aws.amazon.com/aws-certification/latest/machine-learning-engineer-associate-02/machine-learning-engineer-associate-02.html
- Certification page: https://aws.amazon.com/certification/certified-machine-learning-engineer-associate/
- Research on 2026-09-28 found a beta starting 2026-09-29 with 85 questions/170 minutes. Distinguish beta format from the guide's 65-question structure.
- Do not equate AWS's scaled passing score of 720/1000 with a guaranteed raw score of 72%.

## Design input interpretation

The supplied files are reference material rather than application source. DESIGN.md contains conflicting recommendations about green primary buttons. Preserve its white canvas, rounded typography, green/blue palette and rounded controls while resolving component details for learning usability and accessible contrast. Marketing-page layout recommendations do not override the requested learning and exam functionality.

## Implementation status

Implementation in progress. Native Node.js HTTP/SQLite backend, browser ES modules and static bilingual content. Folder responsibilities: server/ (API and persistence), public/ (interface), data/ (course and questions), scripts/ (content checks), tests/ (behavior checks), docs/ (decisions and content provenance). No third-party runtime dependencies.
